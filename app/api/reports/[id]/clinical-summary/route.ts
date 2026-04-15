import { createClient } from "@/lib/supabase/server";
import { getClaudeClient } from "@/lib/claude/client";
import {
  buildHealthContext,
  type StructuredMedication,
} from "@/lib/claude/chat-prompts";
import { REPORT_SUMMARY_SYSTEM_PROMPT } from "@/lib/claude/summary-prompt";
import { calculateHealthScore } from "@/lib/health/health-score";
import { logAuditEvent, getClientIp } from "@/lib/audit/logger";
import { NextResponse } from "next/server";

interface Biomarker {
  name: string;
  value: number;
  unit: string;
  reference_low: number | null;
  reference_high: number | null;
  flag: string;
}

/**
 * POST /api/reports/[id]/clinical-summary
 *
 * Generates a structured clinical summary for a single lab report
 * (ticket #151). Mirrors the chat-session summary pattern but uses
 * report context (biomarkers + health score) instead of transcript.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: reportId } = await params;
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch report and verify ownership
  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("id, user_id, original_filename, status, created_at")
    .eq("id", reportId)
    .single();

  if (reportError || !report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  if (report.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (report.status !== "parsed") {
    return NextResponse.json(
      { error: "Report has not been parsed yet" },
      { status: 400 }
    );
  }

  // Load parsed biomarkers
  const { data: parsedResult, error: parsedError } = await supabase
    .from("parsed_results")
    .select("id, biomarkers, summary_plain")
    .eq("report_id", reportId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (parsedError || !parsedResult) {
    return NextResponse.json(
      { error: "No parsed results found for this report" },
      { status: 404 }
    );
  }

  const biomarkers = (parsedResult.biomarkers as Biomarker[]) || [];
  if (biomarkers.length === 0) {
    return NextResponse.json(
      { error: "No biomarkers found in parsed results" },
      { status: 422 }
    );
  }

  // Load risk flags (authoritative flag values)
  const { data: riskFlags } = await supabase
    .from("risk_flags")
    .select("biomarker_name, value, reference_low, reference_high, flag")
    .eq("parsed_result_id", parsedResult.id);

  // Load user profile
  const { data: profileData } = await supabase
    .from("profiles")
    .select(
      "full_name, known_conditions, medications, smoking_status, family_history, activity_level, sleep_hours, gender, date_of_birth, height_inches"
    )
    .eq("id", user.id)
    .single();

  // Load structured medications
  const { data: medicationsData } = await supabase
    .from("medications")
    .select("name, dosage, dosage_unit, frequency")
    .eq("user_id", user.id)
    .eq("active", true)
    .order("name");

  const structuredMeds: StructuredMedication[] = (medicationsData || []).map(
    (m) => ({
      name: m.name,
      dosage: m.dosage,
      dosage_unit: m.dosage_unit,
      frequency: m.frequency,
    })
  );

  const healthContext = profileData
    ? buildHealthContext(profileData, structuredMeds)
    : "";

  // Compute health score from risk flags (if present) or biomarker flags
  const scoreInput =
    riskFlags && riskFlags.length > 0
      ? riskFlags.map((rf) => ({
          name: rf.biomarker_name,
          flag: rf.flag as "green" | "yellow" | "red",
        }))
      : biomarkers.map((b) => ({
          name: b.name,
          flag: b.flag as "green" | "yellow" | "red",
        }));

  const healthScore = calculateHealthScore(scoreInput);

  // Build the report context block (structured, readable)
  const biomarkerLines = biomarkers
    .map((b) => {
      const range =
        b.reference_low != null && b.reference_high != null
          ? `ref ${b.reference_low}-${b.reference_high} ${b.unit}`
          : "no reference range";
      return `- ${b.name}: ${b.value} ${b.unit} [${b.flag.toUpperCase()}] (${range})`;
    })
    .join("\n");

  const reportBlock = `REPORT CONTEXT
File: ${report.original_filename}
Report upload date: ${new Date(report.created_at).toISOString().slice(0, 10)}
Biomarker count: ${biomarkers.length}

BIOMARKERS:
${biomarkerLines}

HEALTH CREDIT SCORE: ${healthScore.score}/850 (${healthScore.label})
Breakdown: ${healthScore.breakdown.green} normal, ${healthScore.breakdown.yellow} borderline, ${healthScore.breakdown.red} needs attention
${healthScore.topConcerns.length > 0 ? `Top concerns: ${healthScore.topConcerns.join(", ")}` : ""}`;

  let systemPrompt = REPORT_SUMMARY_SYSTEM_PROMPT;
  if (healthContext) {
    systemPrompt += `\n\n${healthContext}`;
  }

  // Call Claude to generate the structured summary
  const claude = getClaudeClient();

  try {
    const response = await claude.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Here is the lab report to summarize:\n\n${reportBlock}`,
        },
      ],
    });

    const summaryText =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Audit log — record export action
    logAuditEvent({
      userId: user.id,
      action: "report.export_summary",
      resourceType: "report",
      resourceId: reportId,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      summary: summaryText,
      patient_name: profileData?.full_name || "Patient",
      report_name: report.original_filename,
      report_date: report.created_at,
      health_score: healthScore.score,
      health_score_label: healthScore.label,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Summary generation failed";
    return NextResponse.json(
      { error: `Failed to generate summary: ${message}` },
      { status: 500 }
    );
  }
}
