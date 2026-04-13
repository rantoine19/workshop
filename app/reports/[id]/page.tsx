"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import HealthSummary from "@/components/reports/HealthSummary";
import RiskDashboard from "@/components/reports/RiskDashboard";
import WhatsChanged from "@/components/reports/WhatsChanged";
import NavHeader from "@/components/ui/NavHeader";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface ReportData {
  id: string;
  file_name: string;
  file_type: string;
  status: string;
  created_at: string;
  parsed_result_id: string | null;
}

export default function ReportResultsPage() {
  const params = useParams();
  const reportId = params.id as string;

  const router = useRouter();

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/reports/${reportId}`);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Please log in to view this report");
        }
        if (response.status === 404) {
          throw new Error("Report not found");
        }
        throw new Error("Failed to load report");
      }

      const data = await response.json();
      setReport(data.report);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load report"
      );
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete report");
      }
      router.push("/reports");
    } catch {
      setError("Failed to delete report. Please try again.");
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  }, [reportId, router]);

  const handleReanalyze = useCallback(async () => {
    setIsReanalyzing(true);
    setError(null);

    const MAX_RETRIES = 3;
    let lastError = "";

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch("/api/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ report_id: reportId }),
        });

        if (response.ok) {
          await fetchReport();
          return; // Success!
        }

        const data = await response.json().catch(() => ({ error: "Unknown error" }));

        // Check for overloaded/rate limit — retry after delay
        if (response.status === 529 || response.status === 429 ||
            (data.error && (data.error.includes("Overloaded") || data.error.includes("overloaded") || data.error.includes("rate")))) {
          lastError = "Our AI is busy right now. Retrying...";
          if (attempt < MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, 3000 * attempt)); // 3s, 6s, 9s
            continue;
          }
        }

        lastError = data.error || "Re-analysis failed";
        break;
      } catch {
        lastError = "Network error. Please check your connection.";
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
      }
    }

    setError(lastError || "Re-analysis failed. The AI may be temporarily busy — please try again in a minute.");
    setIsReanalyzing(false);
  }, [reportId, fetchReport]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  if (loading) {
    return (
      <div className="report-results report-results--loading">
        <div
          className="report-results__spinner"
          aria-label="Loading report"
          role="status"
        />
        <p>Loading your report...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="report-results report-results--error">
        <p className="report-results__error" role="alert">
          {error}
        </p>
        <div className="report-results__actions">
          <button onClick={fetchReport} className="report-results__retry">
            Try Again
          </button>
          <Link href="/dashboard" className="report-results__back">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  const isParsed = report.status === "parsed" && report.parsed_result_id;
  const isPending = report.status === "uploaded" || report.status === "parsing";
  const isFailed = report.status === "error";

  return (
    <div className="report-results">
      <div className="report-results__header">
        <NavHeader backLabel="Dashboard" />
        <div className="report-results__title-row">
          <h1>{report.file_name}</h1>
          <div className="report-results__header-actions">
            <button
              className="report-results__reanalyze-btn report-results__reanalyze-btn--sm"
              onClick={handleReanalyze}
              disabled={isReanalyzing}
              aria-label="Re-analyze report"
            >
              {isReanalyzing ? "Analyzing..." : "Re-analyze"}
            </button>
            <button
              className="delete-btn delete-btn--danger"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isDeleting}
              aria-label="Delete report"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
        <p className="report-results__meta">
          Uploaded {new Date(report.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          <span
            className={`report-results__status report-results__status--${report.status}`}
          >
            {report.status === "parsed"
              ? "Analyzed"
              : report.status === "parsing"
                ? "Processing"
                : report.status === "uploaded"
                  ? "Pending"
                  : "Error"}
          </span>
        </p>
      </div>

      {isPending && (
        <div className="report-results__pending">
          <div
            className="report-results__spinner"
            aria-label="Processing report"
            role="status"
          />
          <h2>Your report is being analyzed</h2>
          <p>
            This usually takes a minute or two. Refresh the page to check
            progress.
          </p>
          <button onClick={fetchReport} className="report-results__refresh">
            Refresh Status
          </button>
        </div>
      )}

      {isFailed && (
        <div className="report-results__failed" role="alert">
          <h2>Something went wrong</h2>
          <p>
            We were unable to analyze this report. You can try again or
            upload a new copy.
          </p>
          <div className="report-results__failed-actions">
            <button
              onClick={handleReanalyze}
              disabled={isReanalyzing}
              className="report-results__reanalyze-btn"
            >
              {isReanalyzing ? "Analyzing..." : "Try Again"}
            </button>
            <Link href="/upload" className="report-results__upload-link">
              Upload New Report
            </Link>
          </div>
        </div>
      )}

      {isParsed && (
        <>
          <WhatsChanged reportId={reportId} />

          <section className="report-results__section">
            <RiskDashboard reportId={reportId} />
          </section>

          <section className="report-results__section">
            <HealthSummary reportId={reportId} />
          </section>

          <nav className="report-results__nav">
            <Link
              href={`/reports/${reportId}/doctor-prep`}
              className="report-results__nav-card"
            >
              <h3>Prepare for Doctor Visit</h3>
              <p>
                Get personalized questions to ask your doctor about these
                results
              </p>
            </Link>
            <Link href={`/chat?report_id=${reportId}`} className="report-results__nav-card">
              <h3>Chat About Results</h3>
              <p>
                Ask questions about your health data in plain language
              </p>
            </Link>
            <Link
              href={`/reports/compare?ids=${reportId}`}
              className="report-results__nav-card"
            >
              <h3>Compare with Other Reports</h3>
              <p>
                Track changes in your biomarkers over time
              </p>
            </Link>
          </nav>
        </>
      )}

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete Report"
        message="Are you sure? This will permanently delete this report and all its analysis data."
        confirmLabel={isDeleting ? "Deleting..." : "Delete"}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  );
}
