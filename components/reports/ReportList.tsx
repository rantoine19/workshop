"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

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
  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/reports/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete report");
      }
      setReports((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setError("Failed to delete report. Please try again.");
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget]);

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
    parsed: "Analyzed",
    parsing: "Processing",
    uploaded: "Pending",
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
            <div className="report-list__item-icon" aria-hidden="true">
              {report.file_type === "pdf" ? (
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 2C4.9 2 4 2.9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6H6z" fill="#ef4444" opacity="0.15"/>
                  <path d="M6 2C4.9 2 4 2.9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6H6z" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  <path d="M14 2v6h6" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <text x="12" y="17" textAnchor="middle" fill="#ef4444" fontSize="5" fontWeight="bold" fontFamily="system-ui">PDF</text>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="3" width="18" height="18" rx="2" fill="#3b82f6" opacity="0.15" stroke="#3b82f6" strokeWidth="1.5"/>
                  <circle cx="8.5" cy="8.5" r="2" fill="#3b82f6" opacity="0.5"/>
                  <path d="M21 15l-5-5L5 21" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
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
            <button
              className="delete-btn delete-btn--icon"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDeleteTarget(report);
              }}
              aria-label={`Delete ${report.file_name}`}
            >
              <svg viewBox="0 0 20 20" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 6L14 14M14 6L6 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </Link>
        ))}
      </div>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete Report"
        message={`Are you sure you want to delete "${deleteTarget?.file_name}"? This will permanently remove this report and all its analysis data.`}
        confirmLabel={isDeleting ? "Deleting..." : "Delete"}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
