"use client";

import { useState } from "react";
import { ReportFilters, type ReportFilterValues } from "@/components/reports/ReportFilters";
import { ReportPreview } from "@/components/reports/ReportPreview";
import { ExpenseReportPreview } from "@/components/reports/ExpenseReportPreview";

type ReportTab = "time" | "expenses";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>("time");
  const [filters, setFilters] = useState<ReportFilterValues | null>(null);

  function handleTabChange(tab: ReportTab) {
    setActiveTab(tab);
    setFilters(null);
  }

  return (
    <div className="space-y-6 py-6">
      <h1 className="text-xl font-bold text-slate-200">Reports</h1>

      <div className="flex gap-2">
        <button
          onClick={() => handleTabChange("time")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "time"
              ? "bg-indigo-600 text-white"
              : "bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700"
          }`}
        >
          Time
        </button>
        <button
          onClick={() => handleTabChange("expenses")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "expenses"
              ? "bg-indigo-600 text-white"
              : "bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700"
          }`}
        >
          Expenses
        </button>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
        <ReportFilters onGenerate={setFilters} activeTab={activeTab} />
      </div>

      {filters && activeTab === "time" && (
        <ReportPreview filters={filters} />
      )}
      {filters && activeTab === "expenses" && (
        <ExpenseReportPreview filters={filters} />
      )}
    </div>
  );
}
