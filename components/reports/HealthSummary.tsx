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

function getBiomarkerIcon(name: string) {
  const lower = name.toLowerCase();

  if (
    lower.includes("blood pressure") ||
    lower.includes("heart rate") ||
    lower.includes("heart")
  ) {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    );
  }

  if (
    lower.includes("glucose") ||
    lower.includes("blood sugar") ||
    lower.includes("hemoglobin") ||
    lower.includes("hgb") ||
    lower.includes("hba1c")
  ) {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
      </svg>
    );
  }

  if (
    lower.includes("cholesterol") ||
    lower.includes("triglyceride") ||
    lower.includes("hdl") ||
    lower.includes("ldl") ||
    lower.includes("lipid")
  ) {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
        <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
        <path d="M18 12h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2" />
      </svg>
    );
  }

  if (
    lower.includes("weight") ||
    lower.includes("bmi") ||
    lower.includes("body mass")
  ) {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M16 2H8a2 2 0 0 0-2 2v2h12V4a2 2 0 0 0-2-2z" />
        <rect x="3" y="6" width="18" height="16" rx="2" />
        <path d="M12 10v4" />
        <path d="M10 12h4" />
      </svg>
    );
  }

  // Default: activity/pulse icon for general metrics
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
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
              <span className="health-summary__biomarker-icon">
                {getBiomarkerIcon(biomarker.name)}
              </span>
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
