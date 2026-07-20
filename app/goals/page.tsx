"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import NavHeader from "@/components/ui/NavHeader";
import { STANDARD_GOALS } from "@/lib/health/standard-goals";

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
  activated_at: string;
  achieved_at: string | null;
  starting_value: number | null;
  current_value: number | null;
  progress: number;
  goal: StandardGoalMeta;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function progressColorClass(pct: number, achieved: boolean): string {
  if (achieved) return "goal-card__progress-bar--achieved";
  if (pct >= 75) return "goal-card__progress-bar--near";
  if (pct >= 40) return "goal-card__progress-bar--mid";
  return "goal-card__progress-bar--far";
}

function targetText(goal: StandardGoalMeta): string {
  const sign = goal.direction === "lower" ? "<" : ">";
  const unit = goal.unit ? " " + goal.unit : "";
  return `${sign}${goal.targetValue}${unit}`;
}

function currentText(goal: StandardGoalMeta, value: number | null): string {
  if (value === null) return "No data yet";
  const unit = goal.unit ? " " + goal.unit : "";
  return `${value}${unit}`;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch("/api/goals");
      if (!res.ok) throw new Error("Failed to load goals");
      const data = await res.json();
      setGoals(data.goals ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load goals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const activatedIds = useMemo(
    () => new Set(goals.map((g) => g.goal_id)),
    [goals]
  );
  const active = goals.filter((g) => g.status === "active");
  const achieved = goals.filter((g) => g.status === "achieved");
  const available = STANDARD_GOALS.filter((g) => !activatedIds.has(g.id));

  const activate = async (goalId: string) => {
    setBusyId(goalId);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal_id: goalId }),
      });
      if (!res.ok) throw new Error("Failed to activate goal");
      await fetchGoals();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate goal");
    } finally {
      setBusyId(null);
    }
  };

  const setStatus = async (
    rowId: string,
    status: "active" | "paused"
  ) => {
    setBusyId(rowId);
    try {
      const res = await fetch(`/api/goals/${rowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update goal");
      await fetchGoals();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update goal");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (rowId: string) => {
    setBusyId(rowId);
    try {
      const res = await fetch(`/api/goals/${rowId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove goal");
      await fetchGoals();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove goal");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="goals-page goals-page--loading">
        <p>Loading your goals...</p>
      </div>
    );
  }

  return (
    <div className="goals-page">
      <div className="goals-page__header">
        <NavHeader backLabel="Dashboard" />
        <div className="goals-page__title-row">
          <div>
            <h1>Your Health Goals</h1>
            <p>
              Pick from evidence-based targets and watch your progress as new
              reports come in.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="goals-page__error" role="alert">
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="goals-page__dismiss"
          >
            Dismiss
          </button>
        </div>
      )}

      <section className="goals-page__section">
        <h2 className="goals-page__section-title">
          Active Goals ({active.length})
        </h2>
        {active.length === 0 ? (
          <p className="goals-page__section-empty">
            You have no active goals. Pick one from below to get started.
          </p>
        ) : (
          <div className="goals-page__grid">
            {active.map((g) => (
              <div
                key={g.id}
                className="goal-card goal-card--active"
              >
                <div className="goal-card__header">
                  <span className="goal-card__emoji" aria-hidden="true">
                    {g.goal.emoji}
                  </span>
                  <div className="goal-card__info">
                    <h3 className="goal-card__title">{g.goal.title}</h3>
                    <p className="goal-card__description">
                      {g.goal.description}
                    </p>
                  </div>
                </div>
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
                <p className="goal-card__values">
                  Current: {currentText(g.goal, g.current_value)} &middot;
                  Target: {targetText(g.goal)}
                </p>
                <div className="goal-card__actions">
                  <button
                    type="button"
                    className="goal-card__action goal-card__action--pause"
                    onClick={() => setStatus(g.id, "paused")}
                    disabled={busyId === g.id}
                  >
                    Pause
                  </button>
                  <button
                    type="button"
                    className="goal-card__action goal-card__action--remove"
                    onClick={() => remove(g.id)}
                    disabled={busyId === g.id}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {achieved.length > 0 && (
        <section className="goals-page__section">
          <h2 className="goals-page__section-title">
            Achieved Goals ({achieved.length})
          </h2>
          <div className="goals-page__grid">
            {achieved.map((g) => (
              <div key={g.id} className="goal-card goal-card--achieved">
                <div className="goal-card__header">
                  <span
                    className="goal-card__emoji goal-card__emoji--trophy"
                    aria-hidden="true"
                  >
                    🏆
                  </span>
                  <div className="goal-card__info">
                    <h3 className="goal-card__title">{g.goal.title}</h3>
                    <p className="goal-card__description">
                      {g.goal.description}
                    </p>
                  </div>
                </div>
                <p className="goal-card__values">
                  Achieved on {formatDate(g.achieved_at)}
                </p>
                <div className="goal-card__actions">
                  <button
                    type="button"
                    className="goal-card__action goal-card__action--remove"
                    onClick={() => remove(g.id)}
                    disabled={busyId === g.id}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="goals-page__section">
        <h2 className="goals-page__section-title">
          Available Goals ({available.length})
        </h2>
        {available.length === 0 ? (
          <p className="goals-page__section-empty">
            You&rsquo;ve activated every standard goal. Nice.
          </p>
        ) : (
          <div className="goals-page__grid">
            {available.map((g) => (
              <div
                key={g.id}
                className="goal-card goal-card--available"
              >
                <div className="goal-card__header">
                  <span className="goal-card__emoji" aria-hidden="true">
                    {g.emoji}
                  </span>
                  <div className="goal-card__info">
                    <h3 className="goal-card__title">{g.title}</h3>
                    <p className="goal-card__description">{g.description}</p>
                  </div>
                </div>
                <p className="goal-card__values">Target: {targetText(g)}</p>
                <div className="goal-card__actions">
                  <button
                    type="button"
                    className="goal-card__action goal-card__action--activate"
                    onClick={() => activate(g.id)}
                    disabled={busyId === g.id}
                  >
                    {busyId === g.id ? "Activating..." : "Activate"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
