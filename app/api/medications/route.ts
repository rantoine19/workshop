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

  const { data: medications, error } = await supabase
    .from("medications")
    .select("*")
    .eq("user_id", user.id)
    .order("active", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Failed to load medications" },
      { status: 500 }
    );
  }

  return NextResponse.json({ medications });
}

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
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  // Validate required fields
  if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
    return NextResponse.json(
      { error: "Medication name is required" },
      { status: 400 }
    );
  }

  const validFrequencies = [
    "once_daily",
    "twice_daily",
    "three_times_daily",
    "weekly",
    "as_needed",
    "other",
  ];
  const frequency =
    typeof body.frequency === "string" && validFrequencies.includes(body.frequency)
      ? body.frequency
      : "once_daily";

  const validUnits = ["mg", "mcg", "ml", "tablets", "capsules", "drops", "units", "other"];
  const dosageUnit =
    typeof body.dosage_unit === "string" && validUnits.includes(body.dosage_unit)
      ? body.dosage_unit
      : null;

  const validTimes = [
    "morning",
    "afternoon",
    "evening",
    "bedtime",
    "with_meals",
    "any_time",
  ];
  const timeOfDay =
    typeof body.time_of_day === "string" && validTimes.includes(body.time_of_day)
      ? body.time_of_day
      : null;

  const { data: medication, error } = await supabase
    .from("medications")
    .insert({
      user_id: user.id,
      name: (body.name as string).trim(),
      dosage: typeof body.dosage === "string" ? body.dosage.trim() || null : null,
      dosage_unit: dosageUnit,
      frequency,
      time_of_day: timeOfDay,
      prescribing_doctor:
        typeof body.prescribing_doctor === "string"
          ? body.prescribing_doctor.trim() || null
          : null,
      start_date:
        typeof body.start_date === "string" && body.start_date
          ? body.start_date
          : null,
      notes:
        typeof body.notes === "string" ? body.notes.trim() || null : null,
      active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to create medication" },
      { status: 500 }
    );
  }

  return NextResponse.json({ medication }, { status: 201 });
}
