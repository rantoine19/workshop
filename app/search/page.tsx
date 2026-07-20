"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import NavHeader from "@/components/ui/NavHeader";
import SearchBar from "@/components/ui/SearchBar";
import TrendArrow from "@/components/reports/TrendArrow";

interface BiomarkerReading {
  reportId: string;
  reportName: string;
  date: string;
  value: number;
  unit: string;
  flag: string;
}

interface BiomarkerResult {
  canonicalName: string;
  category: string;
  readingCount: number;
  trend: "improving" | "worsening" | "stable";
  readings: BiomarkerReading[];
}

interface ReportResult {
  id: string;
  name: string;
  date: string;
  biomarkerCount: number;
}

interface SearchResponse {
  query: string;
  totalResults: number;
  biomarkers: BiomarkerResult[];
  reports: ReportResult[];
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function flagLabel(flag: string): string {
  if (flag === "green") return "Normal";
  if (flag === "yellow") return "Borderline";
  if (flag === "red") return "Out of range";
  return flag;
}

function BiomarkerCard({ result }: { result: BiomarkerResult }) {
  const [expanded, setExpanded] = useState(false);
  const latest = result.readings[0];

  return (
    <div className="search-result-card">
      <button
        type="button"
        className="search-result-card__toggle"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="search-result-card__header">
          <div>
            <div className="search-result-card__title">
              {result.canonicalName}
            </div>
            <div className="search-result-card__category">
              {result.category} · {result.readingCount} reading
              {result.readingCount === 1 ? "" : "s"}
            </div>
          </div>
          <TrendArrow trend={result.trend} />
        </div>
        {latest && (
          <div className="search-result-card__latest">
            <span className="search-result-card__latest-value">
              {latest.value}
              <span className="search-result-card__latest-unit">
                {" "}
                {latest.unit}
              </span>
            </span>
            <span
              className={`search-result-card__flag search-result-card__flag--${latest.flag}`}
            >
              {flagLabel(latest.flag)}
            </span>
            <span className="search-result-card__latest-date">
              {formatDate(latest.date)}
            </span>
          </div>
        )}
      </button>
      {expanded && (
        <div className="search-result-card__readings">
          {result.readings.map((r, idx) => (
            <Link
              key={`${r.reportId}-${idx}`}
              href={`/reports/${r.reportId}`}
              className="search-result-card__reading-row"
            >
              <span className="search-result-card__reading-date">
                {formatDate(r.date)}
              </span>
              <span className="search-result-card__reading-value">
                {r.value} {r.unit}
              </span>
              <span
                className={`search-result-card__flag search-result-card__flag--${r.flag}`}
              >
                {flagLabel(r.flag)}
              </span>
              <span className="search-result-card__reading-report">
                {r.reportName}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportCard({ result }: { result: ReportResult }) {
  return (
    <Link
      href={`/reports/${result.id}`}
      className="search-result-card search-result-card--report"
    >
      <div className="search-result-card__header">
        <div className="search-result-card__title">{result.name}</div>
      </div>
      <div className="search-result-card__category">
        {formatDate(result.date)} · {result.biomarkerCount} biomarker
        {result.biomarkerCount === 1 ? "" : "s"}
      </div>
    </Link>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim();

  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Please log in to search.");
        }
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Search failed");
      }
      const json = (await res.json()) as SearchResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (query.length >= 2) {
      fetchResults(query);
    } else {
      setData(null);
      setError(null);
    }
  }, [query, fetchResults]);

  return (
    <div className="search-page">
      <NavHeader backLabel="Dashboard" />
      <div className="search-page__container">
        <div className="search-page__searchbar">
          <SearchBar defaultValue={query} />
        </div>

        {query.length < 2 && (
          <div className="search-page__empty">
            <h2 className="search-page__empty-title">
              Search across all your reports
            </h2>
            <p className="search-page__empty-text">
              Find biomarker readings, trends, and reports. Try searching
              for:
            </p>
            <ul className="search-page__empty-examples">
              <li>cholesterol</li>
              <li>LDL</li>
              <li>glucose</li>
              <li>vitamin d</li>
              <li>thyroid</li>
            </ul>
          </div>
        )}

        {loading && (
          <div className="search-page__loading">
            <div className="search-page__skeleton" />
            <div className="search-page__skeleton" />
            <div className="search-page__skeleton" />
          </div>
        )}

        {error && !loading && (
          <div className="search-page__error">{error}</div>
        )}

        {data && !loading && !error && (
          <>
            {data.totalResults === 0 ? (
              <div className="search-page__empty">
                <h2 className="search-page__empty-title">No matches found</h2>
                <p className="search-page__empty-text">
                  We couldn&apos;t find any biomarkers or reports matching
                  &quot;{data.query}&quot;. Try a different term — like
                  &quot;cholesterol&quot;, &quot;a1c&quot;, or part of a
                  filename.
                </p>
              </div>
            ) : (
              <>
                {data.biomarkers.length > 0 && (
                  <section className="search-page__section">
                    <h2 className="search-page__section-title">
                      Matching Biomarkers ({data.biomarkers.length})
                    </h2>
                    <div className="search-page__results">
                      {data.biomarkers.map((b) => (
                        <BiomarkerCard key={b.canonicalName} result={b} />
                      ))}
                    </div>
                  </section>
                )}

                {data.reports.length > 0 && (
                  <section className="search-page__section">
                    <h2 className="search-page__section-title">
                      Matching Reports ({data.reports.length})
                    </h2>
                    <div className="search-page__results">
                      {data.reports.map((r) => (
                        <ReportCard key={r.id} result={r} />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="search-page">
          <div className="search-page__container">
            <div className="search-page__loading">Loading...</div>
          </div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
