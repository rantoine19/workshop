import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logAuditEvent, getClientIp } from "@/lib/audit/logger";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const BUCKET = "insurance-photos";

type Side = "front" | "back";

function isSide(value: unknown): value is Side {
  return value === "front" || value === "back";
}

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
  };
  return map[mimeType] || "png";
}

/**
 * Validate file content by checking magic bytes (file signatures).
 * Prevents MIME type spoofing.
 */
async function validateMagicBytes(file: File): Promise<boolean> {
  const buffer = await file.slice(0, 4).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // JPEG: starts with 0xFF 0xD8 0xFF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;

  // PNG: starts with 0x89 0x50 0x4E 0x47
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return true;

  // WebP: starts with RIFF (0x52 0x49 0x46 0x46)
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46
  )
    return true;

  return false;
}

function pathColumnForSide(side: Side): "front_photo_path" | "back_photo_path" {
  return side === "front" ? "front_photo_path" : "back_photo_path";
}

export async function POST(
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

  // Verify card belongs to user
  const { data: card } = await supabase
    .from("insurance_cards")
    .select("id, front_photo_path, back_photo_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!card) {
    return NextResponse.json(
      { error: "Insurance card not found" },
      { status: 404 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data" },
      { status: 400 }
    );
  }

  const sideField = formData.get("side");
  if (!isSide(sideField)) {
    return NextResponse.json(
      { error: "Invalid side. Must be 'front' or 'back'" },
      { status: 400 }
    );
  }
  const side: Side = sideField;

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "No file provided" },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Accepted: PNG, JPEG, WebP" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 5MB" },
      { status: 413 }
    );
  }

  const validContent = await validateMagicBytes(file);
  if (!validContent) {
    return NextResponse.json(
      { error: "File content does not match its type" },
      { status: 400 }
    );
  }

  const column = pathColumnForSide(side);
  const existingPath = card[column];

  // Delete existing photo for this side if present
  if (existingPath) {
    await supabase.storage.from(BUCKET).remove([existingPath]);
  }

  const ext = getExtension(file.type);
  const filePath = `${user.id}/${id}-${side}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: "Failed to upload photo" },
      { status: 500 }
    );
  }

  const { error: updateError } = await supabase
    .from("insurance_cards")
    .update({
      [column]: filePath,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update insurance card" },
      { status: 500 }
    );
  }

  logAuditEvent({
    userId: user.id,
    action: "insurance_card.photo_upload",
    resourceType: "insurance_card",
    resourceId: id,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ side, path: filePath }, { status: 200 });
}

export async function DELETE(
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

  const { searchParams } = new URL(request.url);
  const sideParam = searchParams.get("side");
  if (!isSide(sideParam)) {
    return NextResponse.json(
      { error: "Invalid side. Must be 'front' or 'back'" },
      { status: 400 }
    );
  }
  const side: Side = sideParam;

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

  const column = pathColumnForSide(side);
  const existingPath = card[column];

  if (!existingPath) {
    return NextResponse.json(
      { error: "No photo to delete" },
      { status: 400 }
    );
  }

  await supabase.storage.from(BUCKET).remove([existingPath]);

  const { error: updateError } = await supabase
    .from("insurance_cards")
    .update({
      [column]: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update insurance card" },
      { status: 500 }
    );
  }

  logAuditEvent({
    userId: user.id,
    action: "insurance_card.photo_delete",
    resourceType: "insurance_card",
    resourceId: id,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ side, path: null }, { status: 200 });
}
