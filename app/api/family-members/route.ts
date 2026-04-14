import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const MAX_FAMILY_MEMBERS = 10;

/**
 * GET /api/family-members
 * List all family members for the authenticated user.
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: members, error } = await supabase
    .from("family_members")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch family members" },
      { status: 500 }
    );
  }

  return NextResponse.json({ members: members ?? [] }, { status: 200 });
}

/**
 * POST /api/family-members
 * Create a new family member. Requires display_name. Max 10 per account.
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

  const displayName =
    typeof body.display_name === "string" ? body.display_name.trim() : "";

  if (!displayName) {
    return NextResponse.json(
      { error: "display_name is required" },
      { status: 400 }
    );
  }

  // Check max limit
  const { count, error: countError } = await supabase
    .from("family_members")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  if (countError) {
    return NextResponse.json(
      { error: "Failed to check family member count" },
      { status: 500 }
    );
  }

  if ((count ?? 0) >= MAX_FAMILY_MEMBERS) {
    return NextResponse.json(
      { error: `Maximum of ${MAX_FAMILY_MEMBERS} family members allowed` },
      { status: 400 }
    );
  }

  const { data: member, error: insertError } = await supabase
    .from("family_members")
    .insert({
      owner_id: user.id,
      display_name: displayName,
      relationship: body.relationship ?? null,
      date_of_birth: body.date_of_birth ?? null,
      gender: body.gender ?? null,
      height_inches: body.height_inches ?? null,
      known_conditions: body.known_conditions ?? [],
      medications: body.medications ?? null,
      smoking_status: body.smoking_status ?? null,
      family_history: body.family_history ?? [],
      activity_level: body.activity_level ?? null,
      sleep_hours: body.sleep_hours ?? null,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: "Failed to create family member" },
      { status: 500 }
    );
  }

  return NextResponse.json({ member }, { status: 201 });
}
