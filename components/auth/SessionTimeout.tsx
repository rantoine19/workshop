"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

/**
 * HIPAA-compliant automatic session timeout.
 *
 * Monitors user activity (mouse, keyboard, touch, scroll) and logs out
 * after a period of inactivity. Shows a warning dialog before logout
 * so the user can extend their session.
 *
 * Defaults: 15 minutes idle → warning, 1 minute to respond → auto-logout.
 */

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes of inactivity
const WARNING_DURATION_MS = 60 * 1000; // 60 seconds to respond to warning
const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll", "mousemove"];
const ACTIVITY_THROTTLE_MS = 30_000; // Only update last activity every 30s to avoid perf issues

interface SessionTimeoutProps {
  /** Override idle timeout in ms (default: 15 minutes) */
  idleTimeoutMs?: number;
  /** Override warning duration in ms (default: 60 seconds) */
  warningDurationMs?: number;
}

export default function SessionTimeout({
  idleTimeoutMs = IDLE_TIMEOUT_MS,
  warningDurationMs = WARNING_DURATION_MS,
}: SessionTimeoutProps) {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const lastActivityRef = useRef(Date.now());
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleLogout = useCallback(async () => {
    // Clear all timers
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    // Sign out via API
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } catch {
      // Best effort — redirect regardless
    }

    // Redirect to login with timeout message
    router.push("/auth/login?reason=timeout");
  }, [router]);

  const resetIdleTimer = useCallback(() => {
    lastActivityRef.current = Date.now();

    // If warning is showing, dismiss it
    if (showWarning) {
      setShowWarning(false);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    }

    // Clear and restart idle timer
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    idleTimerRef.current = setTimeout(() => {
      // Show warning
      setShowWarning(true);
      setSecondsLeft(Math.round(warningDurationMs / 1000));

      // Start countdown
      countdownRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Auto-logout after warning duration
      warningTimerRef.current = setTimeout(() => {
        handleLogout();
      }, warningDurationMs);
    }, idleTimeoutMs);
  }, [idleTimeoutMs, warningDurationMs, showWarning, handleLogout]);

  const handleStayLoggedIn = useCallback(() => {
    setShowWarning(false);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    resetIdleTimer();
  }, [resetIdleTimer]);

  useEffect(() => {
    // Throttled activity handler
    let lastUpdate = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastUpdate > ACTIVITY_THROTTLE_MS) {
        lastUpdate = now;
        resetIdleTimer();
      }
    };

    // Register activity listeners
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Start initial timer
    resetIdleTimer();

    return () => {
      // Cleanup
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!showWarning) return null;

  return (
    <div className="session-timeout" role="alertdialog" aria-modal="true" aria-label="Session timeout warning">
      <div className="session-timeout__backdrop" />
      <div className="session-timeout__dialog">
        <div className="session-timeout__icon" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <h2 className="session-timeout__heading">Session Expiring</h2>
        <p className="session-timeout__text">
          For your security, you&apos;ll be logged out in{" "}
          <strong>{secondsLeft} second{secondsLeft !== 1 ? "s" : ""}</strong>{" "}
          due to inactivity.
        </p>
        <div className="session-timeout__actions">
          <button
            className="session-timeout__stay-btn"
            onClick={handleStayLoggedIn}
            autoFocus
          >
            Stay Logged In
          </button>
          <button
            className="session-timeout__logout-btn"
            onClick={handleLogout}
          >
            Log Out Now
          </button>
        </div>
      </div>
    </div>
  );
}
