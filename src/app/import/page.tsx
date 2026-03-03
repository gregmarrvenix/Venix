"use client";

import { HarvestImport } from "@/components/import/HarvestImport";

export default function ImportPage() {
  return (
    <div className="space-y-6 py-6">
      <h1 className="text-xl font-bold text-slate-200">Import from Harvest</h1>

      <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
        <HarvestImport />
      </div>
    </div>
  );
}
