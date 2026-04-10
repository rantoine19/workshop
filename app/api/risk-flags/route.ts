import { createClient } from "@/lib/supabase/server";
import { logAuditEvent, getClientIp } from "@/lib/audit/logger";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get report_id from query params
  const { searchParams } = new URL(request.url);
  const reportId = searchParams.get("report_id");

  if (!reportId) {
    return NextResponse.json(
      { error: "report_id query parameter is required" },
      { status: 400 }
    );
  }

  // Fetch report and verify ownership
  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("id, user_id")
    .eq("id", reportId)
    .single();

  if (reportError || !report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  if (report.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Audit log: risk flags view (fire-and-forget)
  logAuditEvent({
    userId: user.id,
    action: "report.view",
    resourceType: "report",
    resourceId: reportId,
    ipAddress: getClientIp(request),
  });

  // Fetch parsed result for this report
  const { data: parsedResult, error: parsedError } = await supabase
    .from("parsed_results")
    .select("id")
    .eq("report_id", reportId)
    .single();

  if (parsedError || !parsedResult) {
    return NextResponse.json(
      { error: "No parsed results found. Parse the report first." },
      { status: 404 }
    );
  }

  // Fetch risk flags for this parsed result
  const { data: riskFlags, error: flagsError } = await supabase
    .from("risk_flags")
    .select(
      "id, biomarker_name, value, reference_low, reference_high, flag, trend, confidence, created_at"
    )
    .eq("parsed_result_id", parsedResult.id)
    .order("created_at", { ascending: true });

  if (flagsError) {
    return NextResponse.json(
      { error: "Failed to fetch risk flags" },
      { status: 500 }
    );
  }

  // Build summary counts
  const summary = {
    total: riskFlags.length,
    green: riskFlags.filter((f) => f.flag === "green").length,
    yellow: riskFlags.filter((f) => f.flag === "yellow").length,
    red: riskFlags.filter((f) => f.flag === "red").length,
  };

  return NextResponse.json(
    {
      report_id: reportId,
      risk_flags: riskFlags,
      summary,
      disclaimer:
        "These indicators are for informational purposes only. They are not medical diagnoses. Please consult your doctor about your results.",
    },
    { status: 200 }
  );
}
