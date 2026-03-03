"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { Contractor } from "@/lib/types";

interface ContractorFormProps {
  contractor?: Contractor;
  onSave: (data: { display_name: string; email: string }) => Promise<void>;
  onCancel: () => void;
}

export function ContractorForm({ contractor, onSave, onCancel }: ContractorFormProps) {
  const [displayName, setDisplayName] = useState(contractor?.display_name ?? "");
  const [email, setEmail] = useState(contractor?.email ?? "");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!displayName.trim()) errs.displayName = "Name is required";
    if (!email.trim()) errs.email = "Email is required";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      await onSave({ display_name: displayName.trim(), email: email.trim() });
    } catch (err) {
      setErrors({ displayName: err instanceof Error ? err.message : "Failed to save" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Display Name"
        value={displayName}
        onChange={(e) => {
          setDisplayName(e.target.value);
          setErrors((prev) => ({ ...prev, displayName: "" }));
        }}
        error={errors.displayName}
        autoFocus
      />
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setErrors((prev) => ({ ...prev, email: "" }));
        }}
        error={errors.email}
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
