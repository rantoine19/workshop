import { createClient } from "@/lib/supabase/server";
import { logAuditEvent, getClientIp } from "@/lib/audit/logger";
import { NextResponse } from "next/server";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: reportId } = await params;

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch report to verify ownership and get file_path for storage cleanup
  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("id, user_id, file_path")
    .eq("id", reportId)
    .single();

  if (reportError || !report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  // Verify ownership (defense-in-depth — RLS also enforces this)
  if (report.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete storage file (best-effort — don't block on storage failure)
  if (report.file_path) {
    const { error: storageError } = await supabase.storage
      .from("medical-reports")
      .remove([report.file_path]);

    if (storageError) {
      console.error(
        "[DELETE REPORT] Storage cleanup failed:",
        storageError.message
      );
    }
  }

  // Delete report record (cascades to parsed_results, risk_flags, doctor_questions)
  const { error: deleteError } = await supabase
    .from("reports")
    .delete()
    .eq("id", reportId);

  if (deleteError) {
    return NextResponse.json(
      { error: "Failed to delete report" },
      { status: 500 }
    );
  }

  // Audit log the deletion
  logAuditEvent({
    userId: user.id,
    action: "report.delete",
    resourceType: "report",
    resourceId: reportId,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(
    { message: "Report deleted successfully" },
    { status: 200 }
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: reportId } = await params;

  // Suppress unused variable warning
  void request;

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch report with parsed result ID
  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select(
      "id, user_id, original_filename, file_type, status, created_at, parsed_results(id)"
    )
    .eq("id", reportId)
    .single();

  if (reportError || !report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  // Verify ownership (defense-in-depth — RLS also enforces this)
  if (report.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Extract parsed_result_id from the joined data
  const parsedResults = report.parsed_results as
    | Array<{ id: string }>
    | { id: string }
    | null;
  const parsedResultId = Array.isArray(parsedResults)
    ? parsedResults[0]?.id ?? null
    : parsedResults?.id ?? null;

  // Audit log: report view (fire-and-forget)
  logAuditEvent({
    userId: user.id,
    action: "report.view",
    resourceType: "report",
    resourceId: report.id,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(
    {
      report: {
        id: report.id,
        file_name: report.original_filename,
        file_type: report.file_type,
        status: report.status,
        created_at: report.created_at,
        parsed_result_id: parsedResultId,
      },
    },
    { status: 200 }
  );
}
