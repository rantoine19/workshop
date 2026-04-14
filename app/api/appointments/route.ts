import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const VALID_TYPES = [
  "doctor",
  "dentist",
  "specialist",
  "lab_work",
  "eye_exam",
  "therapy",
  "other",
];

/**
 * GET /api/appointments
 * List all appointments for the authenticated user.
 * Optional query param: family_member_id
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
  const familyMemberId = searchParams.get("family_member_id");

  let query = supabase
    .from("appointments")
    .select("*")
    .eq("user_id", user.id)
    .order("date_time", { ascending: true });

  if (familyMemberId) {
    query = query.eq("family_member_id", familyMemberId);
  }

  const { data: appointments, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 }
    );
  }

  return NextResponse.json({ appointments: appointments ?? [] });
}

/**
 * POST /api/appointments
 * Create a new appointment. Requires title and date_time.
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

  const title =
    typeof body.title === "string" ? body.title.trim() : "";
  const dateTime =
    typeof body.date_time === "string" ? body.date_time.trim() : "";

  if (!title) {
    return NextResponse.json(
      { error: "title is required" },
      { status: 400 }
    );
  }

  if (!dateTime) {
    return NextResponse.json(
      { error: "date_time is required" },
      { status: 400 }
    );
  }

  // Validate date_time is a valid date
  const parsedDate = new Date(dateTime);
  if (isNaN(parsedDate.getTime())) {
    return NextResponse.json(
      { error: "date_time must be a valid date" },
      { status: 400 }
    );
  }

  const appointmentType =
    typeof body.appointment_type === "string" &&
    VALID_TYPES.includes(body.appointment_type)
      ? body.appointment_type
      : "doctor";

  const durationMinutes =
    typeof body.duration_minutes === "number" &&
    [15, 30, 45, 60, 90].includes(body.duration_minutes)
      ? body.duration_minutes
      : 30;

  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert({
      user_id: user.id,
      title,
      date_time: parsedDate.toISOString(),
      appointment_type: appointmentType,
      duration_minutes: durationMinutes,
      provider_name:
        typeof body.provider_name === "string"
          ? body.provider_name.trim() || null
          : null,
      provider_location:
        typeof body.provider_location === "string"
          ? body.provider_location.trim() || null
          : null,
      family_member_id:
        typeof body.family_member_id === "string" && body.family_member_id
          ? body.family_member_id
          : null,
      notes:
        typeof body.notes === "string"
          ? body.notes.trim() || null
          : null,
      reminder_1day: body.reminder_1day !== false,
      reminder_1hour: body.reminder_1hour !== false,
      recurring:
        typeof body.recurring === "string" && body.recurring
          ? body.recurring
          : null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to create appointment" },
      { status: 500 }
    );
  }

  return NextResponse.json({ appointment }, { status: 201 });
}
