"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Appointment {
  id: string;
  title: string;
  provider_name: string | null;
  appointment_type: string;
  date_time: string;
}

function formatShortDate(dateTime: string): string {
  const date = new Date(dateTime);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getUrgencyDot(dateTime: string): string {
  const now = new Date();
  const apptDate = new Date(dateTime);
  const diffMs = apptDate.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 1) return "db-appointments__dot--today";
  if (diffDays < 7) return "db-appointments__dot--week";
  return "db-appointments__dot--later";
}

interface UpcomingAppointmentsProps {
  activeProfileId: string | null;
}

export function UpcomingAppointments({ activeProfileId }: UpcomingAppointmentsProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = activeProfileId
      ? `/api/appointments?family_member_id=${activeProfileId}`
      : "/api/appointments";

    fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.appointments) {
          const now = new Date();
          const upcoming = data.appointments
            .filter(
              (a: Appointment) => new Date(a.date_time) >= now
            )
            .slice(0, 3);
          setAppointments(upcoming);
        }
      })
      .catch(() => {
        /* non-critical */
      })
      .finally(() => setLoading(false));
  }, [activeProfileId]);

  return (
    <div className="db-card db-appointments">
      <div className="db-appointments__header">
        <h3 className="db-appointments__title">Upcoming Appointments</h3>
        <Link href="/appointments" className="db-appointments__view-all">
          View All
        </Link>
      </div>

      {loading ? (
        <p className="db-appointments__loading">Loading...</p>
      ) : appointments.length === 0 ? (
        <div className="db-appointments__empty">
          <p>No upcoming appointments</p>
          <Link href="/appointments/add" className="db-appointments__add-link">
            + Schedule one
          </Link>
        </div>
      ) : (
        <ul className="db-appointments__list">
          {appointments.map((appt) => (
            <li key={appt.id} className="db-appointments__item">
              <span
                className={`db-appointments__dot ${getUrgencyDot(appt.date_time)}`}
              />
              <div className="db-appointments__item-info">
                <span className="db-appointments__item-title">
                  {appt.title}
                </span>
                {appt.provider_name && (
                  <span className="db-appointments__item-provider">
                    {appt.provider_name}
                  </span>
                )}
              </div>
              <span className="db-appointments__item-date">
                {formatShortDate(appt.date_time)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
