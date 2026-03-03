"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";
import { getCached, setCache, isStale } from "@/lib/cache";
import type { Customer } from "@/lib/types";

const CACHE_KEY = "customers";
const CACHE_KEY_ALL = "customers:all";

interface UseCustomersOptions {
  includeInactive?: boolean;
}

export function useCustomers(options?: UseCustomersOptions) {
  const includeInactive = options?.includeInactive ?? false;
  const cacheKey = includeInactive ? CACHE_KEY_ALL : CACHE_KEY;

  const [customers, setCustomers] = useState<Customer[]>(
    () => getCached<Customer[]>(cacheKey) ?? []
  );
  const [loading, setLoading] = useState(() => !getCached(cacheKey));

  const fetchCustomers = useCallback(async () => {
    const cached = getCached<Customer[]>(cacheKey);
    if (cached && !isStale(cacheKey)) {
      setCustomers(cached);
      setLoading(false);
      return;
    }
    if (!cached) setLoading(true);
    try {
      const url = includeInactive ? "/api/customers?include_inactive=true" : "/api/customers";
      const data = await apiFetch<Customer[]>(url);
      setCustomers(data);
      setCache(cacheKey, data);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    } finally {
      setLoading(false);
    }
  }, [includeInactive, cacheKey]);

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
      setCache(cacheKey, next);
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
      setCache(cacheKey, next);
      return next;
    });
    return customer;
  };

  const remove = async (id: string) => {
    await apiFetch(`/api/customers/${id}`, { method: "DELETE" });
    setCustomers((prev) => {
      const next = prev.filter((c) => c.id !== id);
      setCache(cacheKey, next);
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
