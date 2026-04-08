import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { SYNONYM_INDEX } from "@/lib/health/biomarker-synonyms";
import { calculateBiomarkerTrend, type TrendDirection } from "@/lib/health/trend";

interface ChangedBiomarker {
  name: string;
  oldValue: number;
  newValue: number;
  unit: string;
  trend: TrendDirection;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: reportId } = await params;

  // Suppress unused variable warning
  void request;

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch the current report
  const { data: currentReport, error: reportError } = await supabase
    .from("reports")
    .select("id, user_id, original_filename, created_at, status")
    .eq("id", reportId)
    .single();

  if (reportError || !currentReport) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  if (currentReport.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (currentReport.status !== "parsed") {
    return NextResponse.json({ hasChanges: false }, { status: 200 });
  }

  // Find the most recent parsed report BEFORE this one
  const { data: previousReports } = await supabase
    .from("reports")
    .select("id, original_filename, created_at")
    .eq("user_id", user.id)
    .eq("status", "parsed")
    .lt("created_at", currentReport.created_at)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!previousReports || previousReports.length === 0) {
    return NextResponse.json({ hasChanges: false }, { status: 200 });
  }

  const previousReport = previousReports[0];

  // Fetch parsed results for both reports
  const { data: parsedResults, error: parsedError } = await supabase
    .from("parsed_results")
    .select("report_id, biomarkers")
    .in("report_id", [reportId, previousReport.id]);

  if (parsedError || !parsedResults || parsedResults.length < 2) {
    return NextResponse.json({ hasChanges: false }, { status: 200 });
  }

  // Build biomarker maps by canonical name
  const buildBiomarkerMap = (
    biomarkers: Array<{ name: string; value: number | null; unit: string }>
  ) => {
    const map = new Map<string, { value: number; unit: string }>();
    for (const b of biomarkers) {
      if (b.value === null) continue;
      const mapping = SYNONYM_INDEX.get(b.name.toLowerCase().trim());
      const canonicalName = mapping ? mapping.canonical : b.name;
      const unit = mapping?.unit || b.unit || "";
      map.set(canonicalName, { value: Number(b.value), unit });
    }
    return map;
  };

  const currentParsed = parsedResults.find((p) => p.report_id === reportId);
  const previousParsed = parsedResults.find((p) => p.report_id === previousReport.id);

  if (!currentParsed || !previousParsed) {
    return NextResponse.json({ hasChanges: false }, { status: 200 });
  }

  const currentBiomarkers = Array.isArray(currentParsed.biomarkers)
    ? currentParsed.biomarkers as Array<{ name: string; value: number | null; unit: string }>
    : [];
  const previousBiomarkers = Array.isArray(previousParsed.biomarkers)
    ? previousParsed.biomarkers as Array<{ name: string; value: number | null; unit: string }>
    : [];

  const currentMap = buildBiomarkerMap(currentBiomarkers);
  const previousMap = buildBiomarkerMap(previousBiomarkers);

  const improved: ChangedBiomarker[] = [];
  const worsened: ChangedBiomarker[] = [];
  let stableCount = 0;
  let newCount = 0;

  for (const [name, current] of currentMap) {
    const previous = previousMap.get(name);
    if (!previous) {
      newCount++;
      continue;
    }

    const trend = calculateBiomarkerTrend(name, previous.value, current.value);
    const entry: ChangedBiomarker = {
      name,
      oldValue: previous.value,
      newValue: current.value,
      unit: current.unit,
      trend,
    };

    if (trend === "improving") {
      improved.push(entry);
    } else if (trend === "worsening") {
      worsened.push(entry);
    } else {
      stableCount++;
    }
  }

  return NextResponse.json(
    {
      hasChanges: true,
      previousReportName: previousReport.original_filename,
      previousReportDate: previousReport.created_at,
      previousReportId: previousReport.id,
      improved,
      worsened,
      stable: stableCount,
      new: newCount,
    },
    { status: 200 }
  );
}
