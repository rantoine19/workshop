import { createClient } from "@/lib/supabase/server";
import { parseReportWithClaude } from "@/lib/claude/parse-report";
import { applyServerSideFlags } from "@/lib/health/flag-biomarker";
import { normalizeBiomarkerName } from "@/lib/health/normalize-biomarker";
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

  // Delete old parsed results and risk flags (for re-analysis)
  // This ensures a clean slate when re-parsing a report.
  // Cascade from parsed_results → risk_flags → doctor_questions handles cleanup.
  const { data: oldParsed } = await supabase
    .from("parsed_results")
    .select("id")
    .eq("report_id", report.id);

  if (oldParsed && oldParsed.length > 0) {
    const oldIds = oldParsed.map((p) => p.id);
    // Delete risk_flags and doctor_questions first (foreign key deps)
    await supabase.from("risk_flags").delete().in("parsed_result_id", oldIds);
    await supabase.from("doctor_questions").delete().in("parsed_result_id", oldIds);
    await supabase.from("parsed_results").delete().eq("report_id", report.id);
    console.log("[PARSE] Cleaned up", oldParsed.length, "old parsed result(s) for re-analysis");
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

    console.log("[PARSE] Claude returned", parsed.biomarkers.length, "biomarkers. Applying server-side risk flags...");

    // Load user's custom reference ranges (#50)
    // Custom ranges override defaults for personalized flagging.
    const { data: customRanges } = await supabase
      .from("custom_reference_ranges")
      .select("biomarker_name, green_low, green_high, yellow_low, yellow_high, red_low, red_high, direction, source")
      .eq("user_id", user.id);

    // Load user's gender from profile for sex-specific reference ranges
    const { data: profile } = await supabase
      .from("profiles")
      .select("gender")
      .eq("id", user.id)
      .single();

    const gender: "male" | "female" | undefined =
      profile?.gender === "Male"
        ? "male"
        : profile?.gender === "Female"
          ? "female"
          : undefined;

    // Apply deterministic server-side flagging (fixes #87)
    // This overrides Claude's advisory flags with verified reference ranges.
    // Custom ranges take priority over defaults (#50).
    // Claude's flag is kept as fallback only for unrecognized biomarkers.
    const reflaggedBiomarkers = applyServerSideFlags(
      parsed.biomarkers,
      gender,
      customRanges ?? undefined
    );
    const reflaggedParsed = { ...parsed, biomarkers: reflaggedBiomarkers };

    // Normalize biomarker names to canonical form (#51)
    // This maps lab-specific names (e.g., "Glu", "FBS") to canonical names
    // (e.g., "Glucose (Fasting)") while preserving the original extracted name.
    const normalizedBiomarkers = reflaggedBiomarkers.map((b) => {
      const norm = normalizeBiomarkerName(b.name);
      return {
        ...b,
        name: norm.canonical,
        original_name: b.name,
        category: norm.category,
      };
    });

    const normalizedParsed = { ...parsed, biomarkers: normalizedBiomarkers };

    console.log("[PARSE] Biomarker names normalized. Storing results...");
    // Store parsed results
    const { data: parsedResult, error: insertError } = await supabase
      .from("parsed_results")
      .insert({
        report_id: report.id,
        raw_extraction: normalizedParsed,
        biomarkers: normalizedBiomarkers,
        summary_plain: parsed.summary,
      })
      .select("id")
      .single();

    if (insertError || !parsedResult) {
      console.error("[PARSE] Failed to store parsed results. insertError:", insertError?.message ?? "none", "parsedResult:", parsedResult);
      await supabase
        .from("reports")
        .update({ status: "error" })
        .eq("id", report.id);
      return NextResponse.json(
        { error: "Failed to store parsed results" },
        { status: 500 }
      );
    }
    console.log("[PARSE] Stored parsed_result:", parsedResult.id);

    // Create risk flags for each biomarker (using server-side flags + normalized names)
    const riskFlags = normalizedBiomarkers
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
      console.log("[PARSE] Inserting", riskFlags.length, "risk flags for parsed_result:", parsedResult.id);
      const { error: flagsError } = await supabase.from("risk_flags").insert(riskFlags);
      if (flagsError) {
        console.error("[PARSE] Failed to insert risk flags:", flagsError.message, "code:", flagsError.code);
        // Try inserting one-by-one to find the problematic row
        let inserted = 0;
        for (const flag of riskFlags) {
          const { error: singleError } = await supabase.from("risk_flags").insert(flag);
          if (singleError) {
            console.error("[PARSE] Failed single flag:", flag.biomarker_name, "value:", flag.value, "flag:", flag.flag, "error:", singleError.message);
          } else {
            inserted++;
          }
        }
        console.log("[PARSE] Inserted", inserted, "of", riskFlags.length, "risk flags individually");
      } else {
        console.log("[PARSE] All", riskFlags.length, "risk flags inserted successfully");
      }
    } else {
      console.log("[PARSE] No risk flags to insert (all biomarkers filtered out)");
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
