import { createClient } from "@/lib/supabase/server";
import { getClaudeClient } from "@/lib/claude/client";
import { CHAT_SYSTEM_PROMPT, buildReportContext } from "@/lib/claude/chat-prompts";
import { logAuditEvent, getClientIp } from "@/lib/audit/logger";
import { NextResponse } from "next/server";

const MAX_HISTORY_MESSAGES = 20;

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
  let body: { session_id?: string; report_id?: string; message: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  if (!body.message || typeof body.message !== "string" || !body.message.trim()) {
    return NextResponse.json(
      { error: "message is required" },
      { status: 400 }
    );
  }

  const userMessage = body.message.trim();

  // Create or load chat session
  let sessionId = body.session_id;

  if (sessionId) {
    // Verify session exists and belongs to user (RLS handles this)
    const { data: session } = await supabase
      .from("chat_sessions")
      .select("id")
      .eq("id", sessionId)
      .single();

    if (!session) {
      return NextResponse.json(
        { error: "Chat session not found" },
        { status: 404 }
      );
    }
  } else {
    // Create new session
    const { data: newSession, error: sessionError } = await supabase
      .from("chat_sessions")
      .insert({
        user_id: user.id,
        report_id: body.report_id || null,
      })
      .select("id")
      .single();

    if (sessionError || !newSession) {
      return NextResponse.json(
        { error: "Failed to create chat session" },
        { status: 500 }
      );
    }

    sessionId = newSession.id;
  }

  // Load report context if report_id is provided
  let reportContext = "";
  const reportId = body.report_id;

  if (reportId) {
    const { data: parsedResult } = await supabase
      .from("parsed_results")
      .select("biomarkers, summary_plain")
      .eq("report_id", reportId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (parsedResult && parsedResult.biomarkers) {
      reportContext = buildReportContext(parsedResult);
    }
  }

  // Load chat history (last N messages)
  const { data: history } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(MAX_HISTORY_MESSAGES);

  // Build messages for Claude
  const systemPrompt = reportContext
    ? `${CHAT_SYSTEM_PROMPT}\n\n${reportContext}`
    : CHAT_SYSTEM_PROMPT;

  const messages = [
    ...(history || []).map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  // Call Claude
  const claude = getClaudeClient();

  let assistantContent: string;
  try {
    const response = await claude.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from Claude");
    }

    assistantContent = textBlock.text;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Chat failed";
    return NextResponse.json(
      { error: `Chat failed: ${message}` },
      { status: 500 }
    );
  }

  // Persist both messages
  const { error: insertError } = await supabase
    .from("chat_messages")
    .insert([
      { session_id: sessionId, role: "user", content: userMessage },
      { session_id: sessionId, role: "assistant", content: assistantContent },
    ]);

  if (insertError) {
    // Still return the response even if persistence fails
    // The user shouldn't lose the answer due to a DB issue
  }

  // Audit log: chat message (fire-and-forget)
  logAuditEvent({
    userId: user.id,
    action: "chat.message",
    resourceType: "chat_session",
    resourceId: sessionId,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(
    {
      message: { role: "assistant", content: assistantContent },
      session_id: sessionId,
    },
    { status: 200 }
  );
}
