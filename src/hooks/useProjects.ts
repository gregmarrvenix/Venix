"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";
import { getCached, setCache, isStale } from "@/lib/cache";
import type { Project } from "@/lib/types";

function cacheKey(customerId?: string) {
  return customerId ? `projects:${customerId}` : "projects:all";
}

export function useProjects(customerId?: string) {
  const key = cacheKey(customerId);
  const [projects, setProjects] = useState<Project[]>(
    () => getCached<Project[]>(key) ?? []
  );
  const [loading, setLoading] = useState(() => !getCached(key));

  const fetchProjects = useCallback(async () => {
    const cached = getCached<Project[]>(key);
    if (cached && !isStale(key)) {
      setProjects(cached);
      setLoading(false);
      return;
    }
    if (!cached) setLoading(true);
    try {
      const url = customerId
        ? `/api/projects?customer_id=${customerId}`
        : "/api/projects";
      const data = await apiFetch<Project[]>(url);
      setProjects(data);
      setCache(key, data);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setLoading(false);
    }
  }, [customerId, key]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const create = async (customer_id: string, name: string) => {
    const project = await apiFetch<Project>("/api/projects", {
      method: "POST",
      body: JSON.stringify({ customer_id, name }),
    });
    setProjects((prev) => {
      const next = [...prev, project];
      setCache(key, next);
      return next;
    });
    return project;
  };

  const update = async (id: string, data: Partial<Project>) => {
    const project = await apiFetch<Project>(`/api/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    setProjects((prev) => {
      const next = prev.map((p) => (p.id === id ? project : p));
      setCache(key, next);
      return next;
    });
    return project;
  };

  const remove = async (id: string) => {
    await apiFetch(`/api/projects/${id}`, { method: "DELETE" });
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== id);
      setCache(key, next);
      return next;
    });
  };

  return {
    projects,
    loading,
    create,
    update,
    remove,
    refresh: fetchProjects,
  };
}
