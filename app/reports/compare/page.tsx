"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import NavHeader from "@/components/ui/NavHeader";
import TrendArrow from "@/components/reports/TrendArrow";

interface Report {
  id: string;
  file_name: string;
  status: string;
  created_at: string;
}

interface BiomarkerValue {
  reportId: string;
  value: number | null;
  unit: string;
  flag: string;
  date: string;
}

interface ComparedBiomarker {
  name: string;
  category: string;
  values: BiomarkerValue[];
  trend: "improving" | "worsening" | "stable";
}

interface CompareReportMeta {
  id: string;
  file_name: string;
  created_at: string;
}

interface CompareResult {
  reports: CompareReportMeta[];
  biomarkers: ComparedBiomarker[];
  summary: { improving: number; stable: number; worsening: number };
}

type DateFilter = "all" | "3months" | "6months" | "1year";

function getDateFilterCutoff(filter: DateFilter): Date | null {
  if (filter === "all") return null;
  const now = new Date();
  switch (filter) {
    case "3months":
      return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    case "6months":
      return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    case "1year":
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    default:
      return null;
  }
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="compare-page">Loading...</div>}>
      <CompareContent />
    </Suspense>
  );
}

function CompareContent() {
  const searchParams = useSearchParams();

  const [reports, setReports] = useState<Report[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load available reports
  useEffect(() => {
    async function loadReports() {
      setLoading(true);
      try {
        const res = await fetch("/api/reports");
        if (!res.ok) throw new Error("Failed to load reports");
        const data = await res.json();
        const parsed = (data.reports || []).filter(
          (r: Report) => r.status === "parsed"
        );
        setReports(parsed);

        // Pre-select reports from URL params
        const preselected = searchParams.get("ids");
        if (preselected) {
          const ids = preselected.split(",").filter(Boolean);
          setSelectedIds(new Set(ids));
        }
      } catch {
        setError("Failed to load reports");
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, [searchParams]);

  const toggleReport = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 5) {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleCompare = useCallback(async () => {
    if (selectedIds.size < 2) return;
    setComparing(true);
    setError(null);
    setResult(null);

    try {
      const ids = Array.from(selectedIds).join(",");
      const res = await fetch(`/api/reports/compare?ids=${ids}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Comparison failed");
      }
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comparison failed");
    } finally {
      setComparing(false);
    }
  }, [selectedIds]);

  // Filter reports by date
  const filteredReports = reports.filter((r) => {
    const cutoff = getDateFilterCutoff(dateFilter);
    if (!cutoff) return true;
    return new Date(r.created_at) >= cutoff;
  });

  // Group biomarkers by category
  const groupedBiomarkers = result
    ? result.biomarkers.reduce<Record<string, ComparedBiomarker[]>>(
        (acc, b) => {
          if (!acc[b.category]) acc[b.category] = [];
          acc[b.category].push(b);
          return acc;
        },
        {}
      )
    : {};

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const flagClass = (flag: string) => {
    switch (flag) {
      case "green":
        return "compare-table__cell--green";
      case "yellow":
        return "compare-table__cell--orange";
      case "red":
        return "compare-table__cell--red";
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <div className="compare-page">
        <NavHeader backLabel="Reports" />
        <div className="compare-page__loading">
          <p>Loading reports...</p>
        </div>
      </div>
    );
  }

  if (reports.length < 2) {
    return (
      <div className="compare-page">
        <NavHeader backLabel="Reports" />
        <h1>Compare Reports</h1>
        <div className="compare-page__empty">
          <div className="empty-state__icon" aria-hidden="true">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="6" y="12" width="24" height="32" rx="3" fill="#dcfce7" stroke="#16a34a" strokeWidth="2"/>
              <path d="M12 22h12M12 28h12M12 34h8" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"/>
              <rect x="34" y="12" width="24" height="32" rx="3" fill="#dcfce7" stroke="#16a34a" strokeWidth="2"/>
              <path d="M40 22h12M40 28h12M40 34h8" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"/>
              <path d="M28 28h8" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 3"/>
            </svg>
          </div>
          <h3 className="empty-state__heading">Not enough reports to compare</h3>
          <p className="empty-state__text">
            Upload at least 2 reports to compare your biomarker trends side by side
          </p>
          <Link href="/upload" className="empty-state__cta">
            Upload Report
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="compare-page">
      <NavHeader backLabel="Reports" />
      <h1>Compare Reports</h1>
      <p className="compare-page__subtitle">
        Select 2 to 5 reports to compare biomarker values side by side.
      </p>

      {/* Report selector */}
      <div className="compare-selector">
        <div className="compare-selector__filters">
          <label className="compare-selector__filter-label" htmlFor="date-filter">
            Date range:
          </label>
          <select
            id="date-filter"
            className="compare-selector__date-select"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilter)}
          >
            <option value="all">All Time</option>
            <option value="3months">Last 3 months</option>
            <option value="6months">Last 6 months</option>
            <option value="1year">Last year</option>
          </select>
        </div>

        <div className="compare-selector__list">
          {filteredReports.length === 0 ? (
            <p className="compare-selector__empty">
              No analyzed reports found for the selected date range.
            </p>
          ) : (
            filteredReports.map((report) => (
              <label
                key={report.id}
                className={`compare-selector__item ${
                  selectedIds.has(report.id)
                    ? "compare-selector__item--selected"
                    : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(report.id)}
                  onChange={() => toggleReport(report.id)}
                  disabled={
                    !selectedIds.has(report.id) && selectedIds.size >= 5
                  }
                />
                <span className="compare-selector__item-name">
                  {report.file_name}
                </span>
                <span className="compare-selector__item-date">
                  {formatDate(report.created_at)}
                </span>
              </label>
            ))
          )}
        </div>

        <button
          className="compare-selector__btn"
          onClick={handleCompare}
          disabled={selectedIds.size < 2 || comparing}
        >
          {comparing
            ? "Comparing..."
            : `Compare ${selectedIds.size} Reports`}
        </button>
      </div>

      {error && (
        <div className="compare-page__error" role="alert">
          {error}
        </div>
      )}

      {/* Comparison results */}
      {result && (
        <>
          {/* Summary banner */}
          <div className="compare-summary">
            <div className="compare-summary__item compare-summary__item--improving">
              <span className="compare-summary__count">
                {result.summary.improving}
              </span>
              <span className="compare-summary__label">Improving</span>
            </div>
            <div className="compare-summary__item compare-summary__item--stable">
              <span className="compare-summary__count">
                {result.summary.stable}
              </span>
              <span className="compare-summary__label">Stable</span>
            </div>
            <div className="compare-summary__item compare-summary__item--worsening">
              <span className="compare-summary__count">
                {result.summary.worsening}
              </span>
              <span className="compare-summary__label">Need Attention</span>
            </div>
          </div>

          {/* View as charts link */}
          <div className="compare-page__chart-link">
            <Link href="/reports/trends">
              View as Charts
            </Link>
          </div>

          {/* Disclaimer */}
          <p className="compare-page__disclaimer">
            Trends are informational only and do not constitute medical advice.
            Consult your healthcare provider for interpretation.
          </p>

          {/* Grouped tables */}
          {Object.entries(groupedBiomarkers).map(([category, biomarkers]) => (
            <div key={category} className="compare-table__group">
              <h2 className="compare-table__category">{category}</h2>
              <div className="compare-table__wrapper">
                <table className="compare-table">
                  <thead>
                    <tr>
                      <th className="compare-table__th--name">Biomarker</th>
                      {result.reports.map((r) => (
                        <th key={r.id} className="compare-table__th--value">
                          {formatDate(r.created_at)}
                        </th>
                      ))}
                      <th className="compare-table__th--trend">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {biomarkers.map((b) => (
                      <tr key={b.name}>
                        <td className="compare-table__name">{b.name}</td>
                        {b.values.map((v) => (
                          <td
                            key={v.reportId}
                            className={`compare-table__value ${flagClass(v.flag)}`}
                          >
                            {v.value !== null
                              ? `${v.value} ${v.unit}`
                              : "-"}
                          </td>
                        ))}
                        <td className="compare-table__trend">
                          <TrendArrow trend={b.trend} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
