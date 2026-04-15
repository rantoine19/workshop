"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import NavHeader from "@/components/ui/NavHeader";

interface FamilyMember {
  id: string;
  display_name: string;
}

const TYPE_OPTIONS = [
  { value: "doctor", label: "Doctor" },
  { value: "dentist", label: "Dentist" },
  { value: "specialist", label: "Specialist" },
  { value: "lab_work", label: "Lab Work" },
  { value: "eye_exam", label: "Eye Exam" },
  { value: "therapy", label: "Therapy" },
  { value: "other", label: "Other" },
];

const DURATION_OPTIONS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
];

const RECURRING_OPTIONS = [
  { value: "", label: "None" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "every_3_months", label: "Every 3 months" },
  { value: "every_6_months", label: "Every 6 months" },
  { value: "yearly", label: "Yearly" },
];

export default function AddAppointmentPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [appointmentType, setAppointmentType] = useState("doctor");
  const [providerName, setProviderName] = useState("");
  const [providerLocation, setProviderLocation] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [familyMemberId, setFamilyMemberId] = useState("");
  const [reminder1day, setReminder1day] = useState(true);
  const [reminder1hour, setReminder1hour] = useState(true);
  const [recurring, setRecurring] = useState("");
  const [notes, setNotes] = useState("");
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/family-members")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.members) setFamilyMembers(data.members);
      })
      .catch(() => {
        /* non-critical */
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!dateTime) {
      setError("Date and time are required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          appointment_type: appointmentType,
          provider_name: providerName.trim() || null,
          provider_location: providerLocation.trim() || null,
          date_time: new Date(dateTime).toISOString(),
          duration_minutes: durationMinutes,
          family_member_id: familyMemberId || null,
          reminder_1day: reminder1day,
          reminder_1hour: reminder1hour,
          recurring: recurring || null,
          notes: notes.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create appointment");
      }

      router.push("/appointments");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create appointment"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="appointments-page">
      <div className="appointments-page__header">
        <NavHeader backHref="/appointments" backLabel="Appointments" />
        <h1>Add Appointment</h1>
      </div>

      {error && (
        <div className="appointments-page__error" role="alert">
          {error}
          <button
            onClick={() => setError(null)}
            className="appointments-page__dismiss"
          >
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="appointment-form">
        <div className="appointment-form__field">
          <label htmlFor="appt-title">
            Title <span className="appointment-form__required">*</span>
          </label>
          <input
            id="appt-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Doctor Visit, Dental Checkup"
            maxLength={200}
            required
          />
        </div>

        <div className="appointment-form__row">
          <div className="appointment-form__field">
            <label htmlFor="appt-type">
              Appointment Type <span className="appointment-form__required">*</span>
            </label>
            <select
              id="appt-type"
              value={appointmentType}
              onChange={(e) => setAppointmentType(e.target.value)}
              required
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="appointment-form__field">
            <label htmlFor="appt-duration">Duration</label>
            <select
              id="appt-duration"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="appointment-form__field">
          <label htmlFor="appt-provider">Provider Name</label>
          <input
            id="appt-provider"
            type="text"
            value={providerName}
            onChange={(e) => setProviderName(e.target.value)}
            placeholder="e.g., Dr. Smith"
            maxLength={200}
          />
        </div>

        <div className="appointment-form__field">
          <label htmlFor="appt-location">Location</label>
          <input
            id="appt-location"
            type="text"
            value={providerLocation}
            onChange={(e) => setProviderLocation(e.target.value)}
            placeholder="e.g., 123 Medical Blvd, Suite 200"
            maxLength={500}
          />
        </div>

        <div className="appointment-form__field">
          <label htmlFor="appt-datetime">
            Date &amp; Time <span className="appointment-form__required">*</span>
          </label>
          <input
            id="appt-datetime"
            type="datetime-local"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            required
          />
        </div>

        {familyMembers.length > 0 && (
          <div className="appointment-form__field">
            <label htmlFor="appt-family">For</label>
            <select
              id="appt-family"
              value={familyMemberId}
              onChange={(e) => setFamilyMemberId(e.target.value)}
            >
              <option value="">Myself</option>
              {familyMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="appointment-form__field">
          <label>Reminders</label>
          <div className="appointment-form__checkboxes">
            <label className="appointment-form__checkbox-label">
              <input
                type="checkbox"
                checked={reminder1day}
                onChange={(e) => setReminder1day(e.target.checked)}
              />
              1 day before
            </label>
            <label className="appointment-form__checkbox-label">
              <input
                type="checkbox"
                checked={reminder1hour}
                onChange={(e) => setReminder1hour(e.target.checked)}
              />
              1 hour before
            </label>
          </div>
        </div>

        <div className="appointment-form__field">
          <label htmlFor="appt-recurring">Recurring</label>
          <select
            id="appt-recurring"
            value={recurring}
            onChange={(e) => setRecurring(e.target.value)}
          >
            {RECURRING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="appointment-form__field">
          <label htmlFor="appt-notes">Notes</label>
          <textarea
            id="appt-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes or questions for your provider..."
            maxLength={2000}
            rows={3}
          />
        </div>

        <div className="appointment-form__actions">
          <button
            type="button"
            onClick={() => router.push("/appointments")}
            className="appointment-form__cancel"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="appointment-form__submit"
            disabled={saving}
          >
            {saving ? "Saving..." : "Add Appointment"}
          </button>
        </div>
      </form>
    </div>
  );
}
