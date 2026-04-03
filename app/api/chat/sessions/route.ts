import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 50;

export async function GET(request: Request) {
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse pagination params
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(url.searchParams.get("limit") || String(DEFAULT_LIMIT), 10))
  );
  const offset = (page - 1) * limit;

  // Get total count of sessions for this user
  const { count } = await supabase
    .from("chat_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  // Fetch sessions with message count and first user message for title
  const { data: sessions, error: sessionsError } = await supabase
    .from("chat_sessions")
    .select(`
      id,
      title,
      report_id,
      created_at,
      updated_at,
      chat_messages (
        id
      )
    `)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (sessionsError) {
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }

  // For sessions without a title, fetch the first user message
  const sessionIds = (sessions || [])
    .filter((s) => !s.title)
    .map((s) => s.id);

  let firstMessages: Record<string, string> = {};
  if (sessionIds.length > 0) {
    // Get the first user message for each session that needs a title
    const { data: messages } = await supabase
      .from("chat_messages")
      .select("session_id, content")
      .in("session_id", sessionIds)
      .eq("role", "user")
      .order("created_at", { ascending: true });

    if (messages) {
      // Keep only the first message per session
      for (const msg of messages) {
        if (!firstMessages[msg.session_id]) {
          firstMessages[msg.session_id] = msg.content;
        }
      }
    }
  }

  // Build response with derived titles and message counts
  const formattedSessions = (sessions || []).map((session) => {
    const messageCount = Array.isArray(session.chat_messages)
      ? session.chat_messages.length
      : 0;

    let title = session.title;
    if (!title) {
      const firstMsg = firstMessages[session.id];
      title = firstMsg
        ? firstMsg.substring(0, 50) + (firstMsg.length > 50 ? "..." : "")
        : "New Chat";
    }

    return {
      id: session.id,
      title,
      report_id: session.report_id,
      created_at: session.created_at,
      updated_at: session.updated_at,
      message_count: messageCount,
    };
  });

  return NextResponse.json({
    sessions: formattedSessions,
    pagination: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  });
}
