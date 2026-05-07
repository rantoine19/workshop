import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const VALID_TYPES = [
  "daily_checkin",
  "medication",
  "appointment",
  "blood_work",
  "daily_tip",
  "goal_progress",
];

/**
 * GET /api/notifications/log
 *
 * Returns the user's recent notification log entries (last 30 days, capped).
 * Optional query: ?unread=1 to filter to unread only.
 */
export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unread") === "1";

  const since = new Date();
  since.setDate(since.getDate() - 30);

  let query = supabase
    .from("notification_log")
    .select("*")
    .eq("user_id", user.id)
    .gte("sent_at", since.toISOString())
    .order("sent_at", { ascending: false })
    .limit(50);

  if (unreadOnly) {
    query = query.eq("read", false);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Failed to load notifications" },
      { status: 500 }
    );
  }

  // Also return an unread count for the bell badge
  const { count } = await supabase
    .from("notification_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("read", false);

  return NextResponse.json({
    notifications: data ?? [],
    unreadCount: count ?? 0,
  });
}

/**
 * POST /api/notifications/log
 *
 * Two modes:
 *   { id: string }                 — mark a single notification as read
 *   { reminder_type, title, body } — insert a new log entry (used by smart-reminders)
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Mark-as-read mode
  if (typeof body.id === "string" && body.id.length > 0) {
    const { error } = await supabase
      .from("notification_log")
      .update({ read: true })
      .eq("id", body.id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to update notification" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  }

  // Mark-all mode
  if (body.markAll === true) {
    const { error } = await supabase
      .from("notification_log")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);

    if (error) {
      return NextResponse.json(
        { error: "Failed to update notifications" },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true });
  }

  // Insert mode
  const reminderType =
    typeof body.reminder_type === "string" ? body.reminder_type : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const bodyText = typeof body.body === "string" ? body.body.trim() : "";
  const url = typeof body.url === "string" ? body.url : null;

  if (!VALID_TYPES.includes(reminderType)) {
    return NextResponse.json(
      { error: "Invalid reminder_type" },
      { status: 400 }
    );
  }

  if (!title) {
    return NextResponse.json(
      { error: "title is required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("notification_log")
    .insert({
      user_id: user.id,
      reminder_type: reminderType,
      title,
      body: bodyText || null,
      url,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    );
  }

  return NextResponse.json({ notification: data }, { status: 201 });
}

/**
 * DELETE /api/notifications/log
 *
 * Clears all notification log entries for the user.
 * Optional query: ?id=<id> to delete a single entry.
 */
export async function DELETE(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  let query = supabase
    .from("notification_log")
    .delete()
    .eq("user_id", user.id);

  if (id) {
    query = query.eq("id", id);
  }

  const { error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete notifications" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
