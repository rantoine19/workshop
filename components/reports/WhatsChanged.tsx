"use client";

import { useState, useEffect } from "react";
import TrendArrow from "./TrendArrow";

interface ChangedBiomarker {
  name: string;
  oldValue: number;
  newValue: number;
  unit: string;
  trend: "improving" | "worsening" | "stable";
}

interface ChangesData {
  hasChanges: boolean;
  previousReportName?: string;
  previousReportDate?: string;
  previousReportId?: string;
  improved?: ChangedBiomarker[];
  worsened?: ChangedBiomarker[];
  stable?: number;
  new?: number;
}

interface WhatsChangedProps {
  reportId: string;
}

export default function WhatsChanged({ reportId }: WhatsChangedProps) {
  const [data, setData] = useState<ChangesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchChanges() {
      try {
        const response = await fetch(`/api/reports/${reportId}/changes`);
        if (!response.ok) return;
        const result = await response.json();
        if (!cancelled) setData(result);
      } catch {
        // Silently fail — banner is non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchChanges();
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  if (loading || !data || !data.hasChanges) return null;

  const improvedCount = data.improved?.length ?? 0;
  const worsenedCount = data.worsened?.length ?? 0;
  const stableCount = data.stable ?? 0;
  const newCount = data.new ?? 0;
  const hasDetails = improvedCount > 0 || worsenedCount > 0;

  const previousDate = data.previousReportDate
    ? new Date(data.previousReportDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <div className="whats-changed" data-testid="whats-changed">
      <div className="whats-changed__header">
        <h3 className="whats-changed__title">What&apos;s Changed</h3>
        {previousDate && (
          <span className="whats-changed__since">
            vs. {previousDate}
          </span>
        )}
      </div>

      <div className="whats-changed__summary">
        {improvedCount > 0 && (
          <span className="whats-changed__improved">
            <TrendArrow trend="improving" size={16} />
            {improvedCount} improved
          </span>
        )}
        {worsenedCount > 0 && (
          <span className="whats-changed__worsened">
            <TrendArrow trend="worsening" size={16} />
            {worsenedCount} need attention
          </span>
        )}
        {stableCount > 0 && (
          <span className="whats-changed__stable">
            {stableCount} stable
          </span>
        )}
        {newCount > 0 && (
          <span className="whats-changed__new">
            {newCount} new
          </span>
        )}
      </div>

      {hasDetails && (
        <>
          <button
            className="whats-changed__toggle"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
          >
            {expanded ? "Hide details" : "Show details"}
          </button>

          {expanded && (
            <div className="whats-changed__details">
              {improvedCount > 0 && (
                <div className="whats-changed__detail-group whats-changed__detail-group--improved">
                  <h4>Improved</h4>
                  <ul>
                    {data.improved!.map((b) => (
                      <li key={b.name}>
                        <TrendArrow trend="improving" size={14} />
                        <span className="whats-changed__biomarker-name">{b.name}</span>
                        <span className="whats-changed__biomarker-values">
                          {b.oldValue} &rarr; {b.newValue} {b.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {worsenedCount > 0 && (
                <div className="whats-changed__detail-group whats-changed__detail-group--worsened">
                  <h4>Needs Attention</h4>
                  <ul>
                    {data.worsened!.map((b) => (
                      <li key={b.name}>
                        <TrendArrow trend="worsening" size={14} />
                        <span className="whats-changed__biomarker-name">{b.name}</span>
                        <span className="whats-changed__biomarker-values">
                          {b.oldValue} &rarr; {b.newValue} {b.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {data.previousReportId && (
        <a
          href={`/reports/compare?ids=${data.previousReportId},${reportId}`}
          className="whats-changed__link"
        >
          See full comparison &rarr;
        </a>
      )}
    </div>
  );
}
