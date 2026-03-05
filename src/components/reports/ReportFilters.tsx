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
  const [customerId, setCustomerId] = useState("");
  const [period, setPeriod] = useState("1");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [groupByProject, setGroupByProject] = useState(false);
  const [selectedContractorIds, setSelectedContractorIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const hasGenerated = useRef(false);
  const fetchKeyRef = useRef(0);

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
    if (!customerId) {
      setError("Please select a customer");
      return;
    }

    const isAllCustomers = customerId === "__all__";

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

    const customer = isAllCustomers ? null : customers.find((c) => c.id === customerId);
    setError("");
    hasGenerated.current = true;
    fetchKeyRef.current += 1;
    onGenerate({
      customer_id: customerId,
      customerName: isAllCustomers ? "All Customers" : (customer?.name ?? ""),
      from,
      to,
      group_by_project: overrideGroupByProject ?? groupByProject,
      periodLabel,
      contractor_ids: selectedContractorIds,
      _fetchKey: fetchKeyRef.current,
    });
  }

  const customerOptions = [
    { value: "__all__", label: "All Customers" },
    ...customers.map((c) => ({ value: c.id, label: c.name })),
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
          <label className="block text-sm text-slate-400 mb-2">Contractors</label>
          <ScrollArea className="rounded-lg border border-slate-700 bg-slate-900 p-3 max-h-40">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <Checkbox
                  checked={isAllContractors}
                  onCheckedChange={toggleAllContractors}
                />
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
