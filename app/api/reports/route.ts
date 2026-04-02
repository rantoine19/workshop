import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch user's reports (RLS enforces ownership)
  const { data: reports, error } = await supabase
    .from("reports")
    .select("id, original_filename, file_type, status, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

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
