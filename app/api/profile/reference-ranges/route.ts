import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Custom reference ranges API (#50)
 *
 * GET  — List all custom reference ranges for the authenticated user
 * POST — Create or update a custom range for a specific biomarker
 * DELETE — Remove a custom range (falls back to default)
 */

export interface CustomReferenceRange {
  id: string;
  user_id: string;
  biomarker_name: string;
  green_low: number | null;
  green_high: number | null;
  yellow_low: number | null;
  yellow_high: number | null;
  red_low: number | null;
  red_high: number | null;
  direction: "lower-is-better" | "higher-is-better" | "range";
  source: string | null;
  created_at: string;
  updated_at: string;
}

const VALID_DIRECTIONS = ["lower-is-better", "higher-is-better", "range"];

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: ranges, error } = await supabase
    .from("custom_reference_ranges")
    .select("*")
    .eq("user_id", user.id)
    .order("biomarker_name");

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch custom ranges" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ranges }, { status: 200 });
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    biomarker_name: string;
    green_low?: number | null;
    green_high?: number | null;
    yellow_low?: number | null;
    yellow_high?: number | null;
    red_low?: number | null;
    red_high?: number | null;
    direction?: string;
    source?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  // Validate biomarker_name
  if (!body.biomarker_name || typeof body.biomarker_name !== "string") {
    return NextResponse.json(
      { error: "biomarker_name is required" },
      { status: 400 }
    );
  }

  if (body.biomarker_name.length > 200) {
    return NextResponse.json(
      { error: "biomarker_name must be under 200 characters" },
      { status: 400 }
    );
  }

  // Validate direction
  const direction = body.direction || "range";
  if (!VALID_DIRECTIONS.includes(direction)) {
    return NextResponse.json(
      { error: `direction must be one of: ${VALID_DIRECTIONS.join(", ")}` },
      { status: 400 }
    );
  }

  // Validate numeric fields
  const numericFields = [
    "green_low",
    "green_high",
    "yellow_low",
    "yellow_high",
    "red_low",
    "red_high",
  ] as const;

  for (const field of numericFields) {
    const val = body[field];
    if (val !== undefined && val !== null && typeof val !== "number") {
      return NextResponse.json(
        { error: `${field} must be a number or null` },
        { status: 400 }
      );
    }
  }

  // Upsert: create or update based on user_id + biomarker_name unique constraint
  const { data: range, error } = await supabase
    .from("custom_reference_ranges")
    .upsert(
      {
        user_id: user.id,
        biomarker_name: body.biomarker_name,
        green_low: body.green_low ?? null,
        green_high: body.green_high ?? null,
        yellow_low: body.yellow_low ?? null,
        yellow_high: body.yellow_high ?? null,
        red_low: body.red_low ?? null,
        red_high: body.red_high ?? null,
        direction,
        source: body.source ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,biomarker_name" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to save custom range" },
      { status: 500 }
    );
  }

  return NextResponse.json({ range }, { status: 200 });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { biomarker_name: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  if (!body.biomarker_name || typeof body.biomarker_name !== "string") {
    return NextResponse.json(
      { error: "biomarker_name is required" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("custom_reference_ranges")
    .delete()
    .eq("user_id", user.id)
    .eq("biomarker_name", body.biomarker_name);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete custom range" },
      { status: 500 }
    );
  }

  return NextResponse.json({ deleted: true }, { status: 200 });
}
