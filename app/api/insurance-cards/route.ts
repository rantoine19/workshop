import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logAuditEvent, getClientIp } from "@/lib/audit/logger";

const MAX_TEXT_LENGTH = 500;
const MAX_NOTES_LENGTH = 2000;

function sanitizeText(
  value: unknown,
  maxLength = MAX_TEXT_LENGTH
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function sanitizeDate(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  // Expect YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const familyMemberId = searchParams.get("family_member_id");

  let query = supabase
    .from("insurance_cards")
    .select("*")
    .eq("user_id", user.id);

  if (familyMemberId) {
    query = query.eq("family_member_id", familyMemberId);
  } else {
    query = query.is("family_member_id", null);
  }

  const { data: insurance_cards, error } = await query
    .order("is_primary", { ascending: false })
    .order("provider_name", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Failed to load insurance cards" },
      { status: 500 }
    );
  }

  return NextResponse.json({ insurance_cards });
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const providerName = sanitizeText(body.provider_name);
  if (!providerName) {
    return NextResponse.json(
      { error: "Provider name is required" },
      { status: 400 }
    );
  }

  let familyMemberId: string | null = null;
  if (typeof body.family_member_id === "string" && body.family_member_id) {
    // Verify the family member belongs to this user
    const { data: fm } = await supabase
      .from("family_members")
      .select("id")
      .eq("id", body.family_member_id)
      .eq("owner_id", user.id)
      .single();
    if (!fm) {
      return NextResponse.json(
        { error: "Invalid family member" },
        { status: 400 }
      );
    }
    familyMemberId = fm.id;
  }

  const { data: insurance_card, error } = await supabase
    .from("insurance_cards")
    .insert({
      user_id: user.id,
      family_member_id: familyMemberId,
      provider_name: providerName,
      plan_type: sanitizeText(body.plan_type),
      member_id: sanitizeText(body.member_id),
      group_number: sanitizeText(body.group_number),
      rx_bin: sanitizeText(body.rx_bin),
      rx_pcn: sanitizeText(body.rx_pcn),
      rx_group: sanitizeText(body.rx_group),
      policy_holder_name: sanitizeText(body.policy_holder_name),
      effective_date: sanitizeDate(body.effective_date),
      customer_service_phone: sanitizeText(body.customer_service_phone),
      notes: sanitizeText(body.notes, MAX_NOTES_LENGTH),
      is_primary: body.is_primary === undefined ? true : Boolean(body.is_primary),
    })
    .select()
    .single();

  if (error || !insurance_card) {
    return NextResponse.json(
      { error: "Failed to create insurance card" },
      { status: 500 }
    );
  }

  logAuditEvent({
    userId: user.id,
    action: "insurance_card.create",
    resourceType: "insurance_card",
    resourceId: insurance_card.id,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ insurance_card }, { status: 201 });
}
