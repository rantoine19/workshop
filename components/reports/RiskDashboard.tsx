"use client";

import { useEffect, useState, useCallback } from "react";
import RiskIndicator from "./RiskIndicator";

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

export default function RiskDashboard({ reportId }: RiskDashboardProps) {
  const [riskFlags, setRiskFlags] = useState<RiskFlagData[]>([]);
  const [summary, setSummary] = useState<RiskSummary | null>(null);
  const [disclaimer, setDisclaimer] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        {sortedFlags.map((flag) => (
          <RiskIndicator
            key={flag.id}
            flag={flag.flag}
            biomarkerName={flag.biomarker_name}
            value={Number(flag.value)}
          />
        ))}
      </div>
    </div>
  );
}
