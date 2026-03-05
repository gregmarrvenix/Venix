"use client";

import { useState } from "react";
import { ReportFilters, type ReportFilterValues } from "@/components/reports/ReportFilters";
import { ReportPreview } from "@/components/reports/ReportPreview";
import { ExpenseReportPreview } from "@/components/reports/ExpenseReportPreview";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type ReportTab = "time" | "expenses";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>("time");
  const [filters, setFilters] = useState<ReportFilterValues | null>(null);

  function handleTabChange(value: string) {
    setActiveTab(value as ReportTab);
    setFilters(null);
  }

  return (
    <div className="space-y-6 py-6">
      <h1 className="text-xl font-bold text-slate-200">Reports</h1>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="time">Time</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="time">
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
              <ReportFilters onGenerate={setFilters} activeTab={activeTab} />
            </div>
            {filters && <ReportPreview filters={filters} />}
          </div>
        </TabsContent>

        <TabsContent value="expenses">
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
              <ReportFilters onGenerate={setFilters} activeTab={activeTab} />
            </div>
            {filters && <ExpenseReportPreview filters={filters} />}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
