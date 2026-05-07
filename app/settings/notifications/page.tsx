"use client";

import { useCallback, useEffect, useState } from "react";
import NavHeader from "@/components/ui/NavHeader";
import { useNotificationPermission } from "@/hooks/useNotificationPermission";

interface Preferences {
  notifications_enabled: boolean;
  daily_checkin_enabled: boolean;
  daily_checkin_frequency: string;
  medication_reminders_enabled: boolean;
  medication_reminder_minutes_before: number;
  appointment_reminders_enabled: boolean;
  blood_work_reminders_enabled: boolean;
  blood_work_interval_months: number;
  goal_progress_enabled: boolean;
  goal_progress_frequency: string;
  daily_tip_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
}

const DEFAULTS: Preferences = {
  notifications_enabled: true,
  daily_checkin_enabled: true,
  daily_checkin_frequency: "daily",
  medication_reminders_enabled: true,
  medication_reminder_minutes_before: 0,
  appointment_reminders_enabled: true,
  blood_work_reminders_enabled: true,
  blood_work_interval_months: 6,
  goal_progress_enabled: true,
  goal_progress_frequency: "weekly",
  daily_tip_enabled: false,
  quiet_hours_start: "21:00",
  quiet_hours_end: "08:00",
  timezone: "America/New_York",
};

export default function NotificationsSettingsPage() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    permission,
    isSupported,
    requestPermission,
    subscribeToPush,
  } = useNotificationPermission();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/preferences");
      if (!res.ok) throw new Error("Failed to load preferences");
      const json = await res.json();
      if (json.preferences) {
        setPrefs({ ...DEFAULTS, ...json.preferences });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load preferences");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateField = <K extends keyof Preferences>(
    key: K,
    value: Preferences[K]
  ) => {
    setPrefs((p) => ({ ...p, [key]: value }));
  };

  const handleEnableBrowserNotifications = async () => {
    setError(null);
    if (!isSupported) {
      setError("Your browser does not support notifications.");
      return;
    }
    const result = await requestPermission();
    if (result === "granted") {
      await subscribeToPush();
    } else if (result === "denied") {
      setError(
        "Notifications were blocked. You can re-enable them in your browser settings."
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to save");
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="notifications-page notifications-page--loading">
        <NavHeader backLabel="Dashboard" />
        <p>Loading your notification preferences...</p>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <div className="notifications-page__header">
        <NavHeader backLabel="Dashboard" />
        <h1>Notification Settings</h1>
        <p>
          Get gentle reminders that help you stay on top of your health. You
          control everything — toggle individual reminders, set quiet hours,
          or turn them all off.
        </p>
      </div>

      {error && (
        <div className="notifications-page__error" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="notifications-page__success" role="status">
          Preferences saved.
        </div>
      )}

      {isSupported && permission !== "granted" && (
        <div className="notification-section notification-section--permission">
          <h2>Browser Notifications</h2>
          <p>
            Allow your browser to show notifications so reminders reach you
            even when this tab is in the background.
          </p>
          <button
            type="button"
            className="notification-section__primary-btn"
            onClick={handleEnableBrowserNotifications}
            disabled={permission === "denied"}
          >
            {permission === "denied"
              ? "Notifications blocked — enable in browser settings"
              : "Allow Browser Notifications"}
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="notifications-page__form">
        {/* Master toggle */}
        <div className="notification-section">
          <label className="notification-section__toggle">
            <input
              type="checkbox"
              checked={prefs.notifications_enabled}
              onChange={(e) =>
                updateField("notifications_enabled", e.target.checked)
              }
            />
            <span>
              <strong>Enable notifications</strong>
              <small>Master switch for all reminders.</small>
            </span>
          </label>
        </div>

        {/* Daily check-in */}
        <div className="notification-section">
          <label className="notification-section__toggle">
            <input
              type="checkbox"
              checked={prefs.daily_checkin_enabled}
              onChange={(e) =>
                updateField("daily_checkin_enabled", e.target.checked)
              }
              disabled={!prefs.notifications_enabled}
            />
            <span>
              <strong>Daily Check-in</strong>
              <small>A gentle nudge to log how you&apos;re feeling.</small>
            </span>
          </label>
          {prefs.daily_checkin_enabled && (
            <div className="notification-section__field">
              <label htmlFor="checkin-freq">Frequency</label>
              <select
                id="checkin-freq"
                value={prefs.daily_checkin_frequency}
                onChange={(e) =>
                  updateField("daily_checkin_frequency", e.target.value)
                }
                disabled={!prefs.notifications_enabled}
              >
                <option value="daily">Daily</option>
                <option value="twice_daily">Twice daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          )}
        </div>

        {/* Medications */}
        <div className="notification-section">
          <label className="notification-section__toggle">
            <input
              type="checkbox"
              checked={prefs.medication_reminders_enabled}
              onChange={(e) =>
                updateField("medication_reminders_enabled", e.target.checked)
              }
              disabled={!prefs.notifications_enabled}
            />
            <span>
              <strong>Medication Reminders</strong>
              <small>Reminders matched to your medication schedule.</small>
            </span>
          </label>
          {prefs.medication_reminders_enabled && (
            <div className="notification-section__field">
              <label htmlFor="med-minutes">Remind me before</label>
              <select
                id="med-minutes"
                value={prefs.medication_reminder_minutes_before}
                onChange={(e) =>
                  updateField(
                    "medication_reminder_minutes_before",
                    Number(e.target.value)
                  )
                }
                disabled={!prefs.notifications_enabled}
              >
                <option value={0}>At scheduled time</option>
                <option value={15}>15 minutes before</option>
                <option value={30}>30 minutes before</option>
                <option value={60}>1 hour before</option>
              </select>
            </div>
          )}
        </div>

        {/* Appointments */}
        <div className="notification-section">
          <label className="notification-section__toggle">
            <input
              type="checkbox"
              checked={prefs.appointment_reminders_enabled}
              onChange={(e) =>
                updateField("appointment_reminders_enabled", e.target.checked)
              }
              disabled={!prefs.notifications_enabled}
            />
            <span>
              <strong>Appointment Reminders</strong>
              <small>1 day and 1 hour before each appointment.</small>
            </span>
          </label>
        </div>

        {/* Blood work */}
        <div className="notification-section">
          <label className="notification-section__toggle">
            <input
              type="checkbox"
              checked={prefs.blood_work_reminders_enabled}
              onChange={(e) =>
                updateField("blood_work_reminders_enabled", e.target.checked)
              }
              disabled={!prefs.notifications_enabled}
            />
            <span>
              <strong>Blood Work Reminders</strong>
              <small>
                Get reminded when it&apos;s time for routine lab work.
              </small>
            </span>
          </label>
          {prefs.blood_work_reminders_enabled && (
            <div className="notification-section__field">
              <label htmlFor="blood-interval">Remind me every</label>
              <select
                id="blood-interval"
                value={prefs.blood_work_interval_months}
                onChange={(e) =>
                  updateField(
                    "blood_work_interval_months",
                    Number(e.target.value)
                  )
                }
                disabled={!prefs.notifications_enabled}
              >
                <option value={3}>3 months</option>
                <option value={6}>6 months (recommended)</option>
                <option value={12}>12 months</option>
              </select>
            </div>
          )}
        </div>

        {/* Goal progress */}
        <div className="notification-section">
          <label className="notification-section__toggle">
            <input
              type="checkbox"
              checked={prefs.goal_progress_enabled}
              onChange={(e) =>
                updateField("goal_progress_enabled", e.target.checked)
              }
              disabled={!prefs.notifications_enabled}
            />
            <span>
              <strong>Goal Progress</strong>
              <small>A summary of your progress toward health goals.</small>
            </span>
          </label>
          {prefs.goal_progress_enabled && (
            <div className="notification-section__field">
              <label htmlFor="goal-freq">Frequency</label>
              <select
                id="goal-freq"
                value={prefs.goal_progress_frequency}
                onChange={(e) =>
                  updateField("goal_progress_frequency", e.target.value)
                }
                disabled={!prefs.notifications_enabled}
              >
                <option value="weekly">Weekly (Sundays)</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          )}
        </div>

        {/* Daily tip */}
        <div className="notification-section">
          <label className="notification-section__toggle">
            <input
              type="checkbox"
              checked={prefs.daily_tip_enabled}
              onChange={(e) =>
                updateField("daily_tip_enabled", e.target.checked)
              }
              disabled={!prefs.notifications_enabled}
            />
            <span>
              <strong>Daily Tip Notifications</strong>
              <small>Off by default. Daily personalized health tips.</small>
            </span>
          </label>
        </div>

        {/* Quiet hours */}
        <div className="notification-section">
          <h3>Quiet Hours</h3>
          <p className="notification-section__description">
            We won&apos;t send notifications during this time window.
          </p>
          <div className="notification-section__row">
            <div className="notification-section__field">
              <label htmlFor="quiet-start">From</label>
              <input
                id="quiet-start"
                type="time"
                value={prefs.quiet_hours_start}
                onChange={(e) =>
                  updateField("quiet_hours_start", e.target.value)
                }
                disabled={!prefs.notifications_enabled}
              />
            </div>
            <div className="notification-section__field">
              <label htmlFor="quiet-end">Until</label>
              <input
                id="quiet-end"
                type="time"
                value={prefs.quiet_hours_end}
                onChange={(e) =>
                  updateField("quiet_hours_end", e.target.value)
                }
                disabled={!prefs.notifications_enabled}
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="notifications-page__submit"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Preferences"}
        </button>

        <p className="notifications-page__hint">
          Notifications appear in your browser. You can disable them anytime
          here, or revoke browser permission entirely from your browser
          settings.
        </p>
      </form>
    </div>
  );
}
