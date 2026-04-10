import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { SYNONYM_INDEX } from "@/lib/health/biomarker-synonyms";
import { flagBiomarker } from "@/lib/health/flag-biomarker";
import {
  calculateBiomarkerTrend,
  findRangeForTrend,
  type TrendDirection,
} from "@/lib/health/trend";
import { logAuditEvent, getClientIp } from "@/lib/audit/logger";

interface TrendDataPoint {
  date: string;
  value: number;
  flag: string;
  reportName: string;
}

interface BiomarkerTrend {
  biomarkerName: string;
  unit: string;
  dataPoints: TrendDataPoint[];
  referenceRange: {
    greenLow?: number | null;
    greenHigh?: number | null;
    yellowLow?: number | null;
    yellowHigh?: number | null;
  };
  trend: TrendDirection;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all parsed reports for the user, ordered by date ascending
  const { data: reports, error: reportsError } = await supabase
    .from("reports")
    .select("id, original_filename, created_at, user_id, status")
    .eq("user_id", user.id)
    .eq("status", "parsed")
    .order("created_at", { ascending: true });

  if (reportsError) {
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }

  if (!reports || reports.length < 2) {
    return NextResponse.json({ trends: [] }, { status: 200 });
  }

  // Audit log
  logAuditEvent({
    userId: user.id,
    action: "report.view",
    resourceType: "report",
    resourceId: "trends",
    ipAddress: getClientIp(request),
  });

  // Fetch parsed results for all reports
  const { data: parsedResults, error: parsedError } = await supabase
    .from("parsed_results")
    .select("report_id, biomarkers")
    .in(
      "report_id",
      reports.map((r) => r.id)
    );

  if (parsedError || !parsedResults) {
    return NextResponse.json(
      { error: "Failed to fetch parsed results" },
      { status: 500 }
    );
  }

  // Build report date/name lookup
  const reportMeta = new Map(
    reports.map((r) => [
      r.id,
      { date: r.created_at, name: r.original_filename },
    ])
  );

  // Collect biomarker values by canonical name
  const biomarkerMap = new Map<
    string,
    {
      canonicalName: string;
      unit: string;
      dataPoints: TrendDataPoint[];
    }
  >();

  for (const pr of parsedResults) {
    const biomarkers = pr.biomarkers as Array<{
      name: string;
      value: number | null;
      unit: string;
      flag: string;
    }>;
    if (!Array.isArray(biomarkers)) continue;

    const meta = reportMeta.get(pr.report_id);
    if (!meta) continue;

    for (const b of biomarkers) {
      if (b.value === null || b.value === undefined) continue;

      const mapping = SYNONYM_INDEX.get(b.name.toLowerCase().trim());
      const canonicalName = mapping ? mapping.canonical : b.name;
      const unit = mapping?.unit || b.unit || "";

      // Apply server-side flagging
      const numericValue = Number(b.value);
      if (isNaN(numericValue)) continue;

      let flag = b.flag || "green";
      const serverFlag = flagBiomarker(canonicalName, numericValue);
      if (serverFlag) flag = serverFlag;

      if (!biomarkerMap.has(canonicalName)) {
        biomarkerMap.set(canonicalName, {
          canonicalName,
          unit,
          dataPoints: [],
        });
      }

      biomarkerMap.get(canonicalName)!.dataPoints.push({
        date: meta.date,
        value: numericValue,
        flag,
        reportName: meta.name,
      });
    }
  }

  // Build trends — only biomarkers with 2+ data points
  const trends: BiomarkerTrend[] = [];

  for (const [, entry] of biomarkerMap) {
    if (entry.dataPoints.length < 2) continue;

    // Sort data points by date ascending
    entry.dataPoints.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Limit to 12 most recent data points for performance
    const dataPoints = entry.dataPoints.slice(-12);

    // Calculate trend
    const oldest = dataPoints[0];
    const newest = dataPoints[dataPoints.length - 1];
    const trend = calculateBiomarkerTrend(
      entry.canonicalName,
      oldest.value,
      newest.value
    );

    // Get reference range for chart bands
    const range = findRangeForTrend(entry.canonicalName);
    const referenceRange: BiomarkerTrend["referenceRange"] = {};
    if (range) {
      referenceRange.greenLow = range.ranges.green.low;
      referenceRange.greenHigh = range.ranges.green.high;
      referenceRange.yellowLow = range.ranges.yellow.low;
      referenceRange.yellowHigh = range.ranges.yellow.high;
    }

    trends.push({
      biomarkerName: entry.canonicalName,
      unit: entry.unit,
      dataPoints,
      referenceRange,
      trend,
    });
  }

  // Sort: biomarkers with biggest changes first (most interesting)
  trends.sort((a, b) => {
    // Worsening first, then improving, then stable
    const trendOrder: Record<TrendDirection, number> = {
      worsening: 0,
      improving: 1,
      stable: 2,
    };
    const orderDiff = trendOrder[a.trend] - trendOrder[b.trend];
    if (orderDiff !== 0) return orderDiff;

    // Within same trend, sort by magnitude of change
    const aChange = Math.abs(
      a.dataPoints[a.dataPoints.length - 1].value - a.dataPoints[0].value
    );
    const bChange = Math.abs(
      b.dataPoints[b.dataPoints.length - 1].value - b.dataPoints[0].value
    );
    // Normalize by average to compare relative changes
    const aAvg =
      (a.dataPoints[a.dataPoints.length - 1].value + a.dataPoints[0].value) / 2;
    const bAvg =
      (b.dataPoints[b.dataPoints.length - 1].value + b.dataPoints[0].value) / 2;
    const aRelative = aAvg !== 0 ? aChange / aAvg : 0;
    const bRelative = bAvg !== 0 ? bChange / bAvg : 0;

    return bRelative - aRelative;
  });

  return NextResponse.json({ trends }, { status: 200 });
}
