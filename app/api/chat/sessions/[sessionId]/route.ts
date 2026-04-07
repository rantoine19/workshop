import { createClient } from "@/lib/supabase/server";
import { logAuditEvent, getClientIp } from "@/lib/audit/logger";
import { NextResponse } from "next/server";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const supabase = await createClient();
  const { sessionId } = await params;

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch session to verify ownership
  const { data: session, error: sessionError } = await supabase
    .from("chat_sessions")
    .select("id, user_id")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json(
      { error: "Chat session not found" },
      { status: 404 }
    );
  }

  // Verify ownership (defense-in-depth — RLS also enforces this)
  if (session.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete session (cascades to chat_messages)
  const { error: deleteError } = await supabase
    .from("chat_sessions")
    .delete()
    .eq("id", sessionId);

  if (deleteError) {
    return NextResponse.json(
      { error: "Failed to delete chat session" },
      { status: 500 }
    );
  }

  // Audit log the deletion
  logAuditEvent({
    userId: user.id,
    action: "chat.delete",
    resourceType: "chat_session",
    resourceId: sessionId,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(
    { message: "Chat session deleted successfully" },
    { status: 200 }
  );
}
