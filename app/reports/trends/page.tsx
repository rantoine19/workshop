"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NavHeader from "@/components/ui/NavHeader";
import TrendChart from "@/components/reports/TrendChart";

interface TrendDataPoint {
  date: string;
  value: number;
  flag: string;
  reportName: string;
}

interface BiomarkerTrend {
  biomarkerName: string;
  unit: string;
  dataPoints: TrendDataPoint[];
  referenceRange: {
    greenLow?: number | null;
    greenHigh?: number | null;
    yellowLow?: number | null;
    yellowHigh?: number | null;
  };
  trend: "improving" | "worsening" | "stable";
}

export default function TrendsPage() {
  const [trends, setTrends] = useState<BiomarkerTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTrends() {
      setLoading(true);
      try {
        const res = await fetch("/api/reports/trends");
        if (!res.ok) {
          if (res.status === 401) {
            throw new Error("Please log in to view trends");
          }
          throw new Error("Failed to load trends");
        }
        const data = await res.json();
        setTrends(data.trends || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load trends");
      } finally {
        setLoading(false);
      }
    }
    loadTrends();
  }, []);

  if (loading) {
    return (
      <div className="trends-page">
        <NavHeader backLabel="Reports" />
        <div className="trends-page__loading">
          <p>Loading trends...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="trends-page">
        <NavHeader backLabel="Reports" />
        <div className="trends-page__error" role="alert">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (trends.length === 0) {
    return (
      <div className="trends-page">
        <NavHeader backLabel="Reports" />
        <h1>Your Health Trends</h1>
        <div className="trends-page__empty">
          <div className="empty-state__icon" aria-hidden="true">
            <svg
              width="64"
              height="64"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="8"
                y="8"
                width="48"
                height="48"
                rx="6"
                fill="#dcfce7"
                stroke="#16a34a"
                strokeWidth="2"
              />
              <polyline
                points="16,44 24,32 32,36 40,20 48,24"
                fill="none"
                stroke="#16a34a"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="16" cy="44" r="3" fill="#16a34a" />
              <circle cx="24" cy="32" r="3" fill="#16a34a" />
              <circle cx="32" cy="36" r="3" fill="#f59e0b" />
              <circle cx="40" cy="20" r="3" fill="#16a34a" />
              <circle cx="48" cy="24" r="3" fill="#16a34a" />
            </svg>
          </div>
          <h3 className="empty-state__heading">Not enough data for trends</h3>
          <p className="empty-state__text">
            Upload at least 2 reports to see how your biomarkers change over
            time
          </p>
          <Link href="/upload" className="empty-state__cta">
            Upload Report
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="trends-page">
      <NavHeader backLabel="Reports" />
      <h1>Your Health Trends</h1>
      <p className="trends-page__subtitle">
        See how your biomarkers change over time. Each chart shows values from
        your uploaded lab reports.
      </p>
      <p className="trends-page__disclaimer">
        Trends are informational only and do not constitute medical advice.
        Consult your healthcare provider for interpretation.
      </p>

      <div className="trends-grid">
        {trends.map((t) => (
          <TrendChart
            key={t.biomarkerName}
            biomarkerName={t.biomarkerName}
            dataPoints={t.dataPoints}
            referenceRange={t.referenceRange}
            unit={t.unit}
            trend={t.trend}
          />
        ))}
      </div>

      <div className="trends-page__actions">
        <Link href="/reports/compare" className="trends-page__link">
          Compare Reports Table
        </Link>
        <Link href="/reports" className="trends-page__link">
          All Reports
        </Link>
      </div>
    </div>
  );
}
