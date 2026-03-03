"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";
import type { TimeEntry } from "@/lib/types";

export function useTimeEntries(contractorId: string, from: string, to: string) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    if (!contractorId || !from || !to) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        contractor_id: contractorId,
        from,
        to,
      });
      const data = await apiFetch<TimeEntry[]>(`/api/time-entries?${params}`);
      setEntries(data);
    } catch (err) {
      console.error("Failed to fetch time entries:", err);
    } finally {
      setLoading(false);
    }
  }, [contractorId, from, to]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const create = async (data: Omit<TimeEntry, "id" | "created_at" | "updated_at" | "contractor" | "customer" | "project">) => {
    const entry = await apiFetch<TimeEntry>("/api/time-entries", {
      method: "POST",
      body: JSON.stringify(data),
    });
    setEntries((prev) => [...prev, entry]);
    return entry;
  };

  const update = async (id: string, data: Partial<TimeEntry>) => {
    const entry = await apiFetch<TimeEntry>(`/api/time-entries/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    setEntries((prev) => prev.map((e) => (e.id === id ? entry : e)));
    return entry;
  };

  const remove = async (id: string) => {
    await apiFetch(`/api/time-entries/${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  return { entries, loading, create, update, remove, refresh: fetchEntries };
}
