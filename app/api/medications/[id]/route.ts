import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

  const { data: medication, error } = await supabase
    .from("medications")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !medication) {
    return NextResponse.json(
      { error: "Medication not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ medication });
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

  // Build update object with only provided fields
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim() === "") {
      return NextResponse.json(
        { error: "Medication name cannot be empty" },
        { status: 400 }
      );
    }
    updates.name = (body.name as string).trim();
  }

  if (body.dosage !== undefined) {
    updates.dosage = typeof body.dosage === "string" ? body.dosage.trim() || null : null;
  }

  if (body.dosage_unit !== undefined) {
    const validUnits = ["mg", "mcg", "ml", "tablets", "capsules", "drops", "units", "other"];
    updates.dosage_unit =
      typeof body.dosage_unit === "string" && validUnits.includes(body.dosage_unit)
        ? body.dosage_unit
        : null;
  }

  if (body.frequency !== undefined) {
    const validFrequencies = [
      "once_daily", "twice_daily", "three_times_daily", "weekly", "as_needed", "other",
    ];
    if (typeof body.frequency === "string" && validFrequencies.includes(body.frequency)) {
      updates.frequency = body.frequency;
    }
  }

  if (body.time_of_day !== undefined) {
    const validTimes = ["morning", "afternoon", "evening", "bedtime", "with_meals", "any_time"];
    updates.time_of_day =
      typeof body.time_of_day === "string" && validTimes.includes(body.time_of_day)
        ? body.time_of_day
        : null;
  }

  if (body.prescribing_doctor !== undefined) {
    updates.prescribing_doctor =
      typeof body.prescribing_doctor === "string"
        ? body.prescribing_doctor.trim() || null
        : null;
  }

  if (body.start_date !== undefined) {
    updates.start_date =
      typeof body.start_date === "string" && body.start_date ? body.start_date : null;
  }

  if (body.notes !== undefined) {
    updates.notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
  }

  if (body.active !== undefined) {
    updates.active = Boolean(body.active);
  }

  const { data: medication, error } = await supabase
    .from("medications")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !medication) {
    return NextResponse.json(
      { error: "Medication not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ medication });
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

  // First, fetch the medication to check for a photo
  const { data: medication } = await supabase
    .from("medications")
    .select("photo_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!medication) {
    return NextResponse.json(
      { error: "Medication not found" },
      { status: 404 }
    );
  }

  // Clean up photo from storage if it exists
  if (medication.photo_path) {
    await supabase.storage
      .from("medication-photos")
      .remove([medication.photo_path]);
  }

  const { error } = await supabase
    .from("medications")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete medication" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
