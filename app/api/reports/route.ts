import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse optional family_member_id query param
  const { searchParams } = new URL(request.url);
  const familyMemberId = searchParams.get("family_member_id");

  // Fetch user's reports (RLS enforces ownership), filtered by family member
  let query = supabase
    .from("reports")
    .select("id, original_filename, file_type, status, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  if (familyMemberId) {
    query = query.eq("family_member_id", familyMemberId);
  } else {
    query = query.is("family_member_id", null);
  }

  const { data: reports, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }

  // Map original_filename → file_name for UI compatibility
  const mapped = (reports ?? []).map((r) => ({
    id: r.id,
    file_name: r.original_filename,
    file_type: r.file_type,
    status: r.status,
    created_at: r.created_at,
  }));

  return NextResponse.json({ reports: mapped }, { status: 200 });
}
