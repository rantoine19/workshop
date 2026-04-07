"use client";

import { type JSX, useEffect, useState, useCallback } from "react";

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

function getFlagColor(flag: "green" | "yellow" | "red"): string {
  switch (flag) {
    case "green":
      return "var(--color-green-500)";
    case "yellow":
      return "var(--color-orange-500)";
    case "red":
      return "var(--color-red-500)";
  }
}

function getBiomarkerIcon(
  name: string,
  flag: "green" | "yellow" | "red"
): JSX.Element | null {
  const lower = name.toLowerCase();
  const color = getFlagColor(flag);

  // Heart — blood pressure, heart rate, systolic, diastolic
  if (
    lower.includes("blood pressure") ||
    lower.includes("heart rate") ||
    lower.includes("heart") ||
    lower.includes("systolic") ||
    lower.includes("diastolic")
  ) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          fill={color}
          opacity="0.85"
        />
        <path
          d="M5 12h3l2-4 4 8 2-4h3"
          fill="none"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // Droplet — glucose, blood sugar, fasting glucose, A1C, hemoglobin, hematocrit
  if (
    lower.includes("glucose") ||
    lower.includes("blood sugar") ||
    lower.includes("fasting glucose") ||
    lower.includes("a1c") ||
    lower.includes("hemoglobin") ||
    lower.includes("hgb") ||
    lower.includes("hba1c") ||
    lower.includes("hematocrit")
  ) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z"
          fill={color}
          opacity="0.85"
        />
        <ellipse
          cx="10"
          cy="14"
          rx="2"
          ry="2.5"
          fill="white"
          opacity="0.35"
        />
      </svg>
    );
  }

  // Flask — cholesterol, triglycerides, HDL, LDL, VLDL
  if (
    lower.includes("cholesterol") ||
    lower.includes("triglyceride") ||
    lower.includes("hdl") ||
    lower.includes("ldl") ||
    lower.includes("vldl") ||
    lower.includes("lipid")
  ) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M9 2h6v6l4 9a2 2 0 0 1-1.8 2.9H6.8A2 2 0 0 1 5 17l4-9V2z"
          fill={color}
          opacity="0.2"
          stroke={color}
          strokeWidth="1.5"
        />
        <path
          d="M5.5 15.5h13"
          stroke={color}
          strokeWidth="1.5"
          fill="none"
        />
        <rect
          x="5.2"
          y="15.5"
          width="13.6"
          height="4.5"
          rx="1"
          fill={color}
          opacity="0.7"
        />
        <line
          x1="9"
          y1="2"
          x2="15"
          y2="2"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // Shield — WBC, white blood cell, immune
  if (
    lower.includes("wbc") ||
    lower.includes("white blood cell") ||
    lower.includes("immune") ||
    lower.includes("lymphocyte") ||
    lower.includes("neutrophil")
  ) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 2l8 4v6c0 5.25-3.44 9.15-8 10.5C7.44 21.15 4 17.25 4 12V6l8-4z"
          fill={color}
          opacity="0.85"
        />
        <path
          d="M9 12l2 2 4-4"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // Kidney — creatinine, BUN, eGFR, uric acid
  if (
    lower.includes("creatinine") ||
    lower.includes("bun") ||
    lower.includes("egfr") ||
    lower.includes("uric acid") ||
    lower.includes("kidney")
  ) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M8 3C5 3 3 6 3 9c0 3 1 5 3 7s3 4 3 6h2c0-2 1-4 3-6s3-4 3-7c0-3-2-6-5-6"
          fill={color}
          opacity="0.85"
        />
        <path
          d="M10.5 9c0 1.5-.5 3-1.5 4.5"
          fill="none"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.6"
        />
      </svg>
    );
  }

  // Liver — ALT, AST, alkaline phosphatase, bilirubin, albumin, GGT
  if (
    lower.includes("alt") ||
    lower.includes("ast") ||
    lower.includes("alkaline phosphatase") ||
    lower.includes("bilirubin") ||
    lower.includes("albumin") ||
    lower.includes("ggt") ||
    lower.includes("liver")
  ) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M15 4c3 0 6 2 6 6s-2 6-5 8-4 3-4 4c0-1-1-2-4-4S2 14 2 10s3-6 6-6c2 0 3.5 1 4 2 .5-1 2-2 3-2z"
          fill={color}
          opacity="0.85"
        />
        <path
          d="M12 8v6M10 12h4"
          fill="none"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>
    );
  }

  // Bolt — electrolytes: sodium, potassium, chloride, calcium, magnesium
  if (
    lower.includes("sodium") ||
    lower.includes("potassium") ||
    lower.includes("chloride") ||
    lower.includes("calcium") ||
    lower.includes("magnesium") ||
    lower.includes("electrolyte")
  ) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <polygon
          points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"
          fill={color}
          opacity="0.85"
        />
        <polygon
          points="13 5 6 14 12 14 11.5 19 18 10 12 10 13 5"
          fill="white"
          opacity="0.2"
        />
      </svg>
    );
  }

  // Thyroid — TSH, T3, T4, free T3, free T4
  if (
    lower.includes("tsh") ||
    lower.includes("t3") ||
    lower.includes("t4") ||
    lower.includes("thyroid")
  ) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <ellipse cx="8" cy="12" rx="5" ry="6" fill={color} opacity="0.7" />
        <ellipse cx="16" cy="12" rx="5" ry="6" fill={color} opacity="0.7" />
        <rect
          x="10"
          y="10"
          width="4"
          height="4"
          rx="2"
          fill={color}
          opacity="0.9"
        />
      </svg>
    );
  }

  // Sun — vitamin D
  if (lower.includes("vitamin d")) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="5" fill={color} opacity="0.85" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const x1 = 12 + 7 * Math.cos(rad);
          const y1 = 12 + 7 * Math.sin(rad);
          const x2 = 12 + 9.5 * Math.cos(rad);
          const y2 = 12 + 9.5 * Math.sin(rad);
          return (
            <line
              key={angle}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
    );
  }

  // Pill — vitamin B12, folate, iron, ferritin
  if (
    lower.includes("vitamin b12") ||
    lower.includes("b12") ||
    lower.includes("folate") ||
    lower.includes("iron") ||
    lower.includes("ferritin")
  ) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <rect
          x="3"
          y="9"
          width="18"
          height="6"
          rx="3"
          fill={color}
          opacity="0.85"
        />
        <rect x="12" y="9" width="9" height="6" rx="3" fill={color} />
        <rect
          x="3"
          y="9"
          width="9"
          height="6"
          rx="3"
          fill={color}
          opacity="0.5"
        />
        <line
          x1="12"
          y1="9"
          x2="12"
          y2="15"
          stroke="white"
          strokeWidth="1"
          opacity="0.4"
        />
      </svg>
    );
  }

  // Scale — weight, BMI, body fat
  if (
    lower.includes("weight") ||
    lower.includes("bmi") ||
    lower.includes("body mass") ||
    lower.includes("body fat")
  ) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <rect
          x="3"
          y="6"
          width="18"
          height="15"
          rx="3"
          fill={color}
          opacity="0.85"
        />
        <rect x="6" y="3" width="12" height="5" rx="2" fill={color} />
        <circle cx="12" cy="14" r="4" fill="white" opacity="0.3" />
        <path
          d="M12 11v3l2 1"
          fill="none"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // Ruler — height
  if (lower.includes("height")) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <rect
          x="8"
          y="2"
          width="8"
          height="20"
          rx="1"
          fill={color}
          opacity="0.85"
        />
        {[5, 8, 11, 14, 17].map((y) => (
          <line
            key={y}
            x1="8"
            y1={y}
            x2={y % 6 === 5 ? "13" : "11"}
            y2={y}
            stroke="white"
            strokeWidth="1"
            opacity="0.5"
          />
        ))}
      </svg>
    );
  }

  // Default: activity/pulse icon for general metrics
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <rect
        x="1"
        y="8"
        width="22"
        height="8"
        rx="4"
        fill={color}
        opacity="0.15"
      />
      <polyline
        points="2 12 6 12 9 5 12 19 15 8 18 12 22 12"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
                {getBiomarkerIcon(
                  biomarker.name,
                  biomarker.flag as "green" | "yellow" | "red"
                )}
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
