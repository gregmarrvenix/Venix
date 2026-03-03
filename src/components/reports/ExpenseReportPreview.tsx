"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/timezone";
import { generateExpenseReport } from "@/lib/pdf-generator";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { ReportFilterValues } from "./ReportFilters";
import type { Expense } from "@/lib/types";

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

interface ExpenseReportPreviewProps {
  filters: ReportFilterValues;
}

export function ExpenseReportPreview({ filters }: ExpenseReportPreviewProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setExpenses([]);

    apiFetch<{ expenses: Expense[] }>("/api/reports/expenses", {
      method: "POST",
      body: JSON.stringify({
        customer_id: filters.customer_id,
        from: filters.from,
        to: filters.to,
      }),
    })
      .then((data) => {
        if (!cancelled) setExpenses(data.expenses);
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
      const pdfBytes = generateExpenseReport({
        customerName: filters.customerName || "Unknown",
        periodLabel: filters.periodLabel || `${filters.from} — ${filters.to}`,
        expenses,
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
    ? groupByCustomerFn(expenses)
    : null;

  const projectGrouped = !isAllCustomers && groupByProject
    ? groupByProjectFn(expenses)
    : null;

  const totalAmount = expenses.reduce(
    (sum, e) => sum + Number(e.amount),
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
              {expenses.length} expenses · ${totalAmount.toFixed(2)} total
            </p>
          )}
        </div>
        <Button onClick={handleGeneratePdf} loading={generating} size="sm" disabled={loading || expenses.length === 0}>
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
      ) : expenses.length === 0 ? (
        <div className="py-8 text-center text-slate-400">No expenses found for this period</div>
      ) : isAllCustomers && customerGrouped ? (
        <div className="space-y-6">
          {customerGrouped.map(({ customerName, expenses: custExpenses, total }) => (
            <div key={customerName}>
              <h4 className="text-sm font-medium text-purple-400 mb-2">{customerName}</h4>
              <ExpenseTable expenses={custExpenses} />
              <div className="text-right text-sm text-slate-300 mt-1 font-medium">
                Subtotal: ${total.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      ) : projectGrouped ? (
        <div className="space-y-6">
          {projectGrouped.map(({ projectName, expenses: projExpenses, total }) => (
            <div key={projectName}>
              <h4 className="text-sm font-medium text-indigo-400 mb-2">{projectName}</h4>
              <ExpenseTable expenses={projExpenses} />
              <div className="text-right text-sm text-slate-300 mt-1 font-medium">
                Subtotal: ${total.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ExpenseTable expenses={expenses} />
      )}
    </div>
  );
}

function ExpenseTable({ expenses }: { expenses: Expense[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700 text-left text-xs text-slate-400">
            <th className="pb-2 pr-3">Date</th>
            <th className="pb-2 pr-3">Project</th>
            <th className="pb-2 pr-3">Amount</th>
            <th className="pb-2 pr-3">Billable</th>
            <th className="pb-2 pr-3">Contractor</th>
            <th className="pb-2">Description</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((e) => (
            <tr key={e.id} className="border-b border-slate-700/50">
              <td className="py-2 pr-3 text-slate-300 whitespace-nowrap">{formatDate(e.expense_date)}</td>
              <td className="py-2 pr-3 text-slate-300">{e.project?.name}</td>
              <td className="py-2 pr-3 text-indigo-400">${Number(e.amount).toFixed(2)}</td>
              <td className="py-2 pr-3 text-slate-300">{e.is_billable ? "Yes" : "No"}</td>
              <td className="py-2 pr-3 text-slate-300">{e.contractor?.display_name}</td>
              <td className="py-2 text-slate-400 truncate max-w-[200px]">{e.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function groupByCustomerFn(expenses: Expense[]) {
  const map = new Map<string, Expense[]>();
  for (const expense of expenses) {
    const name = expense.customer?.name || "Unknown";
    if (!map.has(name)) map.set(name, []);
    map.get(name)!.push(expense);
  }
  return Array.from(map.entries()).map(([customerName, expenses]) => ({
    customerName,
    expenses,
    total: expenses.reduce((sum, e) => sum + Number(e.amount), 0),
  }));
}

function groupByProjectFn(expenses: Expense[]) {
  const map = new Map<string, Expense[]>();
  for (const expense of expenses) {
    const name = expense.project?.name || "No Project";
    if (!map.has(name)) map.set(name, []);
    map.get(name)!.push(expense);
  }
  return Array.from(map.entries()).map(([projectName, expenses]) => ({
    projectName,
    expenses,
    total: expenses.reduce((sum, e) => sum + Number(e.amount), 0),
  }));
}
