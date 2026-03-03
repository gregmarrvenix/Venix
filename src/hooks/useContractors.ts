"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";
import { getCached, setCache, isStale } from "@/lib/cache";
import type { Contractor } from "@/lib/types";

const CACHE_KEY = "contractors";

export function useContractors() {
  const [contractors, setContractors] = useState<Contractor[]>(
    () => getCached<Contractor[]>(CACHE_KEY) ?? []
  );
  const [loading, setLoading] = useState(() => !getCached(CACHE_KEY));

  const fetchContractors = useCallback(async () => {
    const cached = getCached<Contractor[]>(CACHE_KEY);
    if (cached && !isStale(CACHE_KEY)) {
      setContractors(cached);
      setLoading(false);
      return;
    }
    if (!cached) setLoading(true);
    try {
      const data = await apiFetch<Contractor[]>("/api/contractors");
      setContractors(data);
      setCache(CACHE_KEY, data);
    } catch (err) {
      console.error("Failed to fetch contractors:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContractors();
  }, [fetchContractors]);

  return { contractors, loading, refresh: fetchContractors };
}
