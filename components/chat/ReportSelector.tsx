"use client";

import { useState, useEffect } from "react";
import type { AttachedReport } from "@/hooks/useChat";

interface Report {
  id: string;
  file_name: string;
  file_type: string;
  status: string;
  created_at: string;
}

interface ReportSelectorProps {
  onSelect: (report: AttachedReport) => void;
  onSkip: () => void;
}

export function ReportSelector({ onSelect, onSkip }: ReportSelectorProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReports() {
      try {
        const response = await fetch("/api/reports");
        if (!response.ok) return;
        const data = await response.json();
        // Only show parsed (analyzed) reports
        const parsed = (data.reports || []).filter(
          (r: Report) => r.status === "parsed"
        );
        setReports(parsed);
      } catch {
        // Non-critical — silently fail
      } finally {
        setIsLoading(false);
      }
    }
    fetchReports();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleSelect = (report: Report) => {
    setSelectedId(report.id);
    onSelect({
      id: report.id,
      filename: report.file_name,
      date: formatDate(report.created_at),
    });
  };

  // Don't show if no parsed reports available
  if (!isLoading && reports.length === 0) {
    return null;
  }

  return (
    <div className="report-selector" role="region" aria-label="Report selector">
      <p className="report-selector__prompt">
        Want to discuss a specific report? Select one below, or just start
        chatting!
      </p>

      {isLoading && (
        <div className="report-selector__loading">Loading reports...</div>
      )}

      {!isLoading && (
        <div className="report-selector__list">
          {reports.map((report) => (
            <button
              key={report.id}
              className={`report-selector__item ${
                selectedId === report.id
                  ? "report-selector__item--selected"
                  : ""
              }`}
              onClick={() => handleSelect(report)}
              type="button"
            >
              <span className="report-selector__item-name">
                {report.file_name}
              </span>
              <span className="report-selector__item-date">
                {formatDate(report.created_at)}
              </span>
            </button>
          ))}
        </div>
      )}

      <button
        className="report-selector__skip"
        onClick={onSkip}
        type="button"
      >
        Skip — just chat
      </button>
    </div>
  );
}
