"use client";

import { useEffect, useState, useCallback } from "react";

interface RiskFlagData {
  id: string;
  biomarker_name: string;
  value: number;
  reference_low: number | null;
  reference_high: number | null;
  flag: "green" | "yellow" | "red";
  trend: string;
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

  function getGoalText(flag: RiskFlagData): string {
    if (flag.reference_low != null && flag.reference_high != null) {
      return `${flag.reference_low}-${flag.reference_high}`;
    }
    if (flag.reference_high != null) {
      return `<${flag.reference_high}`;
    }
    if (flag.reference_low != null) {
      return `>${flag.reference_low}`;
    }
    return "";
  }

  function getRangeText(flag: RiskFlagData): string {
    if (flag.reference_low != null && flag.reference_high != null) {
      return `Normal range: ${flag.reference_low} - ${flag.reference_high}`;
    }
    if (flag.reference_high != null) {
      return `Normal: below ${flag.reference_high}`;
    }
    if (flag.reference_low != null) {
      return `Normal: above ${flag.reference_low}`;
    }
    return "";
  }

  function getAdvice(flag: RiskFlagData): string {
    if (flag.flag === "green") {
      return "This value is within the normal range. Keep up the good work!";
    }
    if (flag.flag === "yellow") {
      return "This value is borderline. It's worth discussing with your doctor at your next visit.";
    }
    return "This value needs attention. Please talk to your doctor about this result soon.";
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
            const score = flag.flag === "green" ? 100 : flag.flag === "yellow" ? 70 : 30;
            const goalText = getGoalText(flag);
            return (
              <button
                key={flag.id}
                className={`risk-card risk-card--${flag.flag}${isExpanded ? " risk-card--expanded" : ""}`}
                onClick={() => setExpandedId(isExpanded ? null : flag.id)}
                aria-expanded={isExpanded}
              >
                <div className="risk-card__top">
                  <div className={`risk-card__ring risk-card__ring--${flag.flag}`}>
                    <svg viewBox="0 0 36 36" className="risk-card__ring-svg">
                      <path
                        className="risk-card__ring-bg"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="3"
                      />
                      <path
                        className="risk-card__ring-fill"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        strokeWidth="3"
                        strokeDasharray={`${score}, 100`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="risk-card__score">{score}</span>
                  </div>
                  <div className="risk-card__info">
                    <span className="risk-card__name">{flag.biomarker_name}</span>
                    <span className={`risk-card__label risk-card__label--${flag.flag}`}>
                      {FLAG_LABELS[flag.flag]}
                    </span>
                  </div>
                </div>
                <div className="risk-card__bottom">
                  <div className="risk-card__stat">
                    <span className="risk-card__stat-label">You</span>
                    <span className="risk-card__stat-value">{Number(flag.value).toLocaleString()}</span>
                  </div>
                  {goalText && (
                    <div className="risk-card__stat">
                      <span className="risk-card__stat-label">Goal</span>
                      <span className="risk-card__stat-value">{goalText}</span>
                    </div>
                  )}
                </div>
                {isExpanded && (
                  <div className="risk-card__details">
                    <p className="risk-card__range">{getRangeText(flag)}</p>
                    <p className="risk-card__advice">{getAdvice(flag)}</p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
