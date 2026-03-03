"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";
import type { Project } from "@/lib/types";

export function useProjects(customerId?: string) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const url = customerId
        ? `/api/projects?customer_id=${customerId}`
        : "/api/projects";
      const data = await apiFetch<Project[]>(url);
      setProjects(data);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const create = async (customer_id: string, name: string) => {
    const project = await apiFetch<Project>("/api/projects", {
      method: "POST",
      body: JSON.stringify({ customer_id, name }),
    });
    setProjects((prev) => [...prev, project]);
    return project;
  };

  const update = async (id: string, data: Partial<Project>) => {
    const project = await apiFetch<Project>(`/api/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    setProjects((prev) => prev.map((p) => (p.id === id ? project : p)));
    return project;
  };

  const remove = async (id: string) => {
    await apiFetch(`/api/projects/${id}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  return { projects, loading, create, update, remove, refresh: fetchProjects };
}
