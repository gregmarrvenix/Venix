"use client";

import { useState, useMemo, useEffect } from "react";
import { useExpenses } from "@/hooks/useExpenses";
import { useAuthContext } from "@/components/auth/AuthGuard";
import { todayAEST, formatDate } from "@/lib/timezone";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ExpenseForm } from "./ExpenseForm";
import type { Expense } from "@/lib/types";

interface RecentExpensesProps {
  refreshKey?: number;
}

export function RecentExpenses({ refreshKey }: RecentExpensesProps) {
  const { contractorId } = useAuthContext();
  const toast = useToast();

  const dateRange = useMemo(() => {
    const today = todayAEST();
    const from = new Date(today);
    from.setDate(from.getDate() - 30);
    const fromStr = from.toISOString().split("T")[0];
    return { from: fromStr, to: today };
  }, []);

  const { expenses, loading, update, remove, refresh } = useExpenses(
    contractorId,
    dateRange.from,
    dateRange.to
  );

  useEffect(() => {
    if (refreshKey && refreshKey > 0) refresh();
  }, [refreshKey, refresh]);

  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleUpdate(data: {
    contractor_id: string;
    customer_id: string;
    project_id: string;
    expense_date: string;
    amount: number;
    description: string;
    is_billable: boolean;
  }) {
    if (!editingExpense) return;
    try {
      await update(editingExpense.id, data);
      setEditingExpense(null);
      toast.success("Expense updated");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update expense");
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove(id);
      setDeletingId(null);
      toast.success("Expense deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete expense");
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg bg-slate-800 border border-slate-700 p-4">
            <Skeleton className="h-4 bg-slate-700 rounded w-1/3 mb-2" />
            <Skeleton className="h-3 bg-slate-700 rounded w-1/2 mb-2" />
            <Skeleton className="h-3 bg-slate-700 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <p className="text-slate-400 text-center py-8">No recent expenses</p>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {expenses.map((expense) => (
          <div
            key={expense.id}
            className="rounded-lg bg-slate-800 border border-slate-700 p-4"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm text-slate-400 flex-wrap">
                  <span>{formatDate(expense.expense_date)}</span>
                  <span className="text-indigo-400 font-medium">
                    ${Number(expense.amount).toFixed(2)}
                  </span>
                  {expense.is_billable && (
                    <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-300 border-transparent">
                      Billable
                    </Badge>
                  )}
                </div>
                <div className="mt-1 text-sm font-medium text-slate-200">
                  {expense.customer?.name} / {expense.project?.name}
                </div>
                {expense.description && (
                  <p className="mt-1 text-sm text-slate-400 line-clamp-2">
                    {expense.description}
                  </p>
                )}
              </div>
              <div className="flex gap-2 ml-2 shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditingExpense(expense)}
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setDeletingId(expense.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        title="Edit Expense"
      >
        {editingExpense && (
          <ExpenseForm onSubmit={handleUpdate} initialData={editingExpense} />
        )}
      </Modal>

      <Modal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        title="Delete Expense"
      >
        <p className="text-slate-300 mb-4">
          Are you sure you want to delete this expense?
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
