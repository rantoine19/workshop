"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import NavHeader from "@/components/ui/NavHeader";

interface FamilyMember {
  id: string;
  display_name: string;
}

interface Appointment {
  id: string;
  title: string;
  provider_name: string | null;
  provider_location: string | null;
  appointment_type: string;
  date_time: string;
  duration_minutes: number;
  notes: string | null;
  reminder_1day: boolean;
  reminder_1hour: boolean;
  recurring: string | null;
  completed: boolean;
  family_member_id: string | null;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  doctor: "Doctor",
  dentist: "Dentist",
  specialist: "Specialist",
  lab_work: "Lab Work",
  eye_exam: "Eye Exam",
  therapy: "Therapy",
  other: "Other",
};

function AppointmentTypeIcon({ type }: { type: string }) {
  const iconProps = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (type) {
    case "doctor":
      return (
        <svg {...iconProps}>
          <path d="M4.8 2.6A2 2 0 0 1 6.8 1h10.4a2 2 0 0 1 2 1.6L20 8H4L4.8 2.6Z" />
          <path d="M12 8v8" />
          <path d="M8 12h8" />
          <circle cx="12" cy="20" r="2" />
        </svg>
      );
    case "dentist":
      return (
        <svg {...iconProps}>
          <path d="M12 2C8 2 5 5 5 8c0 2.5 1.5 4 2.5 5.5S9 16 9 19c0 1.7.8 3 2 3s1.5-1 1-3c-.3-1.2-.5-2 0-2s.3.8 0 2c-.5 2 0 3 1 3s2-1.3 2-3c0-3 .5-4 1.5-5.5S19 10.5 19 8c0-3-3-6-7-6Z" />
        </svg>
      );
    case "specialist":
      return (
        <svg {...iconProps}>
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
          <path d="M9 14h6" />
          <path d="M9 18h6" />
        </svg>
      );
    case "lab_work":
      return (
        <svg {...iconProps}>
          <path d="M9 3h6v4l4 9a2 2 0 0 1-1.8 2.9H6.8A2 2 0 0 1 5 16L9 7V3Z" />
          <path d="M9 3h6" />
        </svg>
      );
    case "eye_exam":
      return (
        <svg {...iconProps}>
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "therapy":
      return (
        <svg {...iconProps}>
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
      );
    default:
      return (
        <svg {...iconProps}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
  }
}

function getUrgencyClass(dateTime: string): string {
  const now = new Date();
  const apptDate = new Date(dateTime);
  const diffMs = apptDate.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 0) return "appointment-card--past";
  if (diffDays < 1) return "appointment-card--today";
  if (diffDays < 7) return "appointment-card--this-week";
  return "appointment-card--later";
}

function formatDateTime(dateTime: string): string {
  const date = new Date(dateTime);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRelativeDate(dateTime: string): string {
  const now = new Date();
  const apptDate = new Date(dateTime);
  const diffMs = apptDate.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "Past";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 7) return `In ${diffDays} days`;
  return "";
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);
  const [filterFamily, setFilterFamily] = useState<string>("");

  const fetchAppointments = useCallback(async () => {
    try {
      const url = filterFamily
        ? `/api/appointments?family_member_id=${filterFamily}`
        : "/api/appointments";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to load appointments");
      const data = await response.json();
      setAppointments(data.appointments || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load appointments"
      );
    } finally {
      setLoading(false);
    }
  }, [filterFamily]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

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

  const handleComplete = async (appt: Appointment) => {
    try {
      const response = await fetch(`/api/appointments/${appt.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !appt.completed }),
      });
      if (!response.ok) throw new Error("Failed to update appointment");
      await fetchAppointments();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update"
      );
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete appointment");
      setDeleteConfirm(null);
      await fetchAppointments();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete"
      );
    }
  };

  const handleCalendarExport = (id: string) => {
    window.open(`/api/appointments/${id}/ical`, "_blank");
  };

  const getFamilyMemberName = (id: string | null): string | null => {
    if (!id) return null;
    const member = familyMembers.find((m) => m.id === id);
    return member?.display_name ?? null;
  };

  const now = new Date();
  const upcoming = appointments.filter(
    (a) => !a.completed && new Date(a.date_time) >= now
  );
  const past = appointments.filter(
    (a) => a.completed || new Date(a.date_time) < now
  );

  if (loading) {
    return (
      <div className="appointments-page appointments-page--loading">
        <div
          className="appointments-page__spinner"
          aria-label="Loading appointments"
        />
        <p>Loading your appointments...</p>
      </div>
    );
  }

  return (
    <div className="appointments-page">
      <div className="appointments-page__header">
        <NavHeader backLabel="Dashboard" />
        <div className="appointments-page__title-row">
          <div>
            <h1>Appointments</h1>
            <p>Track your medical appointments and sync with your calendar.</p>
          </div>
          <Link href="/appointments/add" className="appointments-page__add-btn">
            + Add Appointment
          </Link>
        </div>
      </div>

      {familyMembers.length > 0 && (
        <div className="appointments-page__filter">
          <label htmlFor="filter-family">Filter by:</label>
          <select
            id="filter-family"
            value={filterFamily}
            onChange={(e) => {
              setFilterFamily(e.target.value);
              setLoading(true);
            }}
          >
            <option value="">All Members</option>
            {familyMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.display_name}
              </option>
            ))}
          </select>
        </div>
      )}

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

      {appointments.length === 0 ? (
        <div className="appointments-page__empty">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-gray-400)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <h2>No appointments yet</h2>
          <p>Schedule your first appointment to start tracking your visits.</p>
          <Link
            href="/appointments/add"
            className="appointments-page__add-btn"
          >
            + Add Appointment
          </Link>
        </div>
      ) : (
        <>
          {/* Upcoming Appointments */}
          <section className="appointments-page__section">
            <h2 className="appointments-page__section-title">
              Upcoming ({upcoming.length})
            </h2>
            {upcoming.length === 0 ? (
              <p className="appointments-page__section-empty">
                No upcoming appointments.
              </p>
            ) : (
              <div className="appointments-page__grid">
                {upcoming.map((appt) => (
                  <AppointmentCard
                    key={appt.id}
                    appointment={appt}
                    familyMemberName={getFamilyMemberName(
                      appt.family_member_id
                    )}
                    onComplete={() => handleComplete(appt)}
                    onDelete={() => setDeleteConfirm(appt.id)}
                    onCalendarExport={() => handleCalendarExport(appt.id)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Past / Completed */}
          {past.length > 0 && (
            <section className="appointments-page__section">
              <button
                className="appointments-page__section-toggle"
                onClick={() => setShowPast(!showPast)}
                aria-expanded={showPast}
              >
                <h2 className="appointments-page__section-title">
                  Past / Completed ({past.length})
                </h2>
                <span
                  className="appointments-page__chevron"
                  data-open={showPast}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </button>
              {showPast && (
                <div className="appointments-page__grid">
                  {past.map((appt) => (
                    <AppointmentCard
                      key={appt.id}
                      appointment={appt}
                      familyMemberName={getFamilyMemberName(
                        appt.family_member_id
                      )}
                      onComplete={() => handleComplete(appt)}
                      onDelete={() => setDeleteConfirm(appt.id)}
                      onCalendarExport={() => handleCalendarExport(appt.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div
          className="appointments-page__overlay"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="appointments-page__dialog"
            role="alertdialog"
            aria-labelledby="delete-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="delete-dialog-title">Delete Appointment?</h3>
            <p>
              This will permanently remove this appointment. This cannot be
              undone.
            </p>
            <div className="appointments-page__dialog-actions">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="appointments-page__dialog-cancel"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="appointments-page__dialog-delete"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AppointmentCard({
  appointment,
  familyMemberName,
  onComplete,
  onDelete,
  onCalendarExport,
}: {
  appointment: Appointment;
  familyMemberName: string | null;
  onComplete: () => void;
  onDelete: () => void;
  onCalendarExport: () => void;
}) {
  const relativeDate = formatRelativeDate(appointment.date_time);
  const urgencyClass = getUrgencyClass(appointment.date_time);

  return (
    <div
      className={`appointment-card ${urgencyClass}${appointment.completed ? " appointment-card--completed" : ""}`}
    >
      <div className="appointment-card__header">
        <div className="appointment-card__type-icon">
          <AppointmentTypeIcon type={appointment.appointment_type} />
        </div>
        <div className="appointment-card__info">
          <h3 className="appointment-card__title">{appointment.title}</h3>
          {appointment.provider_name && (
            <span className="appointment-card__provider">
              {appointment.provider_name}
            </span>
          )}
        </div>
        <div className="appointment-card__badges">
          {relativeDate && (
            <span className="appointment-card__urgency">{relativeDate}</span>
          )}
          {familyMemberName && (
            <span className="appointment-card__family-badge">
              {familyMemberName}
            </span>
          )}
        </div>
      </div>

      <div className="appointment-card__date">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        {formatDateTime(appointment.date_time)}
        <span className="appointment-card__duration">
          ({appointment.duration_minutes} min)
        </span>
      </div>

      {appointment.provider_location && (
        <div className="appointment-card__location">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {appointment.provider_location}
        </div>
      )}

      {appointment.notes && (
        <p className="appointment-card__notes">{appointment.notes}</p>
      )}

      {appointment.recurring && (
        <span className="appointment-card__recurring">
          Recurring: {appointment.recurring.replace(/_/g, " ")}
        </span>
      )}

      <div className="appointment-card__actions">
        <button
          onClick={onCalendarExport}
          className="appointment-card__action appointment-card__action--calendar"
          title="Add to Calendar"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Add to Calendar
        </button>
        <button
          onClick={onComplete}
          className="appointment-card__action appointment-card__action--complete"
        >
          {appointment.completed ? "Mark Upcoming" : "Mark Complete"}
        </button>
        <button
          onClick={onDelete}
          className="appointment-card__action appointment-card__action--delete"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
