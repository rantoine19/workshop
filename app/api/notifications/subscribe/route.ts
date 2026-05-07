import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { DEFAULT_PREFERENCES } from "@/lib/notifications/smart-reminders";

/**
 * POST /api/notifications/subscribe
 *
 * Save a Web Push subscription JSON onto the user's notification preferences.
 * The body should be the full PushSubscription.toJSON() object.
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== "object" ||
    typeof (body as { endpoint?: unknown }).endpoint !== "string"
  ) {
    return NextResponse.json(
      { error: "Invalid push subscription" },
      { status: 400 }
    );
  }

  // Ensure preferences row exists, then attach the subscription
  const { data: existing } = await supabase
    .from("notification_preferences")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    const { error: insertError } = await supabase
      .from("notification_preferences")
      .insert({
        user_id: user.id,
        ...DEFAULT_PREFERENCES,
        push_subscription: body,
      });
    if (insertError) {
      return NextResponse.json(
        { error: "Failed to save subscription" },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const { error: updateError } = await supabase
    .from("notification_preferences")
    .update({
      push_subscription: body,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to save subscription" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/notifications/subscribe
 *
 * Removes the user's stored push subscription (when they unsubscribe).
 */
export async function DELETE() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("notification_preferences")
    .update({
      push_subscription: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to remove subscription" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
