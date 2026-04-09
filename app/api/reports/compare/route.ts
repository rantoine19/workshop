import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { SYNONYM_INDEX } from "@/lib/health/biomarker-synonyms";
import { flagBiomarker, type CustomRange } from "@/lib/health/flag-biomarker";
import { calculateBiomarkerTrend, type TrendDirection } from "@/lib/health/trend";
import { logAuditEvent, getClientIp } from "@/lib/audit/logger";

/** Maximum number of reports that can be compared at once. */
const MAX_REPORTS = 5;

interface BiomarkerValue {
  reportId: string;
  value: number | null;
  unit: string;
  flag: string;
  date: string;
}

interface ComparedBiomarker {
  name: string;
  category: string;
  values: BiomarkerValue[];
  trend: TrendDirection;
}

interface CompareReportMeta {
  id: string;
  file_name: string;
  created_at: string;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse query params
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get("ids");

  if (!idsParam) {
    return NextResponse.json(
      { error: "Missing required parameter: ids" },
      { status: 400 }
    );
  }

  const reportIds = idsParam.split(",").map((id) => id.trim()).filter(Boolean);

  if (reportIds.length < 2) {
    return NextResponse.json(
      { error: "At least 2 report IDs are required for comparison" },
      { status: 400 }
    );
  }

  if (reportIds.length > MAX_REPORTS) {
    return NextResponse.json(
      { error: `Maximum ${MAX_REPORTS} reports can be compared at once` },
      { status: 400 }
    );
  }

  // Fetch reports with parsed results (RLS enforces ownership)
  const { data: reports, error: reportsError } = await supabase
    .from("reports")
    .select("id, original_filename, created_at, user_id, status")
    .in("id", reportIds)
    .order("created_at", { ascending: true });

  if (reportsError) {
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }

  if (!reports || reports.length < 2) {
    return NextResponse.json(
      { error: "Could not find enough reports. Ensure they exist and belong to you." },
      { status: 404 }
    );
  }

  // Verify ownership (defense-in-depth alongside RLS)
  for (const report of reports) {
    if (report.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (report.status !== "parsed") {
      return NextResponse.json(
        { error: `Report "${report.original_filename}" has not been analyzed yet` },
        { status: 422 }
      );
    }
  }

  // Audit log: report comparison view (fire-and-forget, one per report)
  for (const report of reports) {
    logAuditEvent({
      userId: user.id,
      action: "report.view",
      resourceType: "report",
      resourceId: report.id,
      ipAddress: getClientIp(request),
    });
  }

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

  // Fetch custom reference ranges for the user
  const { data: customRanges } = await supabase
    .from("custom_reference_ranges")
    .select("biomarker_name, green_low, green_high, yellow_low, yellow_high, red_low, red_high, direction, source")
    .eq("user_id", user.id);

  // Build parsed results map: reportId -> biomarkers[]
  const parsedMap = new Map<
    string,
    Array<{
      name: string;
      value: number | null;
      unit: string;
      flag: string;
    }>
  >();
  for (const pr of parsedResults) {
    const biomarkers = pr.biomarkers as Array<{
      name: string;
      value: number | null;
      unit: string;
      flag: string;
    }>;
    if (Array.isArray(biomarkers)) {
      parsedMap.set(pr.report_id, biomarkers);
    }
  }

  // Build report metadata (sorted by date ascending)
  const reportMetas: CompareReportMeta[] = reports.map((r) => ({
    id: r.id,
    file_name: r.original_filename,
    created_at: r.created_at,
  }));

  // Collect all unique canonical biomarker names across all reports
  const biomarkerMap = new Map<
    string,
    {
      name: string;
      category: string;
      values: Map<string, { value: number | null; unit: string; flag: string; date: string }>;
    }
  >();

  for (const report of reportMetas) {
    const biomarkers = parsedMap.get(report.id) || [];
    for (const b of biomarkers) {
      // Look up canonical name
      const mapping = SYNONYM_INDEX.get(b.name.toLowerCase().trim());
      const canonicalName = mapping ? mapping.canonical : b.name;
      const category = mapping ? mapping.category : "Other";

      if (!biomarkerMap.has(canonicalName)) {
        biomarkerMap.set(canonicalName, {
          name: canonicalName,
          category,
          values: new Map(),
        });
      }

      // Apply server-side flagging
      const numericValue = b.value !== null ? Number(b.value) : null;
      let flag = b.flag || "green";
      if (numericValue !== null) {
        const serverFlag = flagBiomarker(canonicalName, numericValue);
        if (serverFlag) flag = serverFlag;
      }

      biomarkerMap.get(canonicalName)!.values.set(report.id, {
        value: numericValue,
        unit: mapping?.unit || b.unit || "",
        flag,
        date: report.created_at,
      });
    }
  }

  // Build the response biomarkers with trend calculation
  const comparedBiomarkers: ComparedBiomarker[] = [];

  for (const [, entry] of biomarkerMap) {
    // Build values array in report order (oldest to newest)
    const values: BiomarkerValue[] = reportMetas.map((r) => {
      const val = entry.values.get(r.id);
      return {
        reportId: r.id,
        value: val?.value ?? null,
        unit: val?.unit ?? "",
        flag: val?.flag ?? "green",
        date: r.created_at,
      };
    });

    // Calculate trend between oldest and newest non-null values
    let trend: TrendDirection = "stable";
    const nonNullValues = values.filter((v) => v.value !== null);
    if (nonNullValues.length >= 2) {
      const oldest = nonNullValues[0];
      const newest = nonNullValues[nonNullValues.length - 1];
      trend = calculateBiomarkerTrend(
        entry.name,
        oldest.value!,
        newest.value!,
      );
    }

    comparedBiomarkers.push({
      name: entry.name,
      category: entry.category,
      values,
      trend,
    });
  }

  // Sort by category, then by name
  comparedBiomarkers.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name.localeCompare(b.name);
  });

  // Count summary
  const improving = comparedBiomarkers.filter((b) => b.trend === "improving").length;
  const stable = comparedBiomarkers.filter((b) => b.trend === "stable").length;
  const worsening = comparedBiomarkers.filter((b) => b.trend === "worsening").length;

  // Suppress unused variable warning for customRanges (used in future enhancement)
  void customRanges;

  return NextResponse.json(
    {
      reports: reportMetas,
      biomarkers: comparedBiomarkers,
      summary: { improving, stable, worsening },
    },
    { status: 200 }
  );
}
