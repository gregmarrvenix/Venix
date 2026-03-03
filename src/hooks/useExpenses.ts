"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";
import type { Expense } from "@/lib/types";

export function useExpenses(contractorId: string, from: string, to: string) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = useCallback(async () => {
    if (!contractorId || !from || !to) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        contractor_id: contractorId,
        from,
        to,
      });
      const data = await apiFetch<Expense[]>(`/api/expenses?${params}`);
      setExpenses(data);
    } catch (err) {
      console.error("Failed to fetch expenses:", err);
    } finally {
      setLoading(false);
    }
  }, [contractorId, from, to]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const create = async (data: Omit<Expense, "id" | "created_at" | "updated_at" | "contractor" | "customer" | "project">) => {
    const expense = await apiFetch<Expense>("/api/expenses", {
      method: "POST",
      body: JSON.stringify(data),
    });
    setExpenses((prev) => [...prev, expense]);
    return expense;
  };

  const update = async (id: string, data: Partial<Expense>) => {
    const expense = await apiFetch<Expense>(`/api/expenses/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    setExpenses((prev) => prev.map((e) => (e.id === id ? expense : e)));
    return expense;
  };

  const remove = async (id: string) => {
    await apiFetch(`/api/expenses/${id}`, { method: "DELETE" });
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  return { expenses, loading, create, update, remove, refresh: fetchExpenses };
}
