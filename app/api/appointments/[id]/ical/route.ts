import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Format a Date to iCal DTSTART/DTEND format: YYYYMMDDTHHmmssZ
 */
function toICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Escape special characters for iCal text fields.
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * GET /api/appointments/[id]/ical
 * Generate an .ics file for a single appointment.
 */
export async function GET(
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

  const { data: appointment, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !appointment) {
    return NextResponse.json(
      { error: "Appointment not found" },
      { status: 404 }
    );
  }

  const startDate = new Date(appointment.date_time);
  const endDate = new Date(
    startDate.getTime() + (appointment.duration_minutes || 30) * 60 * 1000
  );

  const summary = appointment.provider_name
    ? `${appointment.title} - ${appointment.provider_name}`
    : appointment.title;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HealthChat AI//Appointments//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${appointment.id}@healthchat.ai`,
    `DTSTART:${toICalDate(startDate)}`,
    `DTEND:${toICalDate(endDate)}`,
    `SUMMARY:${escapeICalText(summary)}`,
  ];

  if (appointment.provider_location) {
    lines.push(`LOCATION:${escapeICalText(appointment.provider_location)}`);
  }

  if (appointment.notes) {
    lines.push(
      `DESCRIPTION:${escapeICalText(appointment.notes)}`
    );
  }

  // Add reminders based on user preferences
  if (appointment.reminder_1day) {
    lines.push(
      "BEGIN:VALARM",
      "TRIGGER:-P1D",
      "ACTION:DISPLAY",
      "DESCRIPTION:Appointment tomorrow",
      "END:VALARM"
    );
  }

  if (appointment.reminder_1hour) {
    lines.push(
      "BEGIN:VALARM",
      "TRIGGER:-PT1H",
      "ACTION:DISPLAY",
      "DESCRIPTION:Appointment in 1 hour",
      "END:VALARM"
    );
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  const icsContent = lines.join("\r\n");
  const fileName = `appointment-${appointment.id}.ics`;

  return new Response(icsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
