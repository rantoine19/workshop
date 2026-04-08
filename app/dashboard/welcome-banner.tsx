"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function WelcomeBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    async function checkReports() {
      try {
        const response = await fetch("/api/reports");
        if (!response.ok) return;
        const data = await response.json();
        const reports = data.reports || [];
        if (reports.length === 0) {
          setShow(true);
        }
      } catch {
        // Silently fail — banner is optional
      }
    }
    checkReports();
  }, []);

  if (!show) return null;

  return (
    <div className="dashboard-welcome-banner">
      <h3 className="dashboard-welcome-banner__heading">
        Welcome to HealthChat AI!
      </h3>
      <p className="dashboard-welcome-banner__text">
        Get started by uploading your first lab report. We&apos;ll help you
        understand your results in plain, simple language.
      </p>
      <Link href="/upload" className="dashboard-welcome-banner__cta">
        Upload Your First Report
      </Link>
    </div>
  );
}
