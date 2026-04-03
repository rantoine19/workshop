"use client";

import NavHeader from "@/components/ui/NavHeader";
import ReportList from "@/components/reports/ReportList";

export default function ReportsPage() {
  return (
    <div className="reports-page">
      <NavHeader backLabel="Dashboard" />
      <ReportList />
    </div>
  );
}
