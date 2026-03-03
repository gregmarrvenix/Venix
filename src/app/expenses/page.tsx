"use client";

import { useState } from "react";
import { useAuthContext } from "@/components/auth/AuthGuard";
import { useExpenses } from "@/hooks/useExpenses";
import { todayAEST } from "@/lib/timezone";
import { useToast } from "@/components/ui/Toast";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { RecentExpenses } from "@/components/expenses/RecentExpenses";

export default function ExpensesPage() {
  const { contractorId } = useAuthContext();
  const { addToast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);

  const today = todayAEST();
  const sevenDaysAgo = (() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  })();

  const { create } = useExpenses(contractorId, sevenDaysAgo, today);

  return (
    <div className="space-y-6 py-6">
      <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-200">
          Log Expense
        </h2>
        <ExpenseForm
          onSubmit={async (data) => {
            try {
              await create(data);
              addToast("Expense saved", "success");
              setRefreshKey((k) => k + 1);
            } catch (err) {
              addToast(
                err instanceof Error ? err.message : "Failed to save expense",
                "error"
              );
            }
          }}
        />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-200">
          Recent Expenses
        </h2>
        <RecentExpenses refreshKey={refreshKey} />
      </div>
    </div>
  );
}
