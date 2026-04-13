"use client";

import { useEffect, useState, useCallback } from "react";
import { getDefinition } from "@/lib/health/glossary";

interface RiskFlagData {
  id: string;
  biomarker_name: string;
  value: number;
  reference_low: number | null;
  reference_high: number | null;
  flag: "green" | "yellow" | "red";
  trend: string;
  confidence: number;
}

interface RiskSummary {
  total: number;
  green: number;
  yellow: number;
  red: number;
}

interface RiskDashboardProps {
  reportId: string;
}

const FLAG_LABELS: Record<string, string> = {
  green: "Normal",
  yellow: "Borderline",
  red: "Needs Attention",
};

const FLAG_ICONS: Record<string, string> = {
  green: "\u2705",
  yellow: "\u26a0\ufe0f",
  red: "\ud83d\udea8",
};

export default function RiskDashboard({ reportId }: RiskDashboardProps) {
  const [riskFlags, setRiskFlags] = useState<RiskFlagData[]>([]);
  const [summary, setSummary] = useState<RiskSummary | null>(null);
  const [disclaimer, setDisclaimer] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchRiskFlags = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/risk-flags?report_id=${reportId}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to load risk flags");
      }

      const data = await response.json();
      setRiskFlags(data.risk_flags);
      setSummary(data.summary);
      setDisclaimer(data.disclaimer);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load risk flags"
      );
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    fetchRiskFlags();
  }, [fetchRiskFlags]);

  if (loading) {
    return (
      <div className="risk-dashboard risk-dashboard--loading">
        <div
          className="risk-dashboard__spinner"
          aria-label="Loading risk flags"
          role="status"
        />
        <p>Analyzing your results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="risk-dashboard risk-dashboard--error">
        <p className="risk-dashboard__error">{error}</p>
        <button onClick={fetchRiskFlags} className="risk-dashboard__retry">
          Try Again
        </button>
      </div>
    );
  }

  if (riskFlags.length === 0) {
    return (
      <div className="risk-dashboard risk-dashboard--empty">
        <p>No risk flags available for this report.</p>
      </div>
    );
  }

  // Sort: red first, then yellow, then green
  const sortedFlags = [...riskFlags].sort((a, b) => {
    const order = { red: 0, yellow: 1, green: 2 };
    return order[a.flag] - order[b.flag];
  });

  /** What this biomarker measures — plain language explanation (from glossary) */
  function getDescription(name: string): string {
    return getDefinition(name);
  }

  /** What the specific value means for this person */
  function getValueMeaning(flag: RiskFlagData): string {
    const val = Number(flag.value);
    const goalText = getGoalText(flag);

    if (flag.flag === "green") {
      return `Your result of ${val} is in the healthy range${goalText ? ` (goal: ${goalText})` : ""}. Great job — keep doing what you're doing!`;
    }
    if (flag.flag === "yellow") {
      return `Your result of ${val} is borderline${goalText ? ` — the healthy range is ${goalText}` : ""}. This is worth mentioning to your doctor at your next visit.`;
    }
    return `Your result of ${val} is outside the healthy range${goalText ? ` (goal: ${goalText})` : ""}. Talk to your doctor about this — they can help you make a plan.`;
  }

  function getGoalText(flag: RiskFlagData): string {
    if (flag.reference_low != null && flag.reference_high != null) {
      return `${flag.reference_low}-${flag.reference_high}`;
    }
    if (flag.reference_high != null) {
      return `below ${flag.reference_high}`;
    }
    if (flag.reference_low != null) {
      return `above ${flag.reference_low}`;
    }
    return "";
  }

  return (
    <div className="risk-dashboard">
      {disclaimer && (
        <div className="risk-dashboard__disclaimer" role="alert">
          {disclaimer}
        </div>
      )}

      {summary && (
        <div className="risk-dashboard__summary">
          <h2>Risk Overview</h2>
          <div className="risk-dashboard__counts">
            <div className="risk-dashboard__count risk-dashboard__count--green">
              <span className="risk-dashboard__count-number">
                {summary.green}
              </span>
              <span className="risk-dashboard__count-label">Normal</span>
            </div>
            <div className="risk-dashboard__count risk-dashboard__count--yellow">
              <span className="risk-dashboard__count-number">
                {summary.yellow}
              </span>
              <span className="risk-dashboard__count-label">Borderline</span>
            </div>
            <div className="risk-dashboard__count risk-dashboard__count--red">
              <span className="risk-dashboard__count-number">
                {summary.red}
              </span>
              <span className="risk-dashboard__count-label">
                Needs Attention
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="risk-dashboard__flags">
        <h2>Your Results</h2>
        <div className="risk-card-grid">
          {sortedFlags.map((flag) => {
            const isExpanded = expandedId === flag.id;
            return (
              <button
                key={flag.id}
                className={`risk-card risk-card--${flag.flag}${isExpanded ? " risk-card--expanded" : ""}`}
                onClick={() => setExpandedId(isExpanded ? null : flag.id)}
                aria-expanded={isExpanded}
              >
                <div className="risk-card__header">
                  <div className="risk-card__title-row">
                    <span className="risk-card__name">{flag.biomarker_name}</span>
                    <span className={`risk-card__badge risk-card__badge--${flag.flag}`}>
                      {FLAG_LABELS[flag.flag]}
                    </span>
                  </div>
                  <div className="risk-card__value-row">
                    <span className={`risk-card__value risk-card__value--${flag.flag}`}>
                      {(flag.confidence ?? 1) < 0.7 && (
                        <span className="risk-card__approximate" aria-label="Approximate value">~</span>
                      )}
                      {Number(flag.value).toLocaleString()}
                    </span>
                    {getGoalText(flag) && (
                      <span className="risk-card__goal">
                        Goal: {getGoalText(flag)}
                      </span>
                    )}
                  </div>
                  {(flag.confidence ?? 1) < 0.7 && (
                    <div className="risk-card__confidence-warning" role="alert">
                      Value may be inaccurate — verify against your report
                    </div>
                  )}
                  {(flag.confidence ?? 1) >= 0.7 && (flag.confidence ?? 1) <= 0.9 && (
                    <div className="risk-card__confidence-note">
                      Approximate reading
                    </div>
                  )}
                </div>
                <p className="risk-card__description">
                  {getDescription(flag.biomarker_name)}
                </p>
                {isExpanded && (
                  <div className="risk-card__details">
                    <p className="risk-card__meaning">
                      {getValueMeaning(flag)}
                    </p>
                  </div>
                )}
                <span className="risk-card__expand-hint">
                  {isExpanded ? "Show less" : "What does this mean?"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
