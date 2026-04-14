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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: appointment, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !appointment) {
    return NextResponse.json(
      { error: "Appointment not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ appointment });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

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
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.trim() === "") {
      return NextResponse.json(
        { error: "Title cannot be empty" },
        { status: 400 }
      );
    }
    updates.title = (body.title as string).trim();
  }

  if (body.date_time !== undefined) {
    if (typeof body.date_time !== "string") {
      return NextResponse.json(
        { error: "date_time must be a string" },
        { status: 400 }
      );
    }
    const parsed = new Date(body.date_time);
    if (isNaN(parsed.getTime())) {
      return NextResponse.json(
        { error: "date_time must be a valid date" },
        { status: 400 }
      );
    }
    updates.date_time = parsed.toISOString();
  }

  if (body.appointment_type !== undefined) {
    if (
      typeof body.appointment_type === "string" &&
      VALID_TYPES.includes(body.appointment_type)
    ) {
      updates.appointment_type = body.appointment_type;
    }
  }

  if (body.duration_minutes !== undefined) {
    if (
      typeof body.duration_minutes === "number" &&
      [15, 30, 45, 60, 90].includes(body.duration_minutes)
    ) {
      updates.duration_minutes = body.duration_minutes;
    }
  }

  if (body.provider_name !== undefined) {
    updates.provider_name =
      typeof body.provider_name === "string"
        ? body.provider_name.trim() || null
        : null;
  }

  if (body.provider_location !== undefined) {
    updates.provider_location =
      typeof body.provider_location === "string"
        ? body.provider_location.trim() || null
        : null;
  }

  if (body.family_member_id !== undefined) {
    updates.family_member_id =
      typeof body.family_member_id === "string" && body.family_member_id
        ? body.family_member_id
        : null;
  }

  if (body.notes !== undefined) {
    updates.notes =
      typeof body.notes === "string" ? body.notes.trim() || null : null;
  }

  if (body.reminder_1day !== undefined) {
    updates.reminder_1day = Boolean(body.reminder_1day);
  }

  if (body.reminder_1hour !== undefined) {
    updates.reminder_1hour = Boolean(body.reminder_1hour);
  }

  if (body.recurring !== undefined) {
    updates.recurring =
      typeof body.recurring === "string" && body.recurring
        ? body.recurring
        : null;
  }

  if (body.completed !== undefined) {
    updates.completed = Boolean(body.completed);
  }

  const { data: appointment, error } = await supabase
    .from("appointments")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !appointment) {
    return NextResponse.json(
      { error: "Appointment not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ appointment });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete appointment" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
