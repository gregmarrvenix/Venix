"use client";

import { useState } from "react";
import { useCustomers } from "@/hooks/useCustomers";
import { nowAEST } from "@/lib/timezone";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { Button } from "@/components/ui/Button";

export interface ReportFilterValues {
  customer_id: string;
  customerName: string;
  from: string;
  to: string;
  group_by_project: boolean;
  periodLabel: string;
}

interface ReportFiltersProps {
  onGenerate: (filters: ReportFilterValues) => void;
}

type Period = "this_month" | "last_month" | "prior_month" | "two_months_prior" | "custom";

function getMonthRange(monthsBack: number): { from: string; to: string; label: string } {
  const now = nowAEST();
  const target = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  const end = new Date(target.getFullYear(), target.getMonth() + 1, 0);
  const from = target.toISOString().split("T")[0];
  const to = end.toISOString().split("T")[0];
  const label = target.toLocaleString("en-AU", { month: "long", year: "numeric" });
  return { from, to, label };
}

export function ReportFilters({ onGenerate }: ReportFiltersProps) {
  const { customers, loading: customersLoading } = useCustomers();
  const [customerId, setCustomerId] = useState("");
  const [period, setPeriod] = useState<Period>("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [groupByProject, setGroupByProject] = useState(false);
  const [error, setError] = useState("");

  function handleGenerate() {
    if (!customerId) {
      setError("Please select a customer");
      return;
    }

    let from: string;
    let to: string;
    let periodLabel: string;

    if (period === "custom") {
      if (!customFrom || !customTo) {
        setError("Please select date range");
        return;
      }
      from = customFrom;
      to = customTo;
      periodLabel = `${customFrom} to ${customTo}`;
    } else {
      const monthsBack = period === "this_month" ? 0 : period === "last_month" ? 1 : period === "prior_month" ? 2 : 3;
      const range = getMonthRange(monthsBack);
      from = range.from;
      to = range.to;
      periodLabel = range.label;
    }

    const customer = customers.find((c) => c.id === customerId);
    setError("");
    onGenerate({
      customer_id: customerId,
      customerName: customer?.name ?? "",
      from,
      to,
      group_by_project: groupByProject,
      periodLabel,
    });
  }

  const customerOptions = customers.map((c) => ({ value: c.id, label: c.name }));

  const periodOptions = [
    { value: "this_month", label: "This month" },
    { value: "last_month", label: "Last calendar month" },
    { value: "prior_month", label: "Prior calendar month" },
    { value: "two_months_prior", label: "Two months prior" },
    { value: "custom", label: "Custom date range" },
  ];

  return (
    <div className="space-y-4">
      <Select
        label="Customer"
        value={customerId}
        onChange={(e) => {
          setCustomerId(e.target.value);
          setError("");
        }}
        options={[{ value: "", label: customersLoading ? "Loading..." : "Select customer" }, ...customerOptions]}
        error={!customerId && error ? error : undefined}
      />

      <Select
        label="Time Period"
        value={period}
        onChange={(e) => setPeriod(e.target.value as Period)}
        options={periodOptions}
      />

      {period === "custom" && (
        <div className="grid grid-cols-2 gap-4">
          <DatePicker
            label="From"
            value={customFrom}
            onChange={setCustomFrom}
          />
          <DatePicker
            label="To"
            value={customTo}
            onChange={setCustomTo}
          />
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
        <input
          type="checkbox"
          checked={groupByProject}
          onChange={(e) => setGroupByProject(e.target.checked)}
          className="rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
        />
        Group by project
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button onClick={handleGenerate} className="w-full">
        Generate Report
      </Button>
    </div>
  );
}
