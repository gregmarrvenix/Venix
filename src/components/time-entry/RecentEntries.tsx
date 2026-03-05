"use client";

import { useState, useEffect, useMemo } from "react";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useContractors } from "@/hooks/useContractors";
import { useCustomers } from "@/hooks/useCustomers";
import { useAuthContext } from "@/components/auth/AuthGuard";
import { formatDate, formatTime, calculateHours } from "@/lib/timezone";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TimeEntryForm } from "./TimeEntryForm";
import type { TimeEntry } from "@/lib/types";

interface RecentEntriesProps {
  refreshKey?: number;
}

export function RecentEntries({ refreshKey }: RecentEntriesProps) {
  const { contractorId } = useAuthContext();
  const { contractors, loading: contractorsLoading } = useContractors();
  const { customers, loading: customersLoading } = useCustomers();
  const toast = useToast();
  const [selectedContractorIds, setSelectedContractorIds] = useState<string[]>([contractorId]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState("50");

  const activeContractors = useMemo(
    () => contractors.filter((c) => c.is_active),
    [contractors]
  );

  const activeCustomers = useMemo(
    () => customers.filter((c) => c.is_active),
    [customers]
  );

  const isAllContractors = selectedContractorIds.length === 0;
  const isAllCustomers = selectedCustomerIds.length === 0;

  function toggleAllContractors() {
    if (isAllContractors) {
      setSelectedContractorIds(["__none__"]);
    } else {
      setSelectedContractorIds([]);
    }
  }

  function toggleContractor(id: string) {
    if (isAllContractors) {
      setSelectedContractorIds([id]);
      return;
    }
    setSelectedContractorIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (next.length === activeContractors.length && activeContractors.every((c) => next.includes(c.id))) {
        return [];
      }
      if (next.length === 0 || (next.length === 1 && next[0] === "__none__")) {
        return ["__none__"];
      }
      return next.filter((x) => x !== "__none__");
    });
  }

  function toggleAllCustomers() {
    if (isAllCustomers) {
      setSelectedCustomerIds(["__none__"]);
    } else {
      setSelectedCustomerIds([]);
    }
  }

  function toggleCustomer(id: string) {
    if (isAllCustomers) {
      setSelectedCustomerIds([id]);
      return;
    }
    setSelectedCustomerIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (next.length === activeCustomers.length && activeCustomers.every((c) => next.includes(c.id))) {
        return [];
      }
      if (next.length === 0 || (next.length === 1 && next[0] === "__none__")) {
        return ["__none__"];
      }
      return next.filter((x) => x !== "__none__");
    });
  }

  // Map selection state to hook params
  const contractorIdsParam = isAllContractors ? [] : selectedContractorIds.filter((x) => x !== "__none__");
  const customerIdsParam = isAllCustomers ? [] : selectedCustomerIds.filter((x) => x !== "__none__");

  const { entries, loading, update, remove, refresh } = useTimeEntries({
    contractorIds: contractorIdsParam,
    customerIds: customerIdsParam,
    limit: parseInt(pageSize, 10),
  });

  useEffect(() => {
    if (refreshKey && refreshKey > 0) refresh();
  }, [refreshKey, refresh]);

  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleUpdate(data: {
    contractor_id: string;
    entry_date: string;
    start_time: string;
    end_time: string;
    break_minutes: number;
    customer_id: string;
    project_id: string;
    description: string;
  }) {
    if (!editingEntry) return;
    try {
      await update(editingEntry.id, data);
      setEditingEntry(null);
      toast.success("Entry updated");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update entry");
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove(id);
      setDeletingId(null);
      toast.success("Entry deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete entry");
    }
  }

  const showContractorName = isAllContractors || selectedContractorIds.length > 1;
  const [showContractorFilter, setShowContractorFilter] = useState(false);
  const [showCustomerFilter, setShowCustomerFilter] = useState(false);

  const contractorLabel = isAllContractors
    ? "All Contractors"
    : selectedContractorIds.filter((x) => x !== "__none__").length === 1
      ? activeContractors.find((c) => c.id === selectedContractorIds[0])?.display_name ?? "1 Contractor"
      : `${selectedContractorIds.filter((x) => x !== "__none__").length} Contractors`;

  const customerLabel = isAllCustomers
    ? "All Customers"
    : selectedCustomerIds.filter((x) => x !== "__none__").length === 1
      ? activeCustomers.find((c) => c.id === selectedCustomerIds[0])?.name ?? "1 Customer"
      : `${selectedCustomerIds.filter((x) => x !== "__none__").length} Customers`;

  const pageSizeOptions = [
    { value: "50", label: "50 entries" },
    { value: "100", label: "100 entries" },
    { value: "200", label: "200 entries" },
  ];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Contractors</label>
          <button
            type="button"
            onClick={() => { setShowContractorFilter((v) => !v); setShowCustomerFilter(false); }}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:border-slate-600 transition-colors"
          >
            {contractorLabel}
          </button>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Customers</label>
          <button
            type="button"
            onClick={() => { setShowCustomerFilter((v) => !v); setShowContractorFilter(false); }}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:border-slate-600 transition-colors"
          >
            {customerLabel}
          </button>
        </div>
        <Select
          label="Show"
          value={pageSize}
          onChange={(e) => setPageSize(e.target.value)}
          options={pageSizeOptions}
        />
      </div>

      {showContractorFilter && (
        <div className="mb-4">
          <ScrollArea className="rounded-lg border border-slate-700 bg-slate-900 p-3 max-h-40">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <Checkbox checked={isAllContractors} onCheckedChange={toggleAllContractors} />
                {contractorsLoading ? "Loading..." : "All Contractors"}
              </label>
              {activeContractors.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <Checkbox
                    checked={isAllContractors || selectedContractorIds.includes(c.id)}
                    onCheckedChange={() => toggleContractor(c.id)}
                  />
                  {c.display_name}
                </label>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {showCustomerFilter && (
        <div className="mb-4">
          <ScrollArea className="rounded-lg border border-slate-700 bg-slate-900 p-3 max-h-40">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <Checkbox checked={isAllCustomers} onCheckedChange={toggleAllCustomers} />
                {customersLoading ? "Loading..." : "All Customers"}
              </label>
              {activeCustomers.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <Checkbox
                    checked={isAllCustomers || selectedCustomerIds.includes(c.id)}
                    onCheckedChange={() => toggleCustomer(c.id)}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-lg bg-slate-800 border border-slate-700 p-4">
              <div className="h-4 bg-slate-700 rounded w-1/3 mb-2" />
              <div className="h-3 bg-slate-700 rounded w-1/2 mb-2" />
              <div className="h-3 bg-slate-700 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-slate-400 text-center py-8">No recent entries</p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-lg bg-slate-800 border border-slate-700 p-4"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <span>{formatDate(entry.entry_date)}</span>
                    <span>
                      {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                    </span>
                    <span className="text-indigo-400">
                      {calculateHours(entry.start_time, entry.end_time, entry.break_minutes ?? 0).toFixed(1)}h
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-200">
                    {showContractorName && entry.contractor?.display_name && (
                      <span className="text-purple-400">{entry.contractor.display_name} — </span>
                    )}
                    {entry.customer?.name} / {entry.project?.name}
                  </div>
                  <p className="mt-1 text-sm text-slate-400 line-clamp-2">
                    {entry.description}
                  </p>
                </div>
                <div className="flex gap-2 ml-2 shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setEditingEntry(entry)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setDeletingId(entry.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!editingEntry}
        onClose={() => setEditingEntry(null)}
        title="Edit Time Entry"
      >
        {editingEntry && (
          <TimeEntryForm onSubmit={handleUpdate} initialData={editingEntry} />
        )}
      </Modal>

      <Modal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        title="Delete Entry"
      >
        <p className="text-slate-300 mb-4">
          Are you sure you want to delete this time entry?
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setDeletingId(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => deletingId && handleDelete(deletingId)}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}
