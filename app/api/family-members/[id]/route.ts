import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/family-members/[id]
 * Get a single family member by ID.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: member, error } = await supabase
    .from("family_members")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (error || !member) {
    return NextResponse.json(
      { error: "Family member not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ member }, { status: 200 });
}

/**
 * PUT /api/family-members/[id]
 * Update a family member.
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params;
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

  // Build update object with only provided fields
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const allowedFields = [
    "display_name",
    "relationship",
    "date_of_birth",
    "gender",
    "height_inches",
    "known_conditions",
    "medications",
    "smoking_status",
    "family_history",
    "activity_level",
    "sleep_hours",
    "avatar_url",
  ];

  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  // Validate display_name if provided
  if ("display_name" in updates) {
    const name = typeof updates.display_name === "string" ? updates.display_name.trim() : "";
    if (!name) {
      return NextResponse.json(
        { error: "display_name cannot be empty" },
        { status: 400 }
      );
    }
    updates.display_name = name;
  }

  const { data: member, error } = await supabase
    .from("family_members")
    .update(updates)
    .eq("id", id)
    .eq("owner_id", user.id)
    .select()
    .single();

  if (error || !member) {
    return NextResponse.json(
      { error: "Family member not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ member }, { status: 200 });
}

/**
 * DELETE /api/family-members/[id]
 * Delete a family member.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("family_members")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete family member" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
