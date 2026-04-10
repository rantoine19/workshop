import { createClient } from "@/lib/supabase/server";
import { getClaudeClient } from "@/lib/claude/client";
import { CHAT_SYSTEM_PROMPT, buildReportContext, buildHealthContext, buildMultiReportContext, buildEnrichedContext } from "@/lib/claude/chat-prompts";
import { lookupCondition } from "@/lib/health/nlm-api";
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
    // Create new session with title from first message
    const title =
      userMessage.substring(0, 50) + (userMessage.length > 50 ? "..." : "");

    const { data: newSession, error: sessionError } = await supabase
      .from("chat_sessions")
      .insert({
        user_id: user.id,
        report_id: body.report_id || null,
        title,
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

  // Load health profile context
  const { data: profileData } = await supabase
    .from("profiles")
    .select("known_conditions, medications, smoking_status, family_history, activity_level, sleep_hours, gender, date_of_birth, height_inches")
    .eq("id", user.id)
    .single();

  const healthContext = profileData ? buildHealthContext(profileData) : "";

  // Load report context — single report if report_id provided, otherwise multi-report
  let reportContext = "";
  const reportId = body.report_id;

  if (reportId) {
    // Single-report context: load the specific report's parsed data
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
  } else {
    // Multi-report context: load ALL user's parsed reports (up to 5 most recent)
    const { data: userReports } = await supabase
      .from("reports")
      .select("id, original_filename, report_date, created_at")
      .eq("user_id", user.id)
      .eq("status", "parsed")
      .order("report_date", { ascending: false, nullsFirst: false })
      .limit(5);

    if (userReports && userReports.length > 0) {
      const reportIds = userReports.map((r) => r.id);
      const { data: allParsed } = await supabase
        .from("parsed_results")
        .select("report_id, biomarkers, summary_plain")
        .in("report_id", reportIds)
        .order("created_at", { ascending: false });

      if (allParsed && allParsed.length > 0) {
        // Build a map of report_id -> latest parsed result
        const parsedMap = new Map<string, typeof allParsed[0]>();
        for (const p of allParsed) {
          if (!parsedMap.has(p.report_id)) {
            parsedMap.set(p.report_id, p);
          }
        }

        const multiReportData = userReports
          .filter((r) => parsedMap.has(r.id))
          .map((r) => {
            const parsed = parsedMap.get(r.id)!;
            return {
              filename: r.original_filename,
              report_date: r.report_date,
              created_at: r.created_at,
              biomarkers: (parsed.biomarkers || []).map((b: { name: string; value: number; unit: string; flag: string }) => ({
                name: b.name,
                value: b.value,
                unit: b.unit,
                flag: b.flag,
              })),
              summary_plain: parsed.summary_plain,
            };
          });

        reportContext = buildMultiReportContext(multiReportData);
      }
    }
  }

  // Load chat history (last N messages)
  const { data: history } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(MAX_HISTORY_MESSAGES);

  // Build enriched context from biomarker knowledge base
  let enrichedContext = "";
  if (reportId) {
    // Single-report: enrich from that report's biomarkers
    const { data: enrichParsed } = await supabase
      .from("parsed_results")
      .select("biomarkers")
      .eq("report_id", reportId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (enrichParsed?.biomarkers) {
      const biomarkers = (enrichParsed.biomarkers as Array<{ name: string; value: number; unit: string; flag: string }>).map((b) => ({
        name: b.name,
        value: b.value,
        unit: b.unit,
        flag: b.flag,
      }));
      enrichedContext = buildEnrichedContext(biomarkers, profileData);
    }
  }

  // NLM condition lookup: check if user is asking about a medical condition
  let nlmContext = "";
  const conditionMatch = userMessage.match(
    /what (?:is|are|does)(?: a| an)? (.+?)(?:\?|$)/i
  );
  if (conditionMatch) {
    const conditionResult = await lookupCondition(conditionMatch[1]);
    if (conditionResult) {
      nlmContext = conditionResult;
    }
  }

  // Build messages for Claude
  let systemPrompt = CHAT_SYSTEM_PROMPT;
  if (healthContext) {
    systemPrompt += `\n\n${healthContext}`;
  }
  if (reportContext) {
    systemPrompt += `\n\n${reportContext}`;
  }
  if (enrichedContext) {
    systemPrompt += `\n\n${enrichedContext}`;
  }
  if (nlmContext) {
    systemPrompt += `\n\n${nlmContext}`;
  }

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

        // Update session's updated_at timestamp
        await supabase
          .from("chat_sessions")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", sessionId);

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
