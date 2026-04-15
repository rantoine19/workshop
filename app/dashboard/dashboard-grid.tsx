"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HealthScore } from "./health-score";
import { TopConcerns } from "./top-concerns";
import { ImprovementTips } from "./improvement-tips";
import { RecentReports } from "./recent-reports";
import { QuickStats } from "./quick-stats";
import { DailyTip } from "./daily-tip";
import ProfileSwitcher from "@/components/ui/ProfileSwitcher";
import { useActiveProfile } from "@/hooks/useActiveProfile";

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
  const { activeProfileId, activeProfileName, isViewingSelf } = useActiveProfile();

  useEffect(() => {
    async function fetchHealthScore() {
      try {
        const url = activeProfileId
          ? `/api/health-score?family_member_id=${activeProfileId}`
          : "/api/health-score";
        const res = await fetch(url);
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
  }, [activeProfileId]);

  const firstName = displayName.split(/\s+/)[0];

  return (
    <div className="dashboard__grid">
      {/* Left Column */}
      <div className="dashboard__col-left">
        {/* Welcome + Quick Actions */}
        <div className="db-card">
          <div className="db-welcome__row">
            <h2 className="db-welcome__heading">
              {isViewingSelf
                ? `Welcome back, ${firstName}!`
                : `Viewing: ${activeProfileName}'s Health`}
            </h2>
            <ProfileSwitcher />
          </div>
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
            <Link href="/medications" className="db-action">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3" />
              </svg>
              Medications
            </Link>
            <Link href="/insurance" className="db-action">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              Insurance
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
        <RecentReports activeProfileId={activeProfileId} />
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
