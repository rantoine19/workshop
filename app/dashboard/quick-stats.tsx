"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function QuickStats() {
  const [count, setCount] = useState(0);
  const [lastDate, setLastDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/reports");
        if (!res.ok) return;
        const data = await res.json();
        const reports = data.reports || [];
        setCount(reports.length);
        if (reports.length > 0) {
          setLastDate(
            new Date(reports[0].created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          );
        }
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="db-card">
        <h3 className="db-card__title">Quick Stats</h3>
        <div className="db-card__skeleton" />
      </div>
    );
  }

  return (
    <div className="db-card">
      <h3 className="db-card__title">Quick Stats</h3>
      <div className="db-stats__grid">
        <div className="db-stats__item">
          <span className="db-stats__number">{count}</span>
          <span className="db-stats__label">Reports</span>
        </div>
        {lastDate && (
          <div className="db-stats__item">
            <span className="db-stats__number">{lastDate}</span>
            <span className="db-stats__label">Last Upload</span>
          </div>
        )}
      </div>
      <Link href="/upload" className="db-card__link">
        Upload New &rarr;
      </Link>
    </div>
  );
}
