"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface HealthScoreData {
  score: number;
  label: string;
  color: string;
  breakdown: {
    green: number;
    yellow: number;
    red: number;
    total: number;
  };
  topConcerns: string[];
  tips: string[];
  reportId: string;
  reportName: string;
  reportDate: string;
}

/**
 * Score range legend entries for the credit-score display.
 */
const SCORE_RANGES = [
  { min: 300, label: "Insufficiently Active", className: "insufficient" },
  { min: 580, label: "Moderately Active", className: "moderate" },
  { min: 670, label: "Active", className: "active" },
  { min: 740, label: "Very Active", className: "very-active" },
  { min: 800, label: "Exceptional", className: "exceptional" },
];

/**
 * Semi-circular gauge SVG component that resembles a credit score meter.
 *
 * Draws a 180-degree arc from left to right with gradient color stops,
 * a needle indicator, and the score number in the center.
 */
function CreditScoreGauge({ score, label }: { score: number; label: string }) {
  const cx = 150;
  const cy = 140;
  const radius = 110;
  const strokeWidth = 22;

  const normalizedScore = Math.max(300, Math.min(850, score));
  const fraction = (normalizedScore - 300) / 550;
  const needleAngle = Math.PI * (1 - fraction);

  const needleLength = radius - strokeWidth / 2 - 10;
  const needleX = cx + needleLength * Math.cos(needleAngle);
  const needleY = cy - needleLength * Math.sin(needleAngle);

  const arcStartX = cx - radius;
  const arcStartY = cy;
  const arcEndX = cx + radius;
  const arcEndY = cy;

  // Full colored arc (entire semi-circle shows the gradient spectrum)
  const fullArc = `M ${arcStartX} ${arcStartY} A ${radius} ${radius} 0 0 1 ${arcEndX} ${arcEndY}`;

  return (
    <div className="health-score__gauge">
      <svg
        className="health-score__gauge-svg"
        viewBox="0 0 300 170"
        aria-label={`Health Credit Score: ${score} out of 850, rated ${label}`}
        role="img"
      >
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="25%" stopColor="#f97316" />
            <stop offset="45%" stopColor="#eab308" />
            <stop offset="60%" stopColor="#84cc16" />
            <stop offset="80%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>
        </defs>

        {/* Gray background arc */}
        <path
          d={fullArc}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth + 2}
          strokeLinecap="round"
        />

        {/* Full gradient colored arc — shows entire spectrum */}
        <path
          d={fullArc}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={needleX}
          y2={needleY}
          stroke="#1f2937"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Needle tip dot */}
        <circle cx={needleX} cy={needleY} r="4" fill="#1f2937" />
        {/* Needle center dot */}
        <circle cx={cx} cy={cy} r="6" fill="#1f2937" />

        {/* Scale labels */}
        <text x={arcStartX - 5} y={cy + 22} textAnchor="middle" className="health-score__scale-label">300</text>
        <text x={arcEndX + 5} y={cy + 22} textAnchor="middle" className="health-score__scale-label">850</text>
      </svg>

      {/* Score + label below the gauge (not overlapping) */}
      <div className="health-score__score-block">
        <div className="health-score__number">{score}</div>
        <div className={`health-score__label health-score__label--${label.toLowerCase().replace(/\s+/g, "-")}`}>
          {label}
        </div>
      </div>
    </div>
  );
}

export function HealthScore() {
  const [data, setData] = useState<HealthScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showExplain, setShowExplain] = useState(false);

  useEffect(() => {
    async function fetchHealthScore() {
      try {
        const res = await fetch("/api/health-score");
        if (!res.ok) {
          setError(true);
          return;
        }
        const json = await res.json();
        setData(json.healthScore ?? null);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchHealthScore();
  }, []);

  // Loading skeleton
  if (loading) {
    return (
      <div className="health-score health-score--loading">
        <div className="health-score__skeleton-gauge" />
        <div className="health-score__skeleton-text" />
        <div className="health-score__skeleton-bar" />
      </div>
    );
  }

  // Error state
  if (error) {
    return null;
  }

  // Empty state — no parsed reports
  if (!data) {
    return (
      <div className="health-score health-score--empty">
        <div className="health-score__empty-icon">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        <p className="health-score__empty-text">
          Upload a report to see your Health Credit Score
        </p>
        <Link href="/upload" className="health-score__empty-cta">
          Upload Report
        </Link>
      </div>
    );
  }

  // Breakdown counts
  const { green, yellow, red, total } = data.breakdown;

  return (
    <div className={`health-score health-score--credit`}>
      {/* Semi-circular gauge */}
      <CreditScoreGauge score={data.score} label={data.label} />

      {/* Score range legend */}
      <div className="health-score__legend">
        {SCORE_RANGES.map((range) => (
          <div
            key={range.min}
            className={`health-score__legend-item health-score__legend-item--${range.className}`}
          >
            <span className="health-score__legend-dot" />
            <span className="health-score__legend-min">{range.min}</span>
            <span className="health-score__legend-label">{range.label}</span>
          </div>
        ))}
      </div>

      {/* Breakdown summary */}
      <div className="health-score__breakdown-summary">
        <span className="health-score__breakdown-item health-score__breakdown-item--green">
          {green} Normal
        </span>
        <span className="health-score__breakdown-item health-score__breakdown-item--yellow">
          {yellow} Borderline
        </span>
        <span className="health-score__breakdown-item health-score__breakdown-item--red">
          {red} Needs Attention
        </span>
        <span className="health-score__breakdown-item health-score__breakdown-item--total">
          {total} Total
        </span>
      </div>

      {/* Improvement tips */}
      {data.tips && data.tips.length > 0 && (
        <div className="health-score__tips">
          <h4 className="health-score__tips-title">How to improve your score</h4>
          <ul className="health-score__tips-list">
            {data.tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Expandable explanation */}
      <button
        className="health-score__explain-toggle"
        onClick={() => setShowExplain(!showExplain)}
        aria-expanded={showExplain}
      >
        How is my score calculated?
        <svg
          className={`health-score__explain-chevron ${showExplain ? "health-score__explain-chevron--open" : ""}`}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
      {showExplain && (
        <div className="health-score__explain">
          <p>
            Your Health Credit Score is calculated on a 300&ndash;850 scale, similar
            to a financial credit score. Each biomarker from your lab report
            contributes to your score:
          </p>
          <ul>
            <li><strong>Normal (green)</strong> biomarkers earn full credit</li>
            <li><strong>Borderline (yellow)</strong> biomarkers earn half credit</li>
            <li><strong>Flagged (red)</strong> biomarkers earn no credit</li>
          </ul>
          <p>
            Critical biomarkers like blood pressure, glucose, A1C, and cholesterol
            are weighted 2x because of their clinical significance.
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="health-score__footer">
        <p className="health-score__report-info">
          Based on your latest report &mdash;{" "}
          <Link href={`/reports/${data.reportId}`}>
            {data.reportName}
          </Link>
        </p>
        <p className="health-score__disclaimer">
          Your Health Credit Score is for informational purposes only and is not a
          medical diagnosis. Always consult your doctor.
        </p>
      </div>
    </div>
  );
}
