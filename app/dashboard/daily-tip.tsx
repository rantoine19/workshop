"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  selectDailyTip,
  type DailyTip as DailyTipModel,
  type UserContext,
} from "@/lib/health/daily-tips";

/**
 * The shape of interaction state returned by /api/tips/interactions (GET).
 */
interface InteractionState {
  favorites: string[];
  dismissed: string[];
  completedToday: string[];
  streak: number;
}

interface ProfilePayload {
  date_of_birth?: string | null;
  gender?: string | null;
  known_conditions?: string[] | null;
  smoking_status?: string | null;
  activity_level?: string | null;
  sleep_hours?: string | null;
}

interface DailyTipProps {
  concerns: Array<{ name: string; flag: string }>;
}

function ageFromDob(dob: string | null | undefined): number | undefined {
  if (!dob) return undefined;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

export function DailyTip({ concerns }: DailyTipProps) {
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [interactions, setInteractions] = useState<InteractionState>({
    favorites: [],
    dismissed: [],
    completedToday: [],
    streak: 0,
  });
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  // Fetch profile + interaction state on mount.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [profileRes, intRes] = await Promise.all([
        fetch("/api/profile").catch(() => null),
        fetch("/api/tips/interactions").catch(() => null),
      ]);

      if (!cancelled && profileRes?.ok) {
        try {
          const json = await profileRes.json();
          setProfile(json.profile ?? null);
        } catch {
          /* ignore */
        }
      }
      if (!cancelled && intRes?.ok) {
        try {
          const json = await intRes.json();
          setInteractions({
            favorites: json.favorites ?? [],
            dismissed: json.dismissed ?? [],
            completedToday: json.completedToday ?? [],
            streak: json.streak ?? 0,
          });
        } catch {
          /* ignore */
        }
      }
    }
    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  // Build user context for personalization.
  const userContext: UserContext = useMemo(() => {
    return {
      concerns,
      conditions: profile?.known_conditions ?? [],
      age: ageFromDob(profile?.date_of_birth ?? null),
      gender: (profile?.gender === "male" || profile?.gender === "female")
        ? profile.gender
        : undefined,
      activityLevel: profile?.activity_level ?? undefined,
      smokingStatus: profile?.smoking_status ?? undefined,
      sleepHours: profile?.sleep_hours ?? undefined,
      dismissedTipIds: new Set(interactions.dismissed),
    };
  }, [concerns, profile, interactions.dismissed]);

  const selection = useMemo(
    () => selectDailyTip(userContext, offset),
    [userContext, offset]
  );

  // Record a "viewed" interaction once per tip selection.
  useEffect(() => {
    if (!selection?.tip?.id) return;
    void postInteraction(selection.tip.id, "viewed");
    // We intentionally don't await or surface errors — viewed is fire-and-forget.
  }, [selection?.tip?.id]);

  const currentTip: DailyTipModel | null = selection?.tip ?? null;
  const reasons = selection?.reasons ?? [];

  const isFavorited = currentTip
    ? interactions.favorites.includes(currentTip.id)
    : false;
  const isCompletedToday = currentTip
    ? interactions.completedToday.includes(currentTip.id)
    : false;

  const showNextTip = useCallback(() => {
    setOffset((prev) => prev + 1);
  }, []);

  const handleCompleted = useCallback(async () => {
    if (!currentTip || isCompletedToday || busy) return;
    setBusy("completed");

    // Optimistic update
    setInteractions((s) => ({
      ...s,
      completedToday: [...s.completedToday, currentTip.id],
      streak: s.streak + (s.completedToday.length === 0 ? 1 : 0),
    }));

    try {
      await postInteraction(currentTip.id, "completed");
      // Refresh streak from server (auth-checked)
      const res = await fetch("/api/tips/interactions").catch(() => null);
      if (res?.ok) {
        const json = await res.json();
        setInteractions((s) => ({
          ...s,
          streak: json.streak ?? s.streak,
          completedToday: json.completedToday ?? s.completedToday,
        }));
      }
    } finally {
      setBusy(null);
    }
  }, [currentTip, isCompletedToday, busy]);

  const handleFavorite = useCallback(async () => {
    if (!currentTip || busy) return;
    setBusy("favorite");
    const nowFavorited = !isFavorited;
    setInteractions((s) => ({
      ...s,
      favorites: nowFavorited
        ? Array.from(new Set([...s.favorites, currentTip.id]))
        : s.favorites.filter((id) => id !== currentTip.id),
    }));
    try {
      await postInteraction(
        currentTip.id,
        nowFavorited ? "favorited" : "unfavorited"
      );
    } finally {
      setBusy(null);
    }
  }, [currentTip, isFavorited, busy]);

  const handleDismiss = useCallback(async () => {
    if (!currentTip || busy) return;
    setBusy("dismiss");
    setInteractions((s) => ({
      ...s,
      dismissed: Array.from(new Set([...s.dismissed, currentTip.id])),
    }));
    try {
      await postInteraction(currentTip.id, "dismissed");
    } finally {
      setBusy(null);
    }
  }, [currentTip, busy]);

  if (!currentTip) return null;

  return (
    <div className="db-card db-daily-tip">
      <div className="db-daily-tip__header">
        <span className="db-daily-tip__emoji" aria-hidden="true">
          {currentTip.emoji}
        </span>
        <span className="db-card__title">Daily Health Tip</span>
        {interactions.streak >= 2 && (
          <span
            className="daily-tip__streak"
            title={`${interactions.streak}-day tip streak`}
          >
            <span aria-hidden="true">🔥</span>
            {interactions.streak}-day streak
          </span>
        )}
      </div>

      <p className="db-daily-tip__text">&ldquo;{currentTip.text}&rdquo;</p>

      {reasons.length > 0 && (
        <p className="daily-tip__hint">{reasons[0]}</p>
      )}

      <div className="daily-tip__actions">
        <button
          type="button"
          className={`daily-tip__action-btn${isCompletedToday ? " daily-tip__action-btn--active" : ""}`}
          onClick={handleCompleted}
          disabled={isCompletedToday || busy === "completed"}
          aria-pressed={isCompletedToday}
          title={isCompletedToday ? "You've marked this complete today" : "Mark complete"}
        >
          <span aria-hidden="true">✓</span>
          {isCompletedToday ? "Done today!" : "I did this today!"}
        </button>

        <button
          type="button"
          className={`daily-tip__action-btn${isFavorited ? " daily-tip__action-btn--active" : ""}`}
          onClick={handleFavorite}
          disabled={busy === "favorite"}
          aria-pressed={isFavorited}
          title={isFavorited ? "Remove from favorites" : "Save to favorites"}
        >
          <span aria-hidden="true">{isFavorited ? "❤️" : "🤍"}</span>
          {isFavorited ? "Saved" : "Save"}
        </button>

        <button
          type="button"
          className="daily-tip__action-btn"
          onClick={handleDismiss}
          disabled={busy === "dismiss"}
          title="Don't show me this tip again"
        >
          <span aria-hidden="true">👎</span>
          Not for me
        </button>

        <button
          type="button"
          className="daily-tip__action-btn"
          onClick={showNextTip}
          title="Show me another tip"
        >
          <span aria-hidden="true">🔄</span>
          Show another
        </button>

        <Link
          href={`/chat?message=${encodeURIComponent("Tell me more about this health tip: " + currentTip.text)}`}
          className="daily-tip__action-btn daily-tip__action-btn--link"
        >
          <span aria-hidden="true">💬</span>
          Ask about this
        </Link>
      </div>

      <div className="db-daily-tip__footer">
        <Link href="/tips" className="db-card__link">
          Browse all tips &rarr;
        </Link>
      </div>
    </div>
  );
}

/**
 * Fire-and-forget POST to record an interaction.
 */
async function postInteraction(tipId: string, action: string): Promise<void> {
  try {
    await fetch("/api/tips/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tip_id: tipId, action }),
    });
  } catch {
    // Non-critical — interactions are best-effort.
  }
}
