"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import NavHeader from "@/components/ui/NavHeader";
import { CLINICAL_SUMMARY_DISCLAIMER } from "@/lib/claude/summary-prompt";

interface SummaryData {
  summary: string;
  patient_name: string;
  report_name: string;
  report_date: string;
  health_score: number;
  health_score_label: string;
  generated_at: string;
}

/** Parse the structured summary text into named sections. */
function parseSections(text: string): { heading: string; lines: string[] }[] {
  const sections: { heading: string; lines: string[] }[] = [];
  let current: { heading: string; lines: string[] } | null = null;

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    // Detect section headings (ALL-CAPS lines)
    if (/^[A-Z][A-Z\s'/-]{3,}$/.test(line)) {
      if (current) sections.push(current);
      current = { heading: line, lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);
  return sections;
}

/** Determine whether a section uses numbered (ordered) list items. */
function isNumberedSection(heading: string): boolean {
  return (
    heading.startsWith("SUGGESTED DISCUSSION") ||
    heading.startsWith("QUESTIONS")
  );
}

export default function ReportClinicalSummaryPage() {
  const { id: reportId } = useParams<{ id: string }>();
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${reportId}/clinical-summary`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to generate summary");
      }
      const json: SummaryData = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    generateSummary();
  }, [generateSummary]);

  const handlePrint = () => window.print();

  const formattedDate = data
    ? new Date(data.generated_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  const sections = data ? parseSections(data.summary) : [];

  return (
    <>
      <NavHeader backLabel="Report" backHref={`/reports/${reportId}`} />
      <main className="clinical-summary" role="main">
        {/* Action buttons — hidden when printing */}
        <div className="clinical-summary__actions">
          <Link
            href={`/reports/${reportId}`}
            className="btn btn--outline"
          >
            Back to Report
          </Link>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handlePrint}
            disabled={loading || !!error}
          >
            Print / Save as PDF
          </button>
        </div>

        {loading && (
          <div className="clinical-summary__loading" role="status">
            <p>Generating clinical summary notes...</p>
            <p className="clinical-summary__loading-sub">
              This may take a few seconds.
            </p>
          </div>
        )}

        {error && (
          <div className="clinical-summary__error" role="alert">
            <p>{error}</p>
            <button
              type="button"
              className="btn btn--outline"
              onClick={generateSummary}
            >
              Try Again
            </button>
          </div>
        )}

        {data && !loading && (
          <>
            <header className="clinical-summary__header">
              <h1 className="clinical-summary__title">
                HealthChat AI — Clinical Summary Notes
              </h1>
              <p className="clinical-summary__patient-info">
                Patient: {data.patient_name} | Generated: {formattedDate}
              </p>
              {data.report_name && (
                <p className="clinical-summary__patient-info">
                  Source report: {data.report_name}
                </p>
              )}
              {typeof data.health_score === "number" && (
                <p className="clinical-summary__patient-info">
                  Health Credit Score: {data.health_score}/850 (
                  {data.health_score_label})
                </p>
              )}
            </header>

            {sections.map((section, idx) => (
              <section key={idx} className="clinical-summary__section">
                <h2 className="clinical-summary__section-title">
                  {section.heading}
                </h2>
                {isNumberedSection(section.heading) ? (
                  <ol className="clinical-summary__numbered">
                    {section.lines.map((line, i) => (
                      <li key={i}>{line.replace(/^\d+\.\s*/, "")}</li>
                    ))}
                  </ol>
                ) : (
                  <ul className="clinical-summary__list">
                    {section.lines.map((line, i) => (
                      <li key={i}>{line.replace(/^[•\-]\s*/, "")}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            <footer className="clinical-summary__disclaimer">
              {CLINICAL_SUMMARY_DISCLAIMER}
              <br />
              Generated by HealthChat AI
            </footer>
          </>
        )}
      </main>
    </>
  );
}
