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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

export async function GET(
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

  const { data: insurance_card, error } = await supabase
    .from("insurance_cards")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !insurance_card) {
    return NextResponse.json(
      { error: "Insurance card not found" },
      { status: 404 }
    );
  }

  logAuditEvent({
    userId: user.id,
    action: "insurance_card.view",
    resourceType: "insurance_card",
    resourceId: id,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ insurance_card });
}

export async function PUT(
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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.provider_name !== undefined) {
    const providerName = sanitizeText(body.provider_name);
    if (!providerName) {
      return NextResponse.json(
        { error: "Provider name cannot be empty" },
        { status: 400 }
      );
    }
    updates.provider_name = providerName;
  }

  if (body.plan_type !== undefined) updates.plan_type = sanitizeText(body.plan_type);
  if (body.member_id !== undefined) updates.member_id = sanitizeText(body.member_id);
  if (body.group_number !== undefined) updates.group_number = sanitizeText(body.group_number);
  if (body.rx_bin !== undefined) updates.rx_bin = sanitizeText(body.rx_bin);
  if (body.rx_pcn !== undefined) updates.rx_pcn = sanitizeText(body.rx_pcn);
  if (body.rx_group !== undefined) updates.rx_group = sanitizeText(body.rx_group);
  if (body.policy_holder_name !== undefined) {
    updates.policy_holder_name = sanitizeText(body.policy_holder_name);
  }
  if (body.effective_date !== undefined) {
    updates.effective_date = sanitizeDate(body.effective_date);
  }
  if (body.customer_service_phone !== undefined) {
    updates.customer_service_phone = sanitizeText(body.customer_service_phone);
  }
  if (body.notes !== undefined) {
    updates.notes = sanitizeText(body.notes, MAX_NOTES_LENGTH);
  }
  if (body.is_primary !== undefined) {
    updates.is_primary = Boolean(body.is_primary);
  }

  if (body.family_member_id !== undefined) {
    if (body.family_member_id === null || body.family_member_id === "") {
      updates.family_member_id = null;
    } else if (typeof body.family_member_id === "string") {
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
      updates.family_member_id = fm.id;
    }
  }

  const { data: insurance_card, error } = await supabase
    .from("insurance_cards")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !insurance_card) {
    return NextResponse.json(
      { error: "Insurance card not found" },
      { status: 404 }
    );
  }

  logAuditEvent({
    userId: user.id,
    action: "insurance_card.update",
    resourceType: "insurance_card",
    resourceId: id,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ insurance_card });
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

  // Fetch card to get photo paths for cleanup
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

  // Clean up photos from storage if present
  const photosToRemove: string[] = [];
  if (card.front_photo_path) photosToRemove.push(card.front_photo_path);
  if (card.back_photo_path) photosToRemove.push(card.back_photo_path);
  if (photosToRemove.length > 0) {
    await supabase.storage.from("insurance-photos").remove(photosToRemove);
  }

  const { error } = await supabase
    .from("insurance_cards")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete insurance card" },
      { status: 500 }
    );
  }

  logAuditEvent({
    userId: user.id,
    action: "insurance_card.delete",
    resourceType: "insurance_card",
    resourceId: id,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ success: true });
}
