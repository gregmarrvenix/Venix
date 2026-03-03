"use client";

import { useState } from "react";
import { useAuthContext } from "@/components/auth/AuthGuard";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { todayAEST } from "@/lib/timezone";
import { useToast } from "@/components/ui/Toast";
import { TimeEntryForm } from "@/components/time-entry/TimeEntryForm";
import { RecentEntries } from "@/components/time-entry/RecentEntries";

export default function HomePage() {
  const { contractorId } = useAuthContext();
  const { addToast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);

  const today = todayAEST();
  const sevenDaysAgo = (() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  })();

  const { create } = useTimeEntries({ contractorId, from: sevenDaysAgo, to: today });

  return (
    <div className="space-y-6 py-6">
      <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-200">
          Log Time
        </h2>
        <TimeEntryForm
          onSubmit={async (data) => {
            try {
              await create(data);
              addToast("Time entry saved", "success");
              setRefreshKey((k) => k + 1);
            } catch (err) {
              addToast(
                err instanceof Error ? err.message : "Failed to save entry",
                "error"
              );
            }
          }}
        />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-200">
          Recent Entries
        </h2>
        <RecentEntries refreshKey={refreshKey} />
      </div>
    </div>
  );
}
