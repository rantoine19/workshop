import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
  };
  return map[mimeType] || "png";
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      { error: "File too large. Maximum size is 2MB" },
      { status: 413 }
    );
  }

  const ext = getExtension(file.type);
  const filePath = `${user.id}/avatar.${ext}`;

  // Delete any existing avatar files for this user
  const { data: existingFiles } = await supabase.storage
    .from("avatars")
    .list(user.id);

  if (existingFiles && existingFiles.length > 0) {
    const filesToDelete = existingFiles.map((f) => `${user.id}/${f.name}`);
    await supabase.storage.from("avatars").remove(filesToDelete);
  }

  // Upload new avatar
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: "Failed to upload avatar" },
      { status: 500 }
    );
  }

  // Build public URL using request origin (no hardcoded URLs)
  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(filePath);

  // Update profile with avatar URL
  const { error: updateError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }

  return NextResponse.json({ avatar_url: publicUrl }, { status: 200 });
}

export async function DELETE() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // List and delete all avatar files for this user
  const { data: existingFiles } = await supabase.storage
    .from("avatars")
    .list(user.id);

  if (existingFiles && existingFiles.length > 0) {
    const filesToDelete = existingFiles.map((f) => `${user.id}/${f.name}`);
    await supabase.storage.from("avatars").remove(filesToDelete);
  }

  // Clear avatar_url in profile
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }

  return NextResponse.json({ avatar_url: null }, { status: 200 });
}
