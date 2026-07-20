"use client";

import { useEffect, useState } from "react";

interface AchievedGoal {
  id: string;
  goal_id: string;
  achieved_at: string | null;
  goal: {
    title: string;
    emoji: string;
  };
}

const DISMISSED_STORAGE_KEY = "hc.dismissedGoalBanners";

function loadDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(DISMISSED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed);
  } catch {
    // Ignore corrupt storage
  }
  return new Set();
}

function saveDismissed(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      DISMISSED_STORAGE_KEY,
      JSON.stringify(Array.from(ids))
    );
  } catch {
    // Ignore quota / disabled storage
  }
}

export function GoalAchievementBanner() {
  const [pending, setPending] = useState<AchievedGoal[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    setDismissed(loadDismissed());
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchGoals() {
      try {
        const res = await fetch("/api/goals");
        if (!res.ok) return;
        const data = await res.json();
        const achieved: AchievedGoal[] = (data.goals ?? []).filter(
          (g: { status: string; achieved_at: string | null }) =>
            g.status === "achieved" && g.achieved_at
        );
        if (!cancelled) setPending(achieved);
      } catch {
        // Silent fail — banner is non-critical
      }
    }
    fetchGoals();
    return () => {
      cancelled = true;
    };
  }, []);

  const showable = pending.filter((g) => !dismissed.has(g.id));
  if (showable.length === 0) return null;

  const dismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    saveDismissed(next);
  };

  return (
    <div className="goal-achievement-banner-list">
      {showable.map((g) => (
        <div
          key={g.id}
          className="goal-achievement-banner"
          role="status"
        >
          <span className="goal-achievement-banner__emoji" aria-hidden="true">
            🎉
          </span>
          <span className="goal-achievement-banner__text">
            You achieved: {g.goal.emoji} {g.goal.title}!
          </span>
          <button
            type="button"
            className="goal-achievement-banner__dismiss"
            onClick={() => dismiss(g.id)}
            aria-label="Dismiss celebration"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
