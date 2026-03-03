"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api-client";
import { formatDate, formatTime, calculateHours } from "@/lib/timezone";
import { generateTimeReport } from "@/lib/pdf-generator";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { ReportFilterValues } from "./ReportFilters";
import type { TimeEntry } from "@/lib/types";

let cachedClientLogo: string | null = null;

async function getClientLogo(): Promise<string | undefined> {
  if (cachedClientLogo !== null) return cachedClientLogo || undefined;
  try {
    return new Promise<string | undefined>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        cachedClientLogo = canvas.toDataURL("image/png");
        resolve(cachedClientLogo);
      };
      img.onerror = () => {
        cachedClientLogo = "";
        resolve(undefined);
      };
      img.src = "/logo.webp";
    });
  } catch {
    cachedClientLogo = "";
    return undefined;
  }
}

interface ReportPreviewProps {
  filters: ReportFilterValues;
}

export function ReportPreview({ filters }: ReportPreviewProps) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setEntries([]);

    apiFetch<{ entries: TimeEntry[] }>("/api/reports/data", {
      method: "POST",
      body: JSON.stringify({
        customer_id: filters.customer_id,
        from: filters.from,
        to: filters.to,
      }),
    })
      .then((data) => {
        if (!cancelled) setEntries(data.entries);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load report data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [filters.customer_id, filters.from, filters.to]);

  async function handleGeneratePdf() {
    setGenerating(true);
    try {
      const logoPng = await getClientLogo();
      const pdfBytes = generateTimeReport({
        customerName: filters.customerName || "Unknown",
        periodLabel: filters.periodLabel || `${filters.from} — ${filters.to}`,
        entries,
        groupByProject: filters.group_by_project ?? false,
        logoPng,
      });

      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      toast.success("PDF opened in new tab");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate PDF");
    } finally {
      setGenerating(false);
    }
  }

  const isAllCustomers = filters.customer_id === "__all__";
  const groupByProject = filters.group_by_project ?? false;

  const customerGrouped = isAllCustomers
    ? groupByCustomerFn(entries)
    : null;

  const projectGrouped = !isAllCustomers && groupByProject
    ? groupByProjectFn(entries)
    : null;

  const totalHours = entries.reduce(
    (sum, e) => sum + calculateHours(e.start_time, e.end_time, e.break_minutes ?? 0),
    0
  );

  return (
    <div className="rounded-lg bg-slate-800 border border-slate-700 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-slate-300">
            {filters.customerName} — {filters.periodLabel}
          </h3>
          <p className="text-xs text-slate-500">{filters.from} to {filters.to}</p>
          {!loading && !error && (
            <p className="text-xs text-slate-400 mt-1">
              {entries.length} entries · {totalHours.toFixed(2)} hours total
            </p>
          )}
        </div>
        <Button onClick={handleGeneratePdf} loading={generating} size="sm" disabled={loading || entries.length === 0}>
          Generate PDF
        </Button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-slate-400">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-500 mb-2" />
          <p>Loading report data...</p>
        </div>
      ) : error ? (
        <div className="py-8 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="py-8 text-center text-slate-400">No entries found for this period</div>
      ) : isAllCustomers && customerGrouped ? (
        <div className="space-y-6">
          {customerGrouped.map(({ customerName, entries: custEntries, total }) => (
            <div key={customerName}>
              <h4 className="text-sm font-medium text-purple-400 mb-2">{customerName}</h4>
              <EntryTable entries={custEntries} showCustomer={false} />
              <div className="text-right text-sm text-slate-300 mt-1 font-medium">
                Subtotal: {total.toFixed(2)}h
              </div>
            </div>
          ))}
        </div>
      ) : projectGrouped ? (
        <div className="space-y-6">
          {projectGrouped.map(({ projectName, entries: projEntries, total }) => (
            <div key={projectName}>
              <h4 className="text-sm font-medium text-indigo-400 mb-2">{projectName}</h4>
              <EntryTable entries={projEntries} showCustomer={false} />
              <div className="text-right text-sm text-slate-300 mt-1 font-medium">
                Subtotal: {total.toFixed(2)}h
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EntryTable entries={entries} showCustomer={false} />
      )}
    </div>
  );
}

function EntryTable({ entries, showCustomer }: { entries: TimeEntry[]; showCustomer: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700 text-left text-xs text-slate-400">
            <th className="pb-2 pr-3">Date</th>
            {showCustomer && <th className="pb-2 pr-3">Customer</th>}
            <th className="pb-2 pr-3">Project</th>
            <th className="pb-2 pr-3">Start</th>
            <th className="pb-2 pr-3">Finish</th>
            <th className="pb-2 pr-3">Hours</th>
            <th className="pb-2 pr-3">Contractor</th>
            <th className="pb-2">Description</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => {
            const hours = calculateHours(e.start_time, e.end_time, e.break_minutes ?? 0);
            return (
              <tr key={e.id} className="border-b border-slate-700/50">
                <td className="py-2 pr-3 text-slate-300 whitespace-nowrap">{formatDate(e.entry_date)}</td>
                {showCustomer && (
                  <td className="py-2 pr-3 text-slate-300">{e.customer?.name}</td>
                )}
                <td className="py-2 pr-3 text-slate-300">{e.project?.name}</td>
                <td className="py-2 pr-3 text-slate-300 whitespace-nowrap">{formatTime(e.start_time)}</td>
                <td className="py-2 pr-3 text-slate-300 whitespace-nowrap">{formatTime(e.end_time)}</td>
                <td className="py-2 pr-3 text-indigo-400">{hours.toFixed(1)}</td>
                <td className="py-2 pr-3 text-slate-300">{e.contractor?.display_name}</td>
                <td className="py-2 text-slate-400 truncate max-w-[200px]">{e.description}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function groupByCustomerFn(entries: TimeEntry[]) {
  const map = new Map<string, TimeEntry[]>();
  for (const entry of entries) {
    const name = entry.customer?.name || "Unknown";
    if (!map.has(name)) map.set(name, []);
    map.get(name)!.push(entry);
  }
  return Array.from(map.entries()).map(([customerName, entries]) => ({
    customerName,
    entries,
    total: entries.reduce(
      (sum, e) => sum + calculateHours(e.start_time, e.end_time, e.break_minutes ?? 0),
      0
    ),
  }));
}

function groupByProjectFn(entries: TimeEntry[]) {
  const map = new Map<string, TimeEntry[]>();
  for (const entry of entries) {
    const name = entry.project?.name || "No Project";
    if (!map.has(name)) map.set(name, []);
    map.get(name)!.push(entry);
  }
  return Array.from(map.entries()).map(([projectName, entries]) => ({
    projectName,
    entries,
    total: entries.reduce(
      (sum, e) => sum + calculateHours(e.start_time, e.end_time, e.break_minutes ?? 0),
      0
    ),
  }));
}
