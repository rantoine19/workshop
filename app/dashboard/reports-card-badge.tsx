"use client";

import { useEffect, useState } from "react";

export function ReportsCardBadge() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    async function fetchCount() {
      try {
        const response = await fetch("/api/reports");
        if (!response.ok) return;
        const data = await response.json();
        const reports = data.reports || [];
        if (reports.length > 0) {
          setCount(reports.length);
        }
      } catch {
        // Silently fail — badge is optional
      }
    }
    fetchCount();
  }, []);

  if (count === null) return null;

  return <span className="dashboard-card__badge">{count}</span>;
}
