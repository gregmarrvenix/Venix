"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";
import type { Contractor } from "@/lib/types";

export function useContractors() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContractors = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Contractor[]>("/api/contractors");
      setContractors(data);
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
