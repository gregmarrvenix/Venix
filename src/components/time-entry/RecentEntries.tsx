"use client";

import { useState, useMemo, useEffect } from "react";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useAuthContext } from "@/components/auth/AuthGuard";
import { todayAEST, formatDate, formatTime, calculateHours } from "@/lib/timezone";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { TimeEntryForm } from "./TimeEntryForm";
import type { TimeEntry } from "@/lib/types";

interface RecentEntriesProps {
  refreshKey?: number;
}

export function RecentEntries({ refreshKey }: RecentEntriesProps) {
  const { contractorId } = useAuthContext();
  const toast = useToast();

  const dateRange = useMemo(() => {
    const today = todayAEST();
    const from = new Date(today);
    from.setDate(from.getDate() - 7);
    const fromStr = from.toISOString().split("T")[0];
    return { from: fromStr, to: today };
  }, []);

  const { entries, loading, update, remove, refresh } = useTimeEntries(
    contractorId,
    dateRange.from,
    dateRange.to
  );

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

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-lg bg-slate-800 border border-slate-700 p-4">
            <div className="h-4 bg-slate-700 rounded w-1/3 mb-2" />
            <div className="h-3 bg-slate-700 rounded w-1/2 mb-2" />
            <div className="h-3 bg-slate-700 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="text-slate-400 text-center py-8">No recent entries</p>
    );
  }

  return (
    <>
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
                  {entry.customer?.name} / {entry.project?.name}
                </div>
                <p className="mt-1 text-sm text-slate-400 line-clamp-2">
                  {entry.description}
                </p>
              </div>
              <div className="flex gap-1 ml-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingEntry(entry)}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeletingId(entry.id)}
                  className="text-red-400 hover:text-red-300"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

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
