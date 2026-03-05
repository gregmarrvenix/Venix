"use client";

import { useState, useMemo, useRef } from "react";
import { useCustomers } from "@/hooks/useCustomers";
import { useContractors } from "@/hooks/useContractors";
import { nowAEST } from "@/lib/timezone";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface ReportFilterValues {
  customer_id: string;
  customer_ids: string[];
  customerName: string;
  from: string;
  to: string;
  group_by_project: boolean;
  periodLabel: string;
  contractor_ids: string[];
  _fetchKey: number;
}

interface ReportFiltersProps {
  onGenerate: (filters: ReportFilterValues) => void;
  activeTab?: "time" | "expenses";
}

function padDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getMonthRange(monthsBack: number): { from: string; to: string; label: string } {
  const now = nowAEST();
  const target = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  const end = new Date(target.getFullYear(), target.getMonth() + 1, 0);
  const from = padDate(target);
  const to = padDate(end);
  const label = target.toLocaleString("en-AU", { month: "long", year: "numeric" });
  return { from, to, label };
}

function getMonthName(monthsBack: number): string {
  const now = nowAEST();
  const target = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  return target.toLocaleString("en-AU", { month: "long", year: "numeric" });
}

export function ReportFilters({ onGenerate, activeTab }: ReportFiltersProps) {
  const { customers, loading: customersLoading } = useCustomers();
  const { contractors, loading: contractorsLoading } = useContractors();
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [period, setPeriod] = useState("1");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [groupByProject, setGroupByProject] = useState(false);
  const [selectedContractorIds, setSelectedContractorIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const hasGenerated = useRef(false);
  const fetchKeyRef = useRef(0);

  const activeCustomers = useMemo(
    () => customers.filter((c) => c.is_active),
    [customers]
  );

  const isAllCustomers = selectedCustomerIds.length === 0;

  function toggleAllCustomers() {
    if (isAllCustomers) {
      setSelectedCustomerIds(["__none__"]);
    } else {
      setSelectedCustomerIds([]);
    }
    setError("");
  }

  function toggleCustomer(id: string) {
    setError("");
    if (isAllCustomers) {
      setSelectedCustomerIds([id]);
      return;
    }
    setSelectedCustomerIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (next.length === activeCustomers.length && activeCustomers.every((c) => next.includes(c.id))) {
        return [];
      }
      if (next.length === 0 || (next.length === 1 && next[0] === "__none__")) {
        return ["__none__"];
      }
      return next.filter((x) => x !== "__none__");
    });
  }

  const periodOptions = useMemo(() => {
    const options = [];
    options.push({ value: "0", label: `Current month — ${getMonthName(0)}` });
    for (let i = 1; i <= 5; i++) {
      const label = i === 1
        ? `Previous month — ${getMonthName(i)}`
        : `${getMonthName(i)}`;
      options.push({ value: String(i), label });
    }
    options.push({ value: "custom", label: "Custom date range" });
    return options;
  }, []);

  const activeContractors = useMemo(
    () => contractors.filter((c) => c.is_active),
    [contractors]
  );

  const isAllContractors = selectedContractorIds.length === 0;

  function toggleAllContractors() {
    if (isAllContractors) {
      // Deselect all — empty selection means nothing selected
      setSelectedContractorIds(["__none__"]);
    } else {
      // Select all
      setSelectedContractorIds([]);
    }
  }

  function toggleContractor(id: string) {
    if (isAllContractors) {
      // Switching from "all" to just this one
      setSelectedContractorIds([id]);
      return;
    }
    setSelectedContractorIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      // If all individually selected, revert to "all" mode
      if (next.length === activeContractors.length && activeContractors.every((c) => next.includes(c.id))) {
        return [];
      }
      // If none selected, use sentinel
      if (next.length === 0 || (next.length === 1 && next[0] === "__none__")) {
        return ["__none__"];
      }
      return next.filter((x) => x !== "__none__");
    });
  }

  function submitFilters(overrideGroupByProject?: boolean) {
    const realCustomerIds = selectedCustomerIds.filter((x) => x !== "__none__");
    if (selectedCustomerIds.includes("__none__") || (!isAllCustomers && realCustomerIds.length === 0)) {
      setError("Please select at least one customer");
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
      const monthsBack = parseInt(period, 10);
      const range = getMonthRange(monthsBack);
      from = range.from;
      to = range.to;
      periodLabel = range.label;
    }

    let customerName: string;
    if (isAllCustomers) {
      customerName = "All Customers";
    } else if (realCustomerIds.length === 1) {
      customerName = customers.find((c) => c.id === realCustomerIds[0])?.name ?? "";
    } else {
      customerName = `${realCustomerIds.length} Customers`;
    }

    setError("");
    hasGenerated.current = true;
    fetchKeyRef.current += 1;
    onGenerate({
      customer_id: isAllCustomers ? "__all__" : (realCustomerIds.length === 1 ? realCustomerIds[0] : "__all__"),
      customer_ids: realCustomerIds,
      customerName,
      from,
      to,
      group_by_project: overrideGroupByProject ?? groupByProject,
      periodLabel,
      contractor_ids: selectedContractorIds,
      _fetchKey: fetchKeyRef.current,
    });
  }

  const [showCustomerFilter, setShowCustomerFilter] = useState(false);
  const [showContractorFilter, setShowContractorFilter] = useState(false);

  const realCustomerIds = selectedCustomerIds.filter((x) => x !== "__none__");
  const customerLabel = isAllCustomers
    ? "All Customers"
    : realCustomerIds.length === 1
      ? activeCustomers.find((c) => c.id === realCustomerIds[0])?.name ?? "1 Customer"
      : `${realCustomerIds.length} Customers`;

  const contractorLabel = isAllContractors
    ? "All Contractors"
    : selectedContractorIds.filter((x) => x !== "__none__").length === 1
      ? activeContractors.find((c) => c.id === selectedContractorIds.find((x) => x !== "__none__"))?.display_name ?? "1 Contractor"
      : `${selectedContractorIds.filter((x) => x !== "__none__").length} Contractors`;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-slate-400 mb-1">Customer</label>
        <button
          type="button"
          onClick={() => { setShowCustomerFilter((v) => !v); setShowContractorFilter(false); }}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-left text-sm text-slate-200 hover:border-slate-600 transition-colors"
        >
          {customerLabel}
        </button>
        {showCustomerFilter && (
          <ScrollArea className="mt-2 rounded-lg border border-slate-700 bg-slate-900 p-3 max-h-40">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <Checkbox checked={isAllCustomers} onCheckedChange={toggleAllCustomers} />
                {customersLoading ? "Loading..." : "All Customers"}
              </label>
              {activeCustomers.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <Checkbox
                    checked={isAllCustomers || selectedCustomerIds.includes(c.id)}
                    onCheckedChange={() => toggleCustomer(c.id)}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </ScrollArea>
        )}
        {error && error.includes("customer") && <p className="mt-1 text-sm text-red-400">{error}</p>}
      </div>

      <Select
        label="Time Period"
        value={period}
        onChange={(e) => setPeriod(e.target.value)}
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

      <div>
        <label className="block text-sm text-slate-400 mb-1">Contractors</label>
        <button
          type="button"
          onClick={() => { setShowContractorFilter((v) => !v); setShowCustomerFilter(false); }}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-left text-sm text-slate-200 hover:border-slate-600 transition-colors"
        >
          {contractorLabel}
        </button>
        {showContractorFilter && (
          <ScrollArea className="mt-2 rounded-lg border border-slate-700 bg-slate-900 p-3 max-h-40">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <Checkbox checked={isAllContractors} onCheckedChange={toggleAllContractors} />
                {contractorsLoading ? "Loading..." : "All Contractors"}
              </label>
              {activeContractors.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <Checkbox
                    checked={isAllContractors || selectedContractorIds.includes(c.id)}
                    onCheckedChange={() => toggleContractor(c.id)}
                  />
                  {c.display_name}
                </label>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
        <Checkbox
          checked={groupByProject}
          onCheckedChange={(checked) => {
            const newValue = checked === true;
            setGroupByProject(newValue);
            if (hasGenerated.current) {
              submitFilters(newValue);
            }
          }}
        />
        Group by project
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button onClick={() => submitFilters()} className="w-full">
        View Report
      </Button>
    </div>
  );
}
