"use client";

import { useState } from "react";
import { ReportFilters, type ReportFilterValues } from "@/components/reports/ReportFilters";
import { ReportPreview } from "@/components/reports/ReportPreview";

export default function ReportsPage() {
  const [filters, setFilters] = useState<ReportFilterValues | null>(null);

  return (
    <div className="space-y-6 py-6">
      <h1 className="text-xl font-bold text-slate-200">Reports</h1>

      <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
        <ReportFilters onGenerate={setFilters} />
      </div>

      {filters && (
        <ReportPreview filters={filters} />
      )}
    </div>
  );
}
