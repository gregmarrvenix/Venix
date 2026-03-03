"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";
import { getCached, setCache, isStale } from "@/lib/cache";
import type { Customer } from "@/lib/types";

const CACHE_KEY = "customers";

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>(
    () => getCached<Customer[]>(CACHE_KEY) ?? []
  );
  const [loading, setLoading] = useState(() => !getCached(CACHE_KEY));

  const fetchCustomers = useCallback(async () => {
    const cached = getCached<Customer[]>(CACHE_KEY);
    if (cached && !isStale(CACHE_KEY)) {
      setCustomers(cached);
      setLoading(false);
      return;
    }
    if (!cached) setLoading(true);
    try {
      const data = await apiFetch<Customer[]>("/api/customers");
      setCustomers(data);
      setCache(CACHE_KEY, data);
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
    setCustomers((prev) => {
      const next = [...prev, customer];
      setCache(CACHE_KEY, next);
      return next;
    });
    return customer;
  };

  const update = async (id: string, data: Partial<Customer>) => {
    const customer = await apiFetch<Customer>(`/api/customers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    setCustomers((prev) => {
      const next = prev.map((c) => (c.id === id ? customer : c));
      setCache(CACHE_KEY, next);
      return next;
    });
    return customer;
  };

  const remove = async (id: string) => {
    await apiFetch(`/api/customers/${id}`, { method: "DELETE" });
    setCustomers((prev) => {
      const next = prev.filter((c) => c.id !== id);
      setCache(CACHE_KEY, next);
      return next;
    });
  };

  return {
    customers,
    loading,
    create,
    update,
    remove,
    refresh: fetchCustomers,
  };
}
