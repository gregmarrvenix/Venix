"use client";

import { useState, type FormEvent } from "react";
import { useAuthContext } from "@/components/auth/AuthGuard";
import { useContractors } from "@/hooks/useContractors";
import { todayAEST } from "@/lib/timezone";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { ProjectPicker } from "@/components/ui/ProjectPicker";
import type { Expense } from "@/lib/types";

interface ExpenseFormProps {
  onSubmit: (data: {
    contractor_id: string;
    customer_id: string;
    project_id: string;
    expense_date: string;
    amount: number;
    description: string;
    is_billable: boolean;
  }) => Promise<void>;
  initialData?: Expense;
}

export function ExpenseForm({ onSubmit, initialData }: ExpenseFormProps) {
  const { contractorId } = useAuthContext();
  const [selectedContractorId, setSelectedContractorId] = useState(
    initialData?.contractor_id ?? contractorId
  );
  const [customerId, setCustomerId] = useState(
    initialData?.customer_id ?? ""
  );
  const [projectId, setProjectId] = useState(initialData?.project_id ?? "");
  const [date, setDate] = useState(initialData?.expense_date ?? todayAEST());
  const [amount, setAmount] = useState(
    initialData?.amount?.toString() ?? ""
  );
  const [description, setDescription] = useState(
    initialData?.description ?? ""
  );
  const [isBillable, setIsBillable] = useState(
    initialData?.is_billable ?? true
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const { contractors, loading: contractorsLoading } = useContractors();

  function validate() {
    const errs: Record<string, string> = {};
    if (!customerId) errs.customerId = "Customer is required";
    if (!projectId) errs.projectId = "Project is required";
    if (!date) errs.date = "Date is required";
    if (!amount || parseFloat(amount) <= 0)
      errs.amount = "Amount must be greater than 0";
    return errs;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      await onSubmit({
        contractor_id: selectedContractorId,
        customer_id: customerId,
        project_id: projectId,
        expense_date: date,
        amount: parseFloat(parseFloat(amount).toFixed(2)),
        description: description.trim(),
        is_billable: isBillable,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const contractorOptions = contractors
    .filter((c) => c.is_active)
    .map((c) => ({ value: c.id, label: c.display_name }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Contractor"
        value={selectedContractorId}
        onChange={(e) => setSelectedContractorId(e.target.value)}
        options={[
          {
            value: "",
            label: contractorsLoading ? "Loading..." : "Select contractor",
          },
          ...contractorOptions,
        ]}
      />

      <ProjectPicker
        label="Project / Task"
        value={projectId}
        onChange={(pId, cId) => {
          setProjectId(pId);
          setCustomerId(cId);
        }}
        error={errors.customerId || errors.projectId}
      />

      <DatePicker
        label="Date"
        value={date}
        onChange={setDate}
        error={errors.date}
      />

      <Input
        label="Amount ($)"
        type="number"
        step="0.01"
        min="0"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.00"
        error={errors.amount}
      />

      <div>
        <label className="block text-sm text-slate-400 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          placeholder="What was this expense for?"
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isBillable}
          onChange={(e) => setIsBillable(e.target.checked)}
          className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
        />
        <span className="text-sm text-slate-300">Billable</span>
      </label>

      <Button type="submit" loading={submitting} className="w-full">
        {initialData ? "Update" : "Log Expense"}
      </Button>
    </form>
  );
}
