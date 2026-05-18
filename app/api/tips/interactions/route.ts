import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  VALID_TIP_ACTIONS,
  computeStreak,
  type TipAction,
} from "@/lib/health/daily-tips";

/**
 * GET /api/tips/interactions
 *
 * Returns the user's tip interaction state:
 *   - favorites: tip_ids the user has favorited (and not unfavorited)
 *   - dismissed: tip_ids the user has dismissed (and not undismissed)
 *   - completed: tip_ids completed today
 *   - streak: current consecutive-day streak of completing at least one tip
 *   - recent: most recent interactions (capped)
 *
 * Optional query: ?tipId=<id> returns the interaction history for one tip.
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
  const tipId = searchParams.get("tipId");

  if (tipId) {
    const { data, error } = await supabase
      .from("tip_interactions")
      .select("*")
      .eq("user_id", user.id)
      .eq("tip_id", tipId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json(
        { error: "Failed to load interactions" },
        { status: 500 }
      );
    }

    return NextResponse.json({ interactions: data ?? [] });
  }

  // Load all interactions for state computation. RLS limits to this user.
  const { data, error } = await supabase
    .from("tip_interactions")
    .select("tip_id, action, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(2000);

  if (error) {
    return NextResponse.json(
      { error: "Failed to load interactions" },
      { status: 500 }
    );
  }

  const rows = data ?? [];

  // Compute net state from the action log: a 'favorited' then later
  // 'unfavorited' should not appear in favorites.
  const favoritesState = new Map<string, boolean>();
  const dismissedState = new Map<string, boolean>();
  const completedTimestamps: string[] = [];
  const todayKey = new Date().toISOString().slice(0, 10);
  const completedToday = new Set<string>();

  // Walk oldest-first so the most recent action wins by overwriting.
  // The query returned most-recent first, so reverse.
  for (const row of [...rows].reverse()) {
    switch (row.action) {
      case "favorited":
        favoritesState.set(row.tip_id, true);
        break;
      case "unfavorited":
        favoritesState.set(row.tip_id, false);
        break;
      case "dismissed":
        dismissedState.set(row.tip_id, true);
        break;
      case "undismissed":
        dismissedState.set(row.tip_id, false);
        break;
      case "completed": {
        completedTimestamps.push(row.created_at);
        const dayKey = new Date(row.created_at).toISOString().slice(0, 10);
        if (dayKey === todayKey) completedToday.add(row.tip_id);
        break;
      }
      default:
        // viewed, helpful, not_helpful — not state-bearing
        break;
    }
  }

  const favorites = Array.from(favoritesState.entries())
    .filter(([, v]) => v)
    .map(([k]) => k);
  const dismissed = Array.from(dismissedState.entries())
    .filter(([, v]) => v)
    .map(([k]) => k);

  const streak = computeStreak(completedTimestamps);

  return NextResponse.json({
    favorites,
    dismissed,
    completedToday: Array.from(completedToday),
    streak,
    recent: rows.slice(0, 50),
  });
}

/**
 * POST /api/tips/interactions
 *
 * Records a tip interaction.
 * Body: { tip_id: string, action: TipAction }
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

  const tipId =
    typeof body.tip_id === "string" ? body.tip_id.trim() : "";
  const action =
    typeof body.action === "string" ? body.action.trim() : "";

  if (!tipId) {
    return NextResponse.json(
      { error: "tip_id is required" },
      { status: 400 }
    );
  }

  if (!(VALID_TIP_ACTIONS as readonly string[]).includes(action)) {
    return NextResponse.json(
      { error: `Invalid action. Must be one of: ${VALID_TIP_ACTIONS.join(", ")}` },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("tip_interactions")
    .insert({
      user_id: user.id,
      tip_id: tipId,
      action: action as TipAction,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to record interaction" },
      { status: 500 }
    );
  }

  return NextResponse.json({ interaction: data }, { status: 201 });
}

/**
 * DELETE /api/tips/interactions
 *
 * Optional: clear interactions of a given action type, or reset all.
 * Query: ?action=dismissed clears all 'dismissed' actions for the user
 *        (so previously-dismissed tips appear again).
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
  const action = searchParams.get("action");

  // Validate the action filter before touching the DB.
  if (action && !(VALID_TIP_ACTIONS as readonly string[]).includes(action)) {
    return NextResponse.json(
      { error: "Invalid action filter" },
      { status: 400 }
    );
  }

  let query = supabase
    .from("tip_interactions")
    .delete()
    .eq("user_id", user.id);

  if (action) {
    query = query.eq("action", action);
  }

  const { error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete interactions" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
