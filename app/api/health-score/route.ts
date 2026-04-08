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

  // Find the most recent parsed report for this user
  const { data: latestReport, error: reportError } = await supabase
    .from("reports")
    .select("id, original_filename, status, created_at")
    .eq("status", "parsed")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

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

  // Map risk flags to the shape expected by calculateHealthScore
  const biomarkers = riskFlags.map((rf) => ({
    name: rf.biomarker_name,
    flag: rf.flag as "green" | "yellow" | "red",
  }));

  const result = calculateHealthScore(biomarkers);

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
        reportId: latestReport.id,
        reportName: latestReport.original_filename,
        reportDate: latestReport.created_at,
      },
    },
    { status: 200 }
  );
}
