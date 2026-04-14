import { createClient } from "@/lib/supabase/server";
import { calculateHealthScore } from "@/lib/health/health-score";
import { logAuditEvent, getClientIp } from "@/lib/audit/logger";
import { NextResponse } from "next/server";

/**
 * GET /api/health-score
 *
 * Calculates a health score from the user's most recent parsed report.
 * Returns score, label, color, breakdown, topConcerns, and report metadata.
 *
 * Implements #109 — Dashboard health score.
 */
export async function GET(request: Request) {
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse optional family_member_id query param
  const { searchParams } = new URL(request.url);
  const familyMemberId = searchParams.get("family_member_id");

  // Find the most recent parsed report for this user (or family member)
  let reportQuery = supabase
    .from("reports")
    .select("id, original_filename, status, created_at")
    .eq("status", "parsed")
    .order("created_at", { ascending: false })
    .limit(1);

  if (familyMemberId) {
    reportQuery = reportQuery.eq("family_member_id", familyMemberId);
  } else {
    reportQuery = reportQuery.is("family_member_id", null);
  }

  const { data: latestReport, error: reportError } = await reportQuery.single();

  if (reportError || !latestReport) {
    // No parsed reports — return null result
    return NextResponse.json({ healthScore: null }, { status: 200 });
  }

  // Fetch the parsed result for this report
  const { data: parsedResult, error: parsedError } = await supabase
    .from("parsed_results")
    .select("id")
    .eq("report_id", latestReport.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (parsedError || !parsedResult) {
    return NextResponse.json({ healthScore: null }, { status: 200 });
  }

  // Fetch risk flags for this parsed result
  const { data: riskFlags, error: flagsError } = await supabase
    .from("risk_flags")
    .select("biomarker_name, flag")
    .eq("parsed_result_id", parsedResult.id);

  if (flagsError || !riskFlags || riskFlags.length === 0) {
    return NextResponse.json({ healthScore: null }, { status: 200 });
  }

  // Fetch biomarker values for detailed concern info
  const { data: biomarkerValues } = await supabase
    .from("risk_flags")
    .select("biomarker_name, flag, value")
    .eq("parsed_result_id", parsedResult.id);

  // Map risk flags to the shape expected by calculateHealthScore
  const biomarkers = riskFlags.map((rf) => ({
    name: rf.biomarker_name,
    flag: rf.flag as "green" | "yellow" | "red",
  }));

  const result = calculateHealthScore(biomarkers);

  // Build detailed top concerns (top 5 non-green biomarkers with values)
  const nonGreen = (biomarkerValues ?? [])
    .filter((b) => b.flag === "red" || b.flag === "yellow")
    .sort((a, b) => {
      if (a.flag === "red" && b.flag !== "red") return -1;
      if (a.flag !== "red" && b.flag === "red") return 1;
      return 0;
    })
    .slice(0, 5);

  const topConcernsDetailed = nonGreen.map((b) => ({
    name: b.biomarker_name,
    value: b.value,
    flag: b.flag,
  }));

  // Audit log: health score view (fire-and-forget)
  logAuditEvent({
    userId: user.id,
    action: "report.view",
    resourceType: "report",
    resourceId: latestReport.id,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(
    {
      healthScore: {
        ...result,
        topConcernsDetailed,
        reportId: latestReport.id,
        reportName: latestReport.original_filename,
        reportDate: latestReport.created_at,
      },
    },
    { status: 200 }
  );
}
