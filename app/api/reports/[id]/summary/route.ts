import { createClient } from "@/lib/supabase/server";
import { getClaudeClient } from "@/lib/claude/client";
import {
  SIMPLIFICATION_SYSTEM_PROMPT,
  SIMPLIFICATION_USER_PROMPT,
  formatBiomarkersForSimplification,
} from "@/lib/claude/simplification-prompts";
import { logAuditEvent, getClientIp } from "@/lib/audit/logger";
import { NextResponse } from "next/server";

export interface SimplifiedBiomarker {
  name: string;
  value: string;
  flag: string;
  explanation: string;
  importance: string;
  action: string;
}

export interface SimplifiedSummary {
  overall: string;
  biomarkers: SimplifiedBiomarker[];
  disclaimer: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: reportId } = await params;

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
    .select("id, user_id, status")
    .eq("id", reportId)
    .single();

  if (reportError || !report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  if (report.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Audit log: report summary view (fire-and-forget)
  logAuditEvent({
    userId: user.id,
    action: "report.view",
    resourceType: "report",
    resourceId: reportId,
    ipAddress: getClientIp(request),
  });

  // Fetch parsed results for this report
  const { data: parsedResult, error: parsedError } = await supabase
    .from("parsed_results")
    .select("id, biomarkers, summary_plain")
    .eq("report_id", reportId)
    .single();

  if (parsedError || !parsedResult) {
    return NextResponse.json(
      { error: "No parsed results found. Parse the report first." },
      { status: 404 }
    );
  }

  // Check for cached simplified summary
  if (parsedResult.summary_plain && isSimplifiedSummary(parsedResult.summary_plain)) {
    return NextResponse.json(
      { summary: JSON.parse(parsedResult.summary_plain as string), cached: true },
      { status: 200 }
    );
  }

  // Validate biomarkers exist
  const biomarkers = parsedResult.biomarkers as Array<{
    name: string;
    value: number;
    unit: string;
    reference_low: number | null;
    reference_high: number | null;
    flag: string;
  }>;

  if (!Array.isArray(biomarkers) || biomarkers.length === 0) {
    return NextResponse.json(
      { error: "No biomarkers found in parsed results" },
      { status: 422 }
    );
  }

  try {
    // Build prompt with biomarker data
    const biomarkerText = formatBiomarkersForSimplification(biomarkers);
    const userMessage = `${SIMPLIFICATION_USER_PROMPT}\n\n${biomarkerText}`;

    // Call Claude for simplification
    const client = getClaudeClient();
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SIMPLIFICATION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    // Extract text from response
    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from Claude");
    }

    // Parse JSON — handle markdown code blocks
    let jsonStr = textBlock.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const simplified = JSON.parse(jsonStr) as SimplifiedSummary;

    // Validate structure
    if (typeof simplified.overall !== "string") {
      throw new Error("Invalid response: overall must be a string");
    }
    if (!Array.isArray(simplified.biomarkers)) {
      throw new Error("Invalid response: biomarkers must be an array");
    }

    // Cache the simplified summary in parsed_results.summary_plain
    await supabase
      .from("parsed_results")
      .update({ summary_plain: JSON.stringify(simplified) })
      .eq("id", parsedResult.id);

    return NextResponse.json(
      { summary: simplified, cached: false },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Simplification failed";
    return NextResponse.json(
      { error: `Simplification failed: ${message}` },
      { status: 500 }
    );
  }
}

/**
 * Checks if summary_plain contains a simplified summary JSON
 * (vs the raw extraction summary string from initial parsing).
 */
function isSimplifiedSummary(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try {
    const parsed = JSON.parse(value);
    return (
      typeof parsed === "object" &&
      parsed !== null &&
      "overall" in parsed &&
      "biomarkers" in parsed &&
      Array.isArray(parsed.biomarkers)
    );
  } catch {
    return false;
  }
}
