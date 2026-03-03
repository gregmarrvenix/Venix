"use client";

import { useState } from "react";
import { getAccessToken } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { ReportFilterValues } from "./ReportFilters";

interface ReportPreviewProps {
  filters: ReportFilterValues;
}

export function ReportPreview({ filters }: ReportPreviewProps) {
  const [generating, setGenerating] = useState(false);
  const toast = useToast();

  async function handleGenerate() {
    setGenerating(true);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/reports/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customer_id: filters.customer_id,
          from: filters.from,
          to: filters.to,
          group_by_project: filters.group_by_project,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "PDF generation failed" }));
        throw new Error(err.error || "PDF generation failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      toast.success("PDF opened in new tab");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate PDF");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="rounded-lg bg-slate-800 border border-slate-700 p-4 space-y-3">
      <h3 className="text-sm font-medium text-slate-300">Report Summary</h3>
      <dl className="text-sm space-y-1">
        <div className="flex gap-2">
          <dt className="text-slate-400">Customer:</dt>
          <dd className="text-slate-200">{filters.customerName}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-slate-400">Period:</dt>
          <dd className="text-slate-200">{filters.periodLabel}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-slate-400">Date range:</dt>
          <dd className="text-slate-200">{filters.from} to {filters.to}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-slate-400">Group by project:</dt>
          <dd className="text-slate-200">{filters.group_by_project ? "Yes" : "No"}</dd>
        </div>
      </dl>
      <Button onClick={handleGenerate} loading={generating} className="w-full">
        Generate PDF
      </Button>
    </div>
  );
}
