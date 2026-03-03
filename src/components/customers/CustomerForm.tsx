"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { Customer } from "@/lib/types";

interface CustomerFormProps {
  customer?: Customer;
  onSave: (data: { name: string }) => Promise<void>;
  onCancel: () => void;
}

export function CustomerForm({ customer, onSave, onCancel }: CustomerFormProps) {
  const [name, setName] = useState(customer?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    try {
      await onSave({ name: name.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Customer Name"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setError("");
        }}
        error={error}
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
