"use client";

import { useEffect, useState, useCallback } from "react";

interface SimplifiedBiomarker {
  name: string;
  value: string;
  flag: string;
  explanation: string;
  importance: string;
  action: string;
}

interface SimplifiedSummary {
  overall: string;
  biomarkers: SimplifiedBiomarker[];
  disclaimer: string;
}

interface HealthSummaryProps {
  reportId: string;
}

export default function HealthSummary({ reportId }: HealthSummaryProps) {
  const [summary, setSummary] = useState<SimplifiedSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/reports/${reportId}/summary`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to load summary");
      }

      const data = await response.json();
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load summary");
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (loading) {
    return (
      <div className="health-summary health-summary--loading">
        <div className="health-summary__spinner" aria-label="Loading summary" />
        <p>Simplifying your results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="health-summary health-summary--error">
        <p className="health-summary__error">{error}</p>
        <button onClick={fetchSummary} className="health-summary__retry">
          Try Again
        </button>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="health-summary">
      <div className="health-summary__disclaimer" role="alert">
        {summary.disclaimer}
      </div>

      <div className="health-summary__overall">
        <h2>Your Results Overview</h2>
        <p>{summary.overall}</p>
      </div>

      <div className="health-summary__biomarkers">
        <h2>Your Lab Results Explained</h2>
        {summary.biomarkers.map((biomarker, index) => (
          <div
            key={index}
            className={`health-summary__biomarker health-summary__biomarker--${biomarker.flag}`}
          >
            <div className="health-summary__biomarker-header">
              <span className="health-summary__biomarker-name">
                {biomarker.name}
              </span>
              <span className="health-summary__biomarker-value">
                {biomarker.value}
              </span>
              <span
                className={`health-summary__flag health-summary__flag--${biomarker.flag}`}
                aria-label={`Status: ${biomarker.flag}`}
              >
                {biomarker.flag === "green"
                  ? "Normal"
                  : biomarker.flag === "yellow"
                    ? "Borderline"
                    : "Needs Attention"}
              </span>
            </div>
            <div className="health-summary__biomarker-body">
              <div className="health-summary__section">
                <h3>What is this?</h3>
                <p>{biomarker.explanation}</p>
              </div>
              <div className="health-summary__section">
                <h3>Why does it matter?</h3>
                <p>{biomarker.importance}</p>
              </div>
              <div className="health-summary__section">
                <h3>What should I do?</h3>
                <p>{biomarker.action}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
