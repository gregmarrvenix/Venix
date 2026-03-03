"use client";

import { useState, useRef, useEffect, useMemo, useId, useCallback } from "react";
import { useProjects } from "@/hooks/useProjects";
import type { Project } from "@/lib/types";

interface ProjectPickerProps {
  label?: string;
  value: string; // project_id
  onChange: (projectId: string, customerId: string) => void;
  error?: string;
}

interface GroupedProject {
  customerName: string;
  customerId: string;
  projects: Project[];
}

export function ProjectPicker({ label, value, onChange, error }: ProjectPickerProps) {
  const pickerId = useId();
  const { projects, loading } = useProjects();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => projects.find((p) => p.id === value),
    [projects, value]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, GroupedProject>();
    for (const p of projects) {
      const custId = p.customer_id;
      const custName = p.customer?.name ?? "Unknown";
      if (!map.has(custId)) {
        map.set(custId, { customerName: custName, customerId: custId, projects: [] });
      }
      map.get(custId)!.projects.push(p);
    }
    const groups = Array.from(map.values());
    groups.sort((a, b) => a.customerName.localeCompare(b.customerName));
    for (const g of groups) {
      g.projects.sort((a, b) => a.name.localeCompare(b.name));
    }
    return groups;
  }, [projects]);

  const filtered = useMemo(() => {
    if (!search.trim()) return grouped;
    const q = search.toLowerCase();
    const result: GroupedProject[] = [];
    for (const g of grouped) {
      const customerMatch = g.customerName.toLowerCase().includes(q);
      const matchingProjects = customerMatch
        ? g.projects
        : g.projects.filter((p) => p.name.toLowerCase().includes(q));
      if (matchingProjects.length > 0) {
        result.push({ ...g, projects: matchingProjects });
      }
    }
    return result;
  }, [grouped, search]);

  // Flat list of selectable project items for keyboard navigation
  const flatItems = useMemo(() => {
    const items: Project[] = [];
    for (const g of filtered) {
      for (const p of g.projects) {
        items.push(p);
      }
    }
    return items;
  }, [filtered]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Focus search when opening
  useEffect(() => {
    if (open) {
      searchRef.current?.focus();
      setHighlightIndex(-1);
    } else {
      setSearch("");
    }
  }, [open]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-project-item]");
    items[highlightIndex]?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex]);

  const handleSelect = useCallback(
    (project: Project) => {
      onChange(project.id, project.customer_id);
      setOpen(false);
    },
    [onChange]
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < flatItems.length) {
        handleSelect(flatItems[highlightIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="flex flex-col gap-1" ref={containerRef}>
      {label && (
        <label className="text-sm text-slate-400">{label}</label>
      )}
      <button
        type="button"
        id={pickerId}
        onClick={() => setOpen(!open)}
        className={`relative w-full rounded-lg border px-3 py-2 text-left text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none ${
          error ? "border-red-400" : "border-slate-700"
        } bg-slate-900`}
      >
        {loading ? (
          <span className="text-slate-500">Loading...</span>
        ) : selected ? (
          <div>
            <div className="text-xs text-slate-400 leading-tight">{selected.customer?.name}</div>
            <div className="text-slate-200 leading-tight">{selected.name}</div>
          </div>
        ) : (
          <span className="text-slate-500">Select project</span>
        )}
        <svg
          className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="relative z-50">
          <div className="absolute top-0 left-0 right-0 rounded-lg border border-slate-700 bg-slate-800 shadow-xl overflow-hidden">
            <div className="p-2 border-b border-slate-700">
              <div className="relative">
                <svg
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setHighlightIndex(-1);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search..."
                  className="w-full rounded-md border border-slate-600 bg-slate-900 pl-8 pr-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
            <div ref={listRef} className="max-h-64 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-sm text-slate-400 text-center">No results</div>
              ) : (
                filtered.map((group) => (
                  <div key={group.customerId}>
                    <div className="px-3 py-1.5 text-sm font-semibold text-slate-200">
                      {group.customerName}
                    </div>
                    {group.projects.map((p) => {
                      const idx = flatItems.indexOf(p);
                      const isHighlighted = idx === highlightIndex;
                      const isSelected = p.id === value;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          data-project-item
                          onClick={() => handleSelect(p)}
                          className={`w-full text-left pl-6 pr-3 py-1.5 text-sm cursor-pointer ${
                            isSelected
                              ? "bg-indigo-600 text-white"
                              : isHighlighted
                                ? "bg-slate-700 text-slate-200"
                                : "text-slate-300 hover:bg-slate-700/50"
                          }`}
                        >
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
