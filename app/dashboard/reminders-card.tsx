"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Reminder } from "@/lib/health/reminders";

const DISMISSED_KEY = "healthchat_dismissed_reminders";

function getDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>): void {
  try {
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
  } catch {
    /* non-critical */
  }
}

export function RemindersCard() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setDismissed(getDismissed());

    fetch("/api/reminders")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.reminders) {
          setReminders(data.reminders);
        }
      })
      .catch(() => {
        /* non-critical */
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDismiss = (id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveDismissed(next);
      return next;
    });
  };

  const visible = reminders.filter((r) => !dismissed.has(r.id));

  // Don't render anything if no reminders or all dismissed
  if (loading || visible.length === 0) {
    return null;
  }

  return (
    <div className="db-card db-reminders">
      <div className="db-reminders__header">
        <h3 className="db-reminders__title">Reminders</h3>
        <Link href="/profile#reminders" className="db-reminders__settings">
          Settings
        </Link>
      </div>

      <ul className="db-reminders__list">
        {visible.map((reminder) => (
          <li
            key={reminder.id}
            className={`db-reminders__item db-reminders__item--${reminder.priority}`}
          >
            <span className="db-reminders__icon" aria-hidden="true">
              {reminder.icon}
            </span>
            <div className="db-reminders__content">
              <span className="db-reminders__item-title">
                {reminder.title}
              </span>
              <span className="db-reminders__item-message">
                {reminder.message}
              </span>
              {reminder.actionUrl && (
                <Link
                  href={reminder.actionUrl}
                  className="db-reminders__action"
                >
                  {reminder.actionLabel || "View"}
                </Link>
              )}
            </div>
            <button
              type="button"
              className="db-reminders__dismiss"
              onClick={() => handleDismiss(reminder.id)}
              aria-label={`Dismiss: ${reminder.title}`}
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
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
