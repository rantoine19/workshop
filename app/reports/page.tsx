"use client";

import NavHeader from "@/components/ui/NavHeader";
import ReportList from "@/components/reports/ReportList";
import SearchBar from "@/components/ui/SearchBar";

export default function ReportsPage() {
  return (
    <div className="reports-page">
      <NavHeader backLabel="Dashboard" />
      <div className="reports-page__searchbar">
        <SearchBar />
      </div>
      <ReportList />
    </div>
  );
}
