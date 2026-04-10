"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HealthScore } from "./health-score";
import { TopConcerns } from "./top-concerns";
import { ImprovementTips } from "./improvement-tips";
import { RecentReports } from "./recent-reports";
import { QuickStats } from "./quick-stats";
import { DailyTip } from "./daily-tip";

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
  topConcernsDetailed: Array<{
    name: string;
    value: string | number | null;
    flag: string;
  }>;
  tips: string[];
  reportId: string;
  reportName: string;
  reportDate: string;
}

interface DashboardGridProps {
  displayName: string;
}

export function DashboardGrid({ displayName }: DashboardGridProps) {
  const [healthData, setHealthData] = useState<HealthScoreData | null>(null);
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
        setHealthData(json.healthScore ?? null);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchHealthScore();
  }, []);

  const firstName = displayName.split(/\s+/)[0];

  return (
    <div className="dashboard__grid">
      {/* Left Column */}
      <div className="dashboard__col-left">
        {/* Welcome + Quick Actions */}
        <div className="db-card">
          <h2 className="db-welcome__heading">Welcome back, {firstName}!</h2>
          <div className="db-actions">
            <Link href="/upload" className="db-action">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="12" y2="12" />
                <line x1="15" y1="15" x2="12" y2="12" />
              </svg>
              Upload
            </Link>
            <Link href="/chat" className="db-action">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Chat
            </Link>
            <Link href="/reports" className="db-action">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="1" />
              </svg>
              Reports
            </Link>
            <Link href="/profile" className="db-action">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Profile
            </Link>
          </div>
        </div>

        {/* Top Concerns */}
        {!loading && !error && (
          <TopConcerns
            concerns={healthData?.topConcernsDetailed ?? []}
          />
        )}

        {/* Recent Reports */}
        <RecentReports />
      </div>

      {/* Right Column */}
      <div className="dashboard__col-right">
        {/* Health Credit Score (compact) */}
        <HealthScore
          compact
          data={healthData}
          loading={loading}
          error={error}
        />

        {/* Improvement Tips */}
        {!loading && !error && healthData && (
          <ImprovementTips tips={healthData.tips} />
        )}

        {/* Quick Stats */}
        <QuickStats />
      </div>

      {/* Full-width Daily Tip */}
      <div className="dashboard__bottom">
        <DailyTip
          concerns={
            healthData?.topConcernsDetailed ??
            healthData?.topConcerns?.map((name) => ({ name, flag: "red" })) ??
            []
          }
        />
      </div>
    </div>
  );
}
