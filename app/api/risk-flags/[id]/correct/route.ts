import { createClient } from "@/lib/supabase/server";
import { flagBiomarker } from "@/lib/health/flag-biomarker";
import { logAuditEvent, getClientIp } from "@/lib/audit/logger";
import { NextResponse } from "next/server";

interface CorrectionBody {
  value?: number;
  name?: string;
  unit?: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: riskFlagId } = await params;

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse request body
  let body: CorrectionBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  // Must provide at least one correction field
  if (body.value === undefined && !body.name && !body.unit) {
    return NextResponse.json(
      { error: "At least one of value, name, or unit is required" },
      { status: 400 }
    );
  }

  // Validate value is a finite number if provided
  if (body.value !== undefined && (typeof body.value !== "number" || !isFinite(body.value))) {
    return NextResponse.json(
      { error: "Value must be a finite number" },
      { status: 400 }
    );
  }

  // Load the risk_flag
  const { data: riskFlag, error: flagError } = await supabase
    .from("risk_flags")
    .select("id, parsed_result_id, biomarker_name, value, flag, confidence")
    .eq("id", riskFlagId)
    .single();

  if (flagError || !riskFlag) {
    return NextResponse.json(
      { error: "Risk flag not found" },
      { status: 404 }
    );
  }

  // Verify ownership: risk_flag -> parsed_result -> report -> user_id
  const { data: parsedResult, error: parsedError } = await supabase
    .from("parsed_results")
    .select("id, report_id, biomarkers")
    .eq("id", riskFlag.parsed_result_id)
    .single();

  if (parsedError || !parsedResult) {
    return NextResponse.json(
      { error: "Parsed result not found" },
      { status: 404 }
    );
  }

  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("id, user_id")
    .eq("id", parsedResult.report_id)
    .single();

  if (reportError || !report) {
    return NextResponse.json(
      { error: "Report not found" },
      { status: 404 }
    );
  }

  if (report.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Determine corrected values
  const correctedValue = body.value ?? Number(riskFlag.value);
  const correctedName = body.name ?? riskFlag.biomarker_name;
  const originalValue = Number(riskFlag.value);
  const originalName = riskFlag.biomarker_name;

  // Save correction record (preserves original values for audit trail)
  const { error: correctionError } = await supabase
    .from("biomarker_corrections")
    .insert({
      user_id: user.id,
      risk_flag_id: riskFlagId,
      original_value: originalValue,
      corrected_value: correctedValue,
      original_name: originalName,
      corrected_name: correctedName,
      original_unit: body.unit ? null : null, // Original unit not tracked on risk_flags
      corrected_unit: body.unit ?? null,
    });

  if (correctionError) {
    console.error("[CORRECT] Failed to save correction:", correctionError.message);
    return NextResponse.json(
      { error: "Failed to save correction" },
      { status: 500 }
    );
  }

  // Re-flag the biomarker with the corrected value using server-side ranges
  const newFlag = flagBiomarker(correctedName, correctedValue) ?? riskFlag.flag;

  // Update the risk_flag row with corrected value + re-flagged color
  const riskFlagUpdate: Record<string, unknown> = {
    value: correctedValue,
    flag: newFlag,
  };
  if (body.name) {
    riskFlagUpdate.biomarker_name = correctedName;
  }

  const { data: updatedFlag, error: updateError } = await supabase
    .from("risk_flags")
    .update(riskFlagUpdate)
    .eq("id", riskFlagId)
    .select("id, biomarker_name, value, reference_low, reference_high, flag, trend, confidence")
    .single();

  if (updateError) {
    console.error("[CORRECT] Failed to update risk flag:", updateError.message);
    return NextResponse.json(
      { error: "Failed to update risk flag" },
      { status: 500 }
    );
  }

  // Update the corresponding biomarker in parsed_results.biomarkers JSONB
  if (parsedResult.biomarkers && Array.isArray(parsedResult.biomarkers)) {
    const updatedBiomarkers = (parsedResult.biomarkers as Record<string, unknown>[]).map(
      (b: Record<string, unknown>) => {
        // Match by name (original name before correction)
        if (b.name === originalName) {
          return {
            ...b,
            value: correctedValue,
            name: correctedName,
            flag: newFlag,
          };
        }
        return b;
      }
    );

    const { error: jsonbError } = await supabase
      .from("parsed_results")
      .update({ biomarkers: updatedBiomarkers })
      .eq("id", parsedResult.id);

    if (jsonbError) {
      console.error("[CORRECT] Failed to update parsed_results JSONB:", jsonbError.message);
      // Non-fatal: the risk_flag is already updated
    }
  }

  // Audit log the correction
  logAuditEvent({
    userId: user.id,
    action: "biomarker.correct",
    resourceType: "risk_flag",
    resourceId: riskFlagId,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(
    {
      risk_flag: {
        ...updatedFlag,
        corrected: true,
        original_value: originalValue,
      },
    },
    { status: 200 }
  );
}
