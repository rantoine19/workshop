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

  // Fetch corrections for these risk flags to mark corrected ones
  const flagIds = riskFlags.map((f) => f.id);
  const correctionMap = new Map<string, { original_value: number }>();

  if (flagIds.length > 0) {
    const { data: corrections } = await supabase
      .from("biomarker_corrections")
      .select("risk_flag_id, original_value")
      .in("risk_flag_id", flagIds);

    if (corrections) {
      for (const c of corrections) {
        correctionMap.set(c.risk_flag_id, {
          original_value: c.original_value,
        });
      }
    }
  }

  // Enrich risk flags with correction info
  const enrichedFlags = riskFlags.map((f) => {
    const correction = correctionMap.get(f.id);
    return {
      ...f,
      corrected: !!correction,
      original_value: correction?.original_value ?? null,
    };
  });

  // Build summary counts
  const summary = {
    total: enrichedFlags.length,
    green: enrichedFlags.filter((f) => f.flag === "green").length,
    yellow: enrichedFlags.filter((f) => f.flag === "yellow").length,
    red: enrichedFlags.filter((f) => f.flag === "red").length,
  };

  return NextResponse.json(
    {
      report_id: reportId,
      risk_flags: enrichedFlags,
      summary,
      disclaimer:
        "These indicators are for informational purposes only. They are not medical diagnoses. Please consult your doctor about your results.",
    },
    { status: 200 }
  );
}
