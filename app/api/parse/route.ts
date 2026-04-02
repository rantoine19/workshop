import { createClient } from "@/lib/supabase/server";
import { parseReportWithClaude } from "@/lib/claude/parse-report";
import { logAuditEvent, getClientIp } from "@/lib/audit/logger";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse request body
  let body: { report_id: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  if (!body.report_id) {
    return NextResponse.json(
      { error: "report_id is required" },
      { status: 400 }
    );
  }

  // Fetch report and verify ownership (RLS handles this)
  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("id, file_path, file_type, status, user_id")
    .eq("id", body.report_id)
    .single();

  if (reportError || !report) {
    return NextResponse.json(
      { error: "Report not found" },
      { status: 404 }
    );
  }

  // Verify ownership explicitly as defense-in-depth
  if (report.user_id !== user.id) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  // Update status to 'parsing'
  await supabase
    .from("reports")
    .update({ status: "parsing" })
    .eq("id", report.id);

  try {
    console.log("[PARSE] Starting parse for report:", report.id, "file_path:", report.file_path, "file_type:", report.file_type);
    // Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("medical-reports")
      .download(report.file_path);

    if (downloadError || !fileData) {
      console.error("[PARSE] Download failed:", downloadError?.message);
      await supabase
        .from("reports")
        .update({ status: "error" })
        .eq("id", report.id);
      return NextResponse.json(
        { error: "Failed to download file" },
        { status: 500 }
      );
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    // Determine media type
    const mediaType =
      report.file_type === "pdf"
        ? "application/pdf"
        : report.file_path.endsWith(".png")
          ? "image/png"
          : "image/jpeg";

    // Parse with Claude Vision
    console.log("[PARSE] File downloaded, size:", arrayBuffer.byteLength, "bytes. Sending to Claude Vision...");
    const parsed = await parseReportWithClaude(
      base64,
      mediaType as "application/pdf" | "image/png" | "image/jpeg"
    );

    console.log("[PARSE] Claude returned", parsed.biomarkers.length, "biomarkers. Storing results...");
    // Store parsed results
    const { data: parsedResult, error: insertError } = await supabase
      .from("parsed_results")
      .insert({
        report_id: report.id,
        raw_extraction: parsed,
        biomarkers: parsed.biomarkers,
        summary_plain: parsed.summary,
      })
      .select("id")
      .single();

    if (insertError || !parsedResult) {
      await supabase
        .from("reports")
        .update({ status: "error" })
        .eq("id", report.id);
      return NextResponse.json(
        { error: "Failed to store parsed results" },
        { status: 500 }
      );
    }

    // Create risk flags for each biomarker
    const riskFlags = parsed.biomarkers
      .filter((b) => b.flag && b.value != null)
      .map((b) => ({
        parsed_result_id: parsedResult.id,
        biomarker_name: b.name,
        value: b.value,
        reference_low: b.reference_low,
        reference_high: b.reference_high,
        flag: b.flag,
        trend: "unknown" as const,
      }));

    if (riskFlags.length > 0) {
      await supabase.from("risk_flags").insert(riskFlags);
    }

    // Update report status to 'parsed'
    await supabase
      .from("reports")
      .update({ status: "parsed" })
      .eq("id", report.id);

    // Audit log: report parse (fire-and-forget)
    logAuditEvent({
      userId: user.id,
      action: "report.parse",
      resourceType: "report",
      resourceId: report.id,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json(
      {
        parsed_result_id: parsedResult.id,
        biomarker_count: parsed.biomarkers.length,
        risk_flags_count: riskFlags.length,
        summary: parsed.summary,
      },
      { status: 200 }
    );
  } catch (error) {
    // Set status to error on any failure
    await supabase
      .from("reports")
      .update({ status: "error" })
      .eq("id", report.id);

    const message =
      error instanceof Error ? error.message : "Parsing failed";
    console.error("[PARSE] Error:", message);
    if (error instanceof Error && error.stack) {
      console.error("[PARSE] Stack:", error.stack);
    }
    return NextResponse.json(
      { error: `Parsing failed: ${message}` },
      { status: 500 }
    );
  }
}
