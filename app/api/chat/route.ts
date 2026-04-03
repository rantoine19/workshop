import { createClient } from "@/lib/supabase/server";
import { getClaudeClient } from "@/lib/claude/client";
import { CHAT_SYSTEM_PROMPT, buildReportContext } from "@/lib/claude/chat-prompts";
import { logAuditEvent, getClientIp } from "@/lib/audit/logger";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

const MAX_HISTORY_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 2000;

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

  if (userMessage.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      {
        error: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters.`,
      },
      { status: 400 }
    );
  }

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

  // Load report context only for the specific report_id.
  // Each chat session is tied to one report — results may differ between reports.
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

  // Audit log: chat message (fire-and-forget)
  logAuditEvent({
    userId: user.id,
    action: "chat.message",
    resourceType: "chat_session",
    resourceId: sessionId,
    ipAddress: getClientIp(request),
  });

  // Stream Claude response via SSE
  const claude = getClaudeClient();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let assistantContent = "";

      try {
        // Send session_id as the first SSE event so client knows it
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "session_id", session_id: sessionId })}\n\n`)
        );

        const messageStream = claude.messages.stream({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          system: systemPrompt,
          messages,
        });

        // Listen for text deltas
        messageStream.on("text", (text) => {
          assistantContent += text;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "text_delta", text })}\n\n`)
          );
        });

        // Wait for the stream to complete
        await messageStream.finalMessage();

        // Send done event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));

        // Persist both messages after stream completes
        const { error: insertError } = await supabase
          .from("chat_messages")
          .insert([
            { session_id: sessionId, role: "user", content: userMessage },
            { session_id: sessionId, role: "assistant", content: assistantContent },
          ]);

        if (insertError) {
          // Log to Sentry for ops visibility — NO PHI (no message content)
          Sentry.captureException(
            new Error(`Chat persistence failed: ${insertError.message}`),
            {
              tags: {
                feature: "chat",
                error_type: "persistence_failure",
              },
              extra: {
                session_id: sessionId,
                message_count: messages.length,
                has_report_context: !!reportContext,
                db_error_code: insertError.code,
              },
            }
          );
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Chat failed";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", error: `Chat failed: ${message}` })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
