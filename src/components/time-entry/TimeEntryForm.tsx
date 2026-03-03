"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useCustomers } from "@/hooks/useCustomers";
import { useProjects } from "@/hooks/useProjects";
import { todayAEST } from "@/lib/timezone";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { VoiceInput } from "./VoiceInput";
import type { TimeEntry } from "@/lib/types";

interface TimeEntryFormProps {
  onSubmit: (data: {
    entry_date: string;
    start_time: string;
    end_time: string;
    customer_id: string;
    project_id: string;
    description: string;
  }) => Promise<void>;
  initialData?: TimeEntry;
}

export function TimeEntryForm({ onSubmit, initialData }: TimeEntryFormProps) {
  const [date, setDate] = useState(initialData?.entry_date ?? todayAEST());
  const [startTime, setStartTime] = useState(initialData?.start_time?.slice(0, 5) ?? "");
  const [endTime, setEndTime] = useState(initialData?.end_time?.slice(0, 5) ?? "");
  const [customerId, setCustomerId] = useState(initialData?.customer_id ?? "");
  const [projectId, setProjectId] = useState(initialData?.project_id ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const { customers, loading: customersLoading } = useCustomers();
  const { projects, loading: projectsLoading } = useProjects(customerId || undefined);

  useEffect(() => {
    if (!initialData) {
      setProjectId("");
    }
  }, [customerId, initialData]);

  function validate() {
    const errs: Record<string, string> = {};
    if (!date) errs.date = "Date is required";
    if (!startTime) errs.startTime = "Start time is required";
    if (!endTime) errs.endTime = "End time is required";
    if (startTime && endTime && endTime <= startTime) {
      errs.endTime = "End time must be after start time";
    }
    if (!customerId) errs.customerId = "Customer is required";
    if (!projectId) errs.projectId = "Project is required";
    if (!description.trim()) errs.description = "Description is required";
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
        entry_date: date,
        start_time: startTime,
        end_time: endTime,
        customer_id: customerId,
        project_id: projectId,
        description: description.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  }

  const customerOptions = customers.map((c) => ({ value: c.id, label: c.name }));
  const projectOptions = projects.map((p) => ({ value: p.id, label: p.name }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Date"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        error={errors.date}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Start Time"
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          error={errors.startTime}
        />
        <Input
          label="End Time"
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          error={errors.endTime}
        />
      </div>

      <Select
        label="Customer"
        value={customerId}
        onChange={(e) => setCustomerId(e.target.value)}
        options={[{ value: "", label: customersLoading ? "Loading..." : "Select customer" }, ...customerOptions]}
        error={errors.customerId}
      />

      <Select
        label="Project"
        value={projectId}
        onChange={(e) => setProjectId(e.target.value)}
        options={[{ value: "", label: projectsLoading ? "Loading..." : "Select project" }, ...projectOptions]}
        error={errors.projectId}
        disabled={!customerId}
      />

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">
          Description
        </label>
        <div className="relative">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 pr-10 text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            placeholder="What did you work on?"
          />
          <div className="absolute right-1 top-1">
            <VoiceInput onResult={(text) => setDescription((prev) => prev ? `${prev} ${text}` : text)} />
          </div>
        </div>
        {errors.description && (
          <p className="mt-1 text-sm text-red-400">{errors.description}</p>
        )}
      </div>

      <Button type="submit" loading={submitting} className="w-full">
        {initialData ? "Update" : "Log Time"}
      </Button>
    </form>
  );
}
