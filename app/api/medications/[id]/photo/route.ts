import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

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

  // WebP: starts with RIFF....WEBP (0x52 0x49 0x46 0x46)
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46
  )
    return true;

  return false;
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

  // Verify medication belongs to user
  const { data: medication } = await supabase
    .from("medications")
    .select("id, photo_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!medication) {
    return NextResponse.json(
      { error: "Medication not found" },
      { status: 404 }
    );
  }

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "No file provided" },
      { status: 400 }
    );
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Accepted: PNG, JPEG, WebP" },
      { status: 400 }
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 5MB" },
      { status: 413 }
    );
  }

  // Validate magic bytes
  const validContent = await validateMagicBytes(file);
  if (!validContent) {
    return NextResponse.json(
      { error: "File content does not match its type" },
      { status: 400 }
    );
  }

  // Delete existing photo if present
  if (medication.photo_path) {
    await supabase.storage
      .from("medication-photos")
      .remove([medication.photo_path]);
  }

  const ext = getExtension(file.type);
  const filePath = `${user.id}/${id}.${ext}`;

  // Upload new photo
  const { error: uploadError } = await supabase.storage
    .from("medication-photos")
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

  // Update medication record with photo path
  const { error: updateError } = await supabase
    .from("medications")
    .update({
      photo_path: filePath,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update medication" },
      { status: 500 }
    );
  }

  return NextResponse.json({ photo_path: filePath }, { status: 200 });
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

  // Fetch medication to get photo path
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

  if (!medication.photo_path) {
    return NextResponse.json(
      { error: "No photo to delete" },
      { status: 400 }
    );
  }

  // Delete from storage
  await supabase.storage
    .from("medication-photos")
    .remove([medication.photo_path]);

  // Clear photo_path in medication record
  const { error: updateError } = await supabase
    .from("medications")
    .update({
      photo_path: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update medication" },
      { status: 500 }
    );
  }

  return NextResponse.json({ photo_path: null }, { status: 200 });
}
