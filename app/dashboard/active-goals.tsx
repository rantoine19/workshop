"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface StandardGoalMeta {
  id: string;
  title: string;
  description: string;
  targetBiomarker: string;
  targetValue: number;
  direction: "lower" | "higher";
  unit: string;
  emoji: string;
}

interface GoalRow {
  id: string;
  goal_id: string;
  status: "active" | "achieved" | "paused";
  achieved_at: string | null;
  starting_value: number | null;
  current_value: number | null;
  progress: number;
  goal: StandardGoalMeta;
}

function progressColorClass(pct: number, achieved: boolean): string {
  if (achieved) return "goal-card__progress-bar--achieved";
  if (pct >= 75) return "goal-card__progress-bar--near";
  if (pct >= 40) return "goal-card__progress-bar--mid";
  return "goal-card__progress-bar--far";
}

export function ActiveGoals() {
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchGoals() {
      try {
        const res = await fetch("/api/goals");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setGoals(data.goals ?? []);
        }
      } catch {
        // Silent fail — dashboard card is non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchGoals();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="db-card db-goals">
        <h3 className="db-card__title">Health Goals</h3>
        <div className="db-card__skeleton" />
      </div>
    );
  }

  const active = goals.filter((g) => g.status === "active");
  const recentlyAchieved = goals.filter((g) => {
    if (g.status !== "achieved" || !g.achieved_at) return false;
    const achievedAt = new Date(g.achieved_at).getTime();
    return Date.now() - achievedAt < 1000 * 60 * 60 * 24 * 30; // 30 days
  });

  if (active.length === 0 && recentlyAchieved.length === 0) {
    return (
      <div className="db-card db-goals">
        <h3 className="db-card__title">Health Goals</h3>
        <p className="db-card__empty">Set a goal to track your progress</p>
        <Link href="/goals" className="db-card__link">
          Browse goals &rarr;
        </Link>
      </div>
    );
  }

  const visible = active.slice(0, 3);

  return (
    <div className="db-card db-goals">
      <h3 className="db-card__title">Health Goals</h3>
      {recentlyAchieved.length > 0 && (
        <p className="db-goals__celebration">
          Congrats — you achieved {recentlyAchieved.length} goal
          {recentlyAchieved.length === 1 ? "" : "s"}!
        </p>
      )}
      <ul className="db-goals__list">
        {visible.map((g) => {
          const target = `${g.goal.direction === "lower" ? "<" : ">"}${g.goal.targetValue}`;
          const currentText =
            g.current_value !== null
              ? `${g.current_value}${g.goal.unit ? " " + g.goal.unit : ""}`
              : "no data yet";
          return (
            <li key={g.id} className="db-goals__item">
              <span className="db-goals__emoji" aria-hidden="true">
                {g.goal.emoji}
              </span>
              <div className="db-goals__info">
                <span className="db-goals__title">{g.goal.title}</span>
                <div className="goal-card__progress-wrap">
                  <div className="goal-card__progress-bar-track">
                    <div
                      className={`goal-card__progress-bar ${progressColorClass(g.progress, false)}`}
                      style={{ width: `${g.progress}%` }}
                      aria-hidden="true"
                    />
                  </div>
                  <span className="goal-card__progress-text">
                    {g.progress}%
                  </span>
                </div>
                <span className="db-goals__values">
                  {currentText} &middot; target {target}
                  {g.goal.unit ? " " + g.goal.unit : ""}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <Link href="/goals" className="db-card__link">
        View All Goals &rarr;
      </Link>
    </div>
  );
}
