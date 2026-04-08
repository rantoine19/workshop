import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const VALID_SMOKING_STATUS = ["none", "occasionally", "daily"];
const VALID_ACTIVITY_LEVEL = ["sedentary", "light", "moderate", "very_active"];
const VALID_SLEEP_HOURS = ["7plus", "6", "5_or_less"];
const VALID_CONDITIONS = [
  "Diabetes",
  "Hypertension",
  "Heart Disease",
  "Thyroid Disorder",
  "Kidney Disease",
  "High Cholesterol",
  "Asthma/COPD",
  "None",
];
const VALID_FAMILY_HISTORY = [
  "Heart Disease",
  "Diabetes",
  "Cancer",
  "High Blood Pressure",
  "Stroke",
  "None",
];

const PROFILE_SELECT =
  "id, display_name, date_of_birth, gender, avatar_url, height_inches, known_conditions, medications, smoking_status, family_history, activity_level, sleep_hours, updated_at";

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
    .select(PROFILE_SELECT)
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
        height_inches: null,
        known_conditions: [],
        medications: null,
        smoking_status: null,
        family_history: [],
        activity_level: null,
        sleep_hours: null,
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
    height_inches?: number | null;
    known_conditions?: string[];
    medications?: string | null;
    smoking_status?: string | null;
    family_history?: string[];
    activity_level?: string | null;
    sleep_hours?: string | null;
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

  // Validate height_inches
  if (body.height_inches !== undefined && body.height_inches !== null) {
    if (
      typeof body.height_inches !== "number" ||
      !Number.isInteger(body.height_inches) ||
      body.height_inches < 0 ||
      body.height_inches > 108
    ) {
      return NextResponse.json(
        { error: "height_inches must be an integer between 0 and 108" },
        { status: 400 }
      );
    }
  }

  // Validate known_conditions
  if (body.known_conditions !== undefined) {
    if (!Array.isArray(body.known_conditions)) {
      return NextResponse.json(
        { error: "known_conditions must be an array" },
        { status: 400 }
      );
    }
    for (const c of body.known_conditions) {
      if (!VALID_CONDITIONS.includes(c)) {
        return NextResponse.json(
          { error: `Invalid condition: ${c}. Must be one of: ${VALID_CONDITIONS.join(", ")}` },
          { status: 400 }
        );
      }
    }
  }

  // Validate medications (free text, optional)
  if (body.medications !== undefined && body.medications !== null) {
    if (typeof body.medications !== "string" || body.medications.length > 1000) {
      return NextResponse.json(
        { error: "medications must be a string under 1000 characters" },
        { status: 400 }
      );
    }
  }

  // Validate smoking_status
  if (body.smoking_status !== undefined && body.smoking_status !== null) {
    if (!VALID_SMOKING_STATUS.includes(body.smoking_status)) {
      return NextResponse.json(
        { error: `smoking_status must be one of: ${VALID_SMOKING_STATUS.join(", ")}` },
        { status: 400 }
      );
    }
  }

  // Validate family_history
  if (body.family_history !== undefined) {
    if (!Array.isArray(body.family_history)) {
      return NextResponse.json(
        { error: "family_history must be an array" },
        { status: 400 }
      );
    }
    for (const f of body.family_history) {
      if (!VALID_FAMILY_HISTORY.includes(f)) {
        return NextResponse.json(
          { error: `Invalid family history: ${f}. Must be one of: ${VALID_FAMILY_HISTORY.join(", ")}` },
          { status: 400 }
        );
      }
    }
  }

  // Validate activity_level
  if (body.activity_level !== undefined && body.activity_level !== null) {
    if (!VALID_ACTIVITY_LEVEL.includes(body.activity_level)) {
      return NextResponse.json(
        { error: `activity_level must be one of: ${VALID_ACTIVITY_LEVEL.join(", ")}` },
        { status: 400 }
      );
    }
  }

  // Validate sleep_hours
  if (body.sleep_hours !== undefined && body.sleep_hours !== null) {
    if (!VALID_SLEEP_HOURS.includes(body.sleep_hours)) {
      return NextResponse.json(
        { error: `sleep_hours must be one of: ${VALID_SLEEP_HOURS.join(", ")}` },
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
  if (body.height_inches !== undefined) {
    updateData.height_inches = body.height_inches;
  }
  if (body.known_conditions !== undefined) {
    updateData.known_conditions = body.known_conditions;
  }
  if (body.medications !== undefined) {
    updateData.medications = body.medications;
  }
  if (body.smoking_status !== undefined) {
    updateData.smoking_status = body.smoking_status;
  }
  if (body.family_history !== undefined) {
    updateData.family_history = body.family_history;
  }
  if (body.activity_level !== undefined) {
    updateData.activity_level = body.activity_level;
  }
  if (body.sleep_hours !== undefined) {
    updateData.sleep_hours = body.sleep_hours;
  }

  // Upsert profile — creates if not exists, updates if exists
  const { data: profile, error } = await supabase
    .from("profiles")
    .upsert(updateData, { onConflict: "id" })
    .select(PROFILE_SELECT)
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }

  return NextResponse.json({ profile }, { status: 200 });
}
