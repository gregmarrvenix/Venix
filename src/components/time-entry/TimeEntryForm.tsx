"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useAuthContext } from "@/components/auth/AuthGuard";
import { useProjects } from "@/hooks/useProjects";
import { useContractors } from "@/hooks/useContractors";
import { todayAEST, calculateHours } from "@/lib/timezone";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { TimePicker } from "@/components/ui/TimePicker";
import { ProjectPicker } from "@/components/ui/ProjectPicker";
import { Textarea } from "@/components/ui/textarea";
import { VoiceInput } from "./VoiceInput";
import type { TimeEntry } from "@/lib/types";

interface TimeEntryFormProps {
  onSubmit: (data: {
    contractor_id: string;
    entry_date: string;
    start_time: string;
    end_time: string;
    break_minutes: number;
    customer_id: string;
    project_id: string;
    description: string;
  }) => Promise<void>;
  initialData?: TimeEntry;
}

export function TimeEntryForm({ onSubmit, initialData }: TimeEntryFormProps) {
  const { contractorId } = useAuthContext();
  const [selectedContractorId, setSelectedContractorId] = useState(
    initialData?.contractor_id ?? contractorId
  );
  const [date, setDate] = useState(initialData?.entry_date ?? todayAEST());
  const [startTime, setStartTime] = useState(
    initialData?.start_time?.slice(0, 5) ?? ""
  );
  const [endTime, setEndTime] = useState(
    initialData?.end_time?.slice(0, 5) ?? ""
  );
  const [customerId, setCustomerId] = useState(
    initialData?.customer_id ?? ""
  );
  const [projectId, setProjectId] = useState(initialData?.project_id ?? "");
  const [breakMinutes, setBreakMinutes] = useState(
    initialData?.break_minutes ?? 0
  );
  const [description, setDescription] = useState(
    initialData?.description ?? ""
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const { contractors, loading: contractorsLoading } = useContractors();
  const { projects } = useProjects();

  // Default times and break for "Day Rate Consulting" project
  useEffect(() => {
    if (!projectId || initialData) return;
    const project = projects.find((p) => p.id === projectId);
    if (project?.name === "Day Rate Consulting") {
      setStartTime("09:00");
      setEndTime("17:00");
      setBreakMinutes(30);
    } else {
      setBreakMinutes(0);
    }
  }, [projectId, projects, initialData]);

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
        contractor_id: selectedContractorId,
        entry_date: date,
        start_time: startTime,
        end_time: endTime,
        break_minutes: breakMinutes,
        customer_id: customerId,
        project_id: projectId,
        description: description.trim(),
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <TimePicker
          label="Start Time"
          value={startTime}
          onChange={setStartTime}
          error={errors.startTime}
        />
        <TimePicker
          label="End Time"
          value={endTime}
          onChange={setEndTime}
          error={errors.endTime}
        />
        <Input
          label="Break (mins)"
          type="number"
          min={0}
          value={breakMinutes}
          onChange={(e) => setBreakMinutes(parseInt(e.target.value) || 0)}
        />
      </div>

      {startTime && endTime && endTime > startTime && (
        <p className="text-sm text-indigo-400 font-medium">
          Total: {calculateHours(startTime, endTime, breakMinutes).toFixed(2)} hours
        </p>
      )}

      <div>
        <label className="block text-sm text-slate-400 mb-1">
          Description
        </label>
        <div className="relative">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="border-slate-700 bg-slate-900 pr-10 text-sm text-slate-200 placeholder-slate-500"
            placeholder="What did you work on?"
          />
          <div className="absolute right-1 top-1">
            <VoiceInput
              onResult={(text) =>
                setDescription((prev) => (prev ? `${prev} ${text}` : text))
              }
            />
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
