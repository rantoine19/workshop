import { createClient } from "@/lib/supabase/server";
import {
  validateFile,
  uploadToStorage,
  getFileType,
} from "@/lib/supabase/storage";
import { logAuditEvent, getClientIp } from "@/lib/audit/logger";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data" },
      { status: 400 }
    );
  }

  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json(
      { error: "No file provided" },
      { status: 400 }
    );
  }

  // Validate file type and size
  const validation = validateFile(file);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.statusCode }
    );
  }

  // Upload to Supabase Storage
  const { filePath, error: uploadError } = await uploadToStorage(
    supabase,
    user.id,
    file
  );

  if (uploadError) {
    console.error("[UPLOAD] Storage upload failed:", uploadError);
    return NextResponse.json(
      { error: "Upload failed. Please try again or contact support." },
      { status: 500 }
    );
  }

  // Create report record in database
  const { data: report, error: dbError } = await supabase
    .from("reports")
    .insert({
      user_id: user.id,
      file_path: filePath,
      file_type: getFileType(file),
      original_filename: file.name,
      status: "uploaded",
    })
    .select("id, status")
    .single();

  if (dbError) {
    // Clean up uploaded file on DB failure
    await supabase.storage.from("medical-reports").remove([filePath]);
    return NextResponse.json(
      { error: "Failed to create report record" },
      { status: 500 }
    );
  }

  // Audit log: file upload (fire-and-forget)
  logAuditEvent({
    userId: user.id,
    action: "report.upload",
    resourceType: "report",
    resourceId: report.id,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(
    { report_id: report.id, status: report.status },
    { status: 201 }
  );
}
