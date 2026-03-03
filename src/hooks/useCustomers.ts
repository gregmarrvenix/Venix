"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";
import type { Customer } from "@/lib/types";

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Customer[]>("/api/customers");
      setCustomers(data);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const create = async (name: string) => {
    const customer = await apiFetch<Customer>("/api/customers", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    setCustomers((prev) => [...prev, customer]);
    return customer;
  };

  const update = async (id: string, data: Partial<Customer>) => {
    const customer = await apiFetch<Customer>(`/api/customers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    setCustomers((prev) => prev.map((c) => (c.id === id ? customer : c)));
    return customer;
  };

  const remove = async (id: string) => {
    await apiFetch(`/api/customers/${id}`, { method: "DELETE" });
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  };

  return { customers, loading, create, update, remove, refresh: fetchCustomers };
}
