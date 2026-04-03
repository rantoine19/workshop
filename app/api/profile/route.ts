import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch profile — RLS ensures only own profile is accessible
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, display_name, date_of_birth, gender, avatar_url, updated_at")
    .eq("id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows found — that's ok for new users
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      profile: profile || {
        id: user.id,
        display_name: null,
        date_of_birth: null,
        gender: null,
        avatar_url: null,
        updated_at: null,
      },
    },
    { status: 200 }
  );
}

export async function PUT(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse request body
  let body: {
    display_name?: string;
    date_of_birth?: string;
    gender?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  // Validate display_name
  if (body.display_name !== undefined) {
    if (
      typeof body.display_name !== "string" ||
      body.display_name.length > 100
    ) {
      return NextResponse.json(
        { error: "display_name must be a string under 100 characters" },
        { status: 400 }
      );
    }
  }

  // Validate date_of_birth format (YYYY-MM-DD)
  if (body.date_of_birth !== undefined && body.date_of_birth !== null) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(body.date_of_birth)) {
      return NextResponse.json(
        { error: "date_of_birth must be in YYYY-MM-DD format" },
        { status: 400 }
      );
    }
    // Validate it's a real date
    const parsed = new Date(body.date_of_birth);
    if (isNaN(parsed.getTime())) {
      return NextResponse.json(
        { error: "date_of_birth is not a valid date" },
        { status: 400 }
      );
    }
    // Must be in the past
    if (parsed > new Date()) {
      return NextResponse.json(
        { error: "date_of_birth must be in the past" },
        { status: 400 }
      );
    }
  }

  // Validate gender
  if (body.gender !== undefined && body.gender !== null) {
    const validGenders = ["male", "female", "other", "prefer_not_to_say"];
    if (!validGenders.includes(body.gender)) {
      return NextResponse.json(
        {
          error: `gender must be one of: ${validGenders.join(", ")}`,
        },
        { status: 400 }
      );
    }
  }

  // Build update object — only include provided fields
  const updateData: Record<string, unknown> = {
    id: user.id,
    updated_at: new Date().toISOString(),
  };

  if (body.display_name !== undefined) {
    updateData.display_name = body.display_name;
  }
  if (body.date_of_birth !== undefined) {
    updateData.date_of_birth = body.date_of_birth;
  }
  if (body.gender !== undefined) {
    updateData.gender = body.gender;
  }

  // Upsert profile — creates if not exists, updates if exists
  const { data: profile, error } = await supabase
    .from("profiles")
    .upsert(updateData, { onConflict: "id" })
    .select("id, display_name, date_of_birth, gender, avatar_url, updated_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }

  return NextResponse.json({ profile }, { status: 200 });
}
