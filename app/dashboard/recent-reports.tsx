"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ReportItem {
  id: string;
  file_name: string;
  status: string;
  created_at: string;
}

interface RecentReportsProps {
  activeProfileId?: string | null;
}

export function RecentReports({ activeProfileId }: RecentReportsProps) {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReports() {
      try {
        const url = activeProfileId
          ? `/api/reports?family_member_id=${activeProfileId}`
          : "/api/reports";
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        setReports((data.reports || []).slice(0, 3));
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, [activeProfileId]);

  if (loading) {
    return (
      <div className="db-card">
        <h3 className="db-card__title">Recent Reports</h3>
        <div className="db-card__skeleton" />
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="db-card">
        <h3 className="db-card__title">Recent Reports</h3>
        <p className="db-card__empty">No reports yet</p>
        <Link href="/upload" className="db-card__link">
          Upload your first report &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div className="db-card">
      <h3 className="db-card__title">Recent Reports</h3>
      <ul className="db-reports__list">
        {reports.map((r) => (
          <li key={r.id} className="db-reports__item">
            <Link href={`/reports/${r.id}`} className="db-reports__link">
              <span className="db-reports__name">{r.file_name}</span>
              <span className={`db-reports__badge db-reports__badge--${r.status}`}>
                {r.status === "parsed" ? "Analyzed" : r.status}
              </span>
            </Link>
            <span className="db-reports__date">
              {new Date(r.created_at).toLocaleDateString()}
            </span>
          </li>
        ))}
      </ul>
      <Link href="/reports" className="db-card__link">
        View All Reports &rarr;
      </Link>
    </div>
  );
}
