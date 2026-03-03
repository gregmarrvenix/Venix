"use client";

import { useState, type FormEvent } from "react";
import { useCustomers } from "@/hooks/useCustomers";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { Project } from "@/lib/types";

interface ProjectFormProps {
  project?: Project;
  onSave: (data: { customer_id: string; name: string }) => Promise<void>;
  onCancel: () => void;
}

export function ProjectForm({ project, onSave, onCancel }: ProjectFormProps) {
  const [customerId, setCustomerId] = useState(project?.customer_id ?? "");
  const [name, setName] = useState(project?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { customers, loading: customersLoading } = useCustomers();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!customerId) errs.customerId = "Customer is required";
    if (!name.trim()) errs.name = "Name is required";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      await onSave({ customer_id: customerId, name: name.trim() });
    } catch (err) {
      setErrors({ name: err instanceof Error ? err.message : "Failed to save" });
    } finally {
      setSaving(false);
    }
  }

  const customerOptions = customers.map((c) => ({ value: c.id, label: c.name }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Customer"
        value={customerId}
        onChange={(e) => setCustomerId(e.target.value)}
        options={[{ value: "", label: customersLoading ? "Loading..." : "Select customer" }, ...customerOptions]}
        error={errors.customerId}
      />
      <Input
        label="Project Name"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setErrors((prev) => ({ ...prev, name: "" }));
        }}
        error={errors.name}
        autoFocus
      />
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          Save
        </Button>
      </div>
    </form>
  );
}
