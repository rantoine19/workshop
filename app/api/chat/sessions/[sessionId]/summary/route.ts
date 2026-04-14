import { createClient } from "@/lib/supabase/server";
import { getClaudeClient } from "@/lib/claude/client";
import {
  buildHealthContext,
  buildReportContext,
  type StructuredMedication,
} from "@/lib/claude/chat-prompts";
import { CLINICAL_SUMMARY_SYSTEM_PROMPT } from "@/lib/claude/summary-prompt";
import { logAuditEvent, getClientIp } from "@/lib/audit/logger";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify session belongs to user and load report_id
  const { data: session } = await supabase
    .from("chat_sessions")
    .select("id, report_id, title")
    .eq("id", sessionId)
    .single();

  if (!session) {
    return NextResponse.json(
      { error: "Session not found" },
      { status: 404 }
    );
  }

  // Load all messages for the session
  const { data: messages, error: messagesError } = await supabase
    .from("chat_messages")
    .select("role, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (messagesError || !messages || messages.length === 0) {
    return NextResponse.json(
      { error: "No messages found for this session" },
      { status: 400 }
    );
  }

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

  // Load report context if session has one
  let reportContext = "";
  if (session.report_id) {
    const { data: parsedResult } = await supabase
      .from("parsed_results")
      .select("biomarkers, summary_plain")
      .eq("report_id", session.report_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (parsedResult?.biomarkers) {
      reportContext = buildReportContext(parsedResult);
    }
  }

  // Format chat transcript for Claude
  const transcript = messages
    .map(
      (m) =>
        `${m.role === "user" ? "Patient" : "AI Guide"}: ${m.content}`
    )
    .join("\n\n");

  // Build the system prompt with all context
  let systemPrompt = CLINICAL_SUMMARY_SYSTEM_PROMPT;
  if (healthContext) {
    systemPrompt += `\n\n${healthContext}`;
  }
  if (reportContext) {
    systemPrompt += `\n\n${reportContext}`;
  }

  // Call Claude to generate the summary
  const claude = getClaudeClient();

  try {
    const response = await claude.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Here is the chat conversation to summarize:\n\n${transcript}`,
        },
      ],
    });

    const summaryText =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Audit log
    logAuditEvent({
      userId: user.id,
      action: "chat.export_summary",
      resourceType: "chat_session",
      resourceId: sessionId,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      summary: summaryText,
      patient_name: profileData?.full_name || "Patient",
      session_title: session.title,
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
