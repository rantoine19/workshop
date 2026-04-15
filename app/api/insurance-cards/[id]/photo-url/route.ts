import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const BUCKET = "insurance-photos";
const SIGNED_URL_TTL_SECONDS = 300; // 5 minutes

/**
 * Return short-lived signed URLs for the front and back insurance card photos.
 * Photos live in a private bucket, so clients cannot fetch them directly.
 * The URL is valid for 5 minutes.
 */
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

  const { data: card } = await supabase
    .from("insurance_cards")
    .select("front_photo_path, back_photo_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!card) {
    return NextResponse.json(
      { error: "Insurance card not found" },
      { status: 404 }
    );
  }

  const result: {
    front_url: string | null;
    back_url: string | null;
  } = { front_url: null, back_url: null };

  if (card.front_photo_path) {
    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(card.front_photo_path, SIGNED_URL_TTL_SECONDS);
    result.front_url = data?.signedUrl ?? null;
  }

  if (card.back_photo_path) {
    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(card.back_photo_path, SIGNED_URL_TTL_SECONDS);
    result.back_url = data?.signedUrl ?? null;
  }

  return NextResponse.json(result);
}
