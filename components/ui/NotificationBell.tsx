"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

interface LogEntry {
  id: string;
  reminder_type: string;
  title: string;
  body: string | null;
  url: string | null;
  sent_at: string;
  read: boolean;
}

const TYPE_ICONS: Record<string, string> = {
  daily_checkin: "☀",
  medication: "Rx",
  appointment: "Cal",
  blood_work: "Lab",
  daily_tip: "Tip",
  goal_progress: "Goal",
};

function formatTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<LogEntry[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchLog = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/log");
      if (!res.ok) return;
      const json = await res.json();
      setItems(json.notifications ?? []);
      setUnreadCount(json.unreadCount ?? 0);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchLog();
  }, [fetchLog]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) fetchLog();
  };

  const handleMarkRead = async (id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, read: true } : it))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    await fetch("/api/notifications/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  };

  const handleMarkAll = async () => {
    setItems((prev) => prev.map((it) => ({ ...it, read: true })));
    setUnreadCount(0);
    await fetch("/api/notifications/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
  };

  const handleClearAll = async () => {
    setItems([]);
    setUnreadCount(0);
    await fetch("/api/notifications/log", { method: "DELETE" });
  };

  return (
    <div className="notification-bell" ref={containerRef}>
      <button
        type="button"
        className="notification-bell__button"
        onClick={handleToggle}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={open}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notification-bell__badge" aria-hidden="true">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown" role="dialog" aria-label="Notifications">
          <div className="notification-dropdown__header">
            <h3>Notifications</h3>
            <div className="notification-dropdown__actions">
              {items.some((it) => !it.read) && (
                <button
                  type="button"
                  className="notification-dropdown__action-link"
                  onClick={handleMarkAll}
                >
                  Mark all read
                </button>
              )}
              {items.length > 0 && (
                <button
                  type="button"
                  className="notification-dropdown__action-link"
                  onClick={handleClearAll}
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="notification-dropdown__empty">
              You&apos;re all caught up.
            </div>
          ) : (
            <ul className="notification-dropdown__list">
              {items.slice(0, 10).map((item) => (
                <li
                  key={item.id}
                  className={`notification-item${
                    item.read ? "" : " notification-item--unread"
                  }`}
                >
                  <span className="notification-item__icon" aria-hidden="true">
                    {TYPE_ICONS[item.reminder_type] || "•"}
                  </span>
                  <div className="notification-item__body">
                    <div className="notification-item__title">{item.title}</div>
                    {item.body && (
                      <div className="notification-item__text">{item.body}</div>
                    )}
                    <div className="notification-item__meta">
                      <span>{formatTime(item.sent_at)}</span>
                      {!item.read && (
                        <button
                          type="button"
                          className="notification-item__read-btn"
                          onClick={() => handleMarkRead(item.id)}
                        >
                          Mark read
                        </button>
                      )}
                      {item.url && (
                        <Link
                          href={item.url}
                          className="notification-item__link"
                          onClick={() => setOpen(false)}
                        >
                          Open
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="notification-dropdown__footer">
            <Link
              href="/settings/notifications"
              className="notification-dropdown__settings-link"
              onClick={() => setOpen(false)}
            >
              Notification Settings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
