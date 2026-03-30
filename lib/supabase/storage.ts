import { SupabaseClient } from "@supabase/supabase-js";

const BUCKET_NAME = "medical-reports";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
] as const;

export type AllowedFileType = (typeof ALLOWED_TYPES)[number];

export function validateFile(file: File): {
  valid: boolean;
  error?: string;
  statusCode?: number;
} {
  if (!ALLOWED_TYPES.includes(file.type as AllowedFileType)) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type}. Allowed: PDF, PNG, JPG.`,
      statusCode: 400,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: 10MB.`,
      statusCode: 413,
    };
  }

  return { valid: true };
}

export function getFileExtension(file: File): string {
  if (file.type === "application/pdf") return "pdf";
  if (file.type === "image/png") return "png";
  return "jpg";
}

export function getFileType(file: File): "pdf" | "image" {
  return file.type === "application/pdf" ? "pdf" : "image";
}

export async function uploadToStorage(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<{ filePath: string; error?: string }> {
  const ext = getFileExtension(file);
  const filePath = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return { filePath: "", error: error.message };
  }

  return { filePath };
}
