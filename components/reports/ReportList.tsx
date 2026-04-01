"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Report {
  id: string;
  file_name: string;
  file_type: string;
  status: string;
  created_at: string;
}

export default function ReportList() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/reports");

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Please log in to view reports");
        }
        throw new Error("Failed to load reports");
      }

      const data = await response.json();
      setReports(data.reports || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load reports"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  if (loading) {
    return (
      <div className="report-list report-list--loading">
        <div
          className="report-list__spinner"
          aria-label="Loading reports"
          role="status"
        />
        <p>Loading your reports...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="report-list report-list--error">
        <p className="report-list__error">{error}</p>
        <button onClick={fetchReports} className="report-list__retry">
          Try Again
        </button>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="report-list report-list--empty">
        <p>No reports yet.</p>
        <Link href="/upload" className="report-list__upload-link">
          Upload your first medical report to get started
        </Link>
      </div>
    );
  }

  const statusLabel: Record<string, string> = {
    completed: "Analyzed",
    processing: "Processing",
    pending: "Pending",
    error: "Error",
  };

  return (
    <div className="report-list">
      <h2>Your Reports</h2>
      <div className="report-list__items">
        {reports.map((report) => (
          <Link
            key={report.id}
            href={`/reports/${report.id}`}
            className="report-list__item"
          >
            <div className="report-list__item-info">
              <span className="report-list__item-name">
                {report.file_name}
              </span>
              <span className="report-list__item-date">
                {new Date(report.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <span
              className={`report-list__item-status report-list__item-status--${report.status}`}
            >
              {statusLabel[report.status] || report.status}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
