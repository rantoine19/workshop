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
  reportId: string;
  reportName: string;
  reportDate: string;
}

export function HealthScore() {
  const [data, setData] = useState<HealthScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
          Upload a report to see your health score
        </p>
        <Link href="/upload" className="health-score__empty-cta">
          Upload Report
        </Link>
      </div>
    );
  }

  // Calculate SVG circle properties for the gauge
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const progress = data.score / 100;
  const dashOffset = circumference * (1 - progress);

  // Breakdown bar percentages
  const total = data.breakdown.total || 1;
  const greenPct = (data.breakdown.green / total) * 100;
  const yellowPct = (data.breakdown.yellow / total) * 100;
  const redPct = (data.breakdown.red / total) * 100;

  return (
    <div className={`health-score health-score--${data.color}`}>
      <div className="health-score__main">
        {/* Circular gauge */}
        <div className="health-score__gauge">
          <svg
            className="health-score__gauge-svg"
            viewBox="0 0 140 140"
            aria-label={`Health score: ${data.score} out of 100, rated ${data.label}`}
            role="img"
          >
            {/* Background circle */}
            <circle
              className="health-score__gauge-bg"
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              strokeWidth="10"
            />
            {/* Progress circle */}
            <circle
              className="health-score__gauge-progress"
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 70 70)"
            />
          </svg>
          <div className="health-score__number">{data.score}</div>
        </div>

        <div className="health-score__details">
          <div className="health-score__label">{data.label}</div>

          {/* Breakdown bar */}
          <div className="health-score__breakdown" aria-label="Biomarker distribution">
            <div className="health-score__breakdown-bar">
              {data.breakdown.green > 0 && (
                <div
                  className="health-score__breakdown-segment health-score__breakdown-segment--green"
                  style={{ width: `${greenPct}%` }}
                  title={`${data.breakdown.green} normal`}
                />
              )}
              {data.breakdown.yellow > 0 && (
                <div
                  className="health-score__breakdown-segment health-score__breakdown-segment--yellow"
                  style={{ width: `${yellowPct}%` }}
                  title={`${data.breakdown.yellow} borderline`}
                />
              )}
              {data.breakdown.red > 0 && (
                <div
                  className="health-score__breakdown-segment health-score__breakdown-segment--red"
                  style={{ width: `${redPct}%` }}
                  title={`${data.breakdown.red} flagged`}
                />
              )}
            </div>
            <div className="health-score__breakdown-legend">
              <span className="health-score__legend-item health-score__legend-item--green">
                {data.breakdown.green} normal
              </span>
              <span className="health-score__legend-item health-score__legend-item--yellow">
                {data.breakdown.yellow} borderline
              </span>
              <span className="health-score__legend-item health-score__legend-item--red">
                {data.breakdown.red} flagged
              </span>
            </div>
          </div>

          {/* Top concerns */}
          {data.topConcerns.length > 0 && (
            <div className="health-score__concerns">
              <span className="health-score__concerns-label">Top concerns:</span>
              <ul className="health-score__concerns-list">
                {data.topConcerns.map((concern) => (
                  <li key={concern}>{concern}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="health-score__footer">
        <p className="health-score__report-info">
          Based on your latest report &mdash;{" "}
          <Link href={`/reports/${data.reportId}`}>
            {data.reportName}
          </Link>
        </p>
        <p className="health-score__disclaimer">
          This score is for informational purposes only. Always consult your
          doctor.
        </p>
      </div>
    </div>
  );
}
