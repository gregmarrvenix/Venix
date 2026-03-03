"use client";

import { useState, useMemo } from "react";
import { useAuthContext } from "@/components/auth/AuthGuard";
import { useCustomers } from "@/hooks/useCustomers";
import { useProjects } from "@/hooks/useProjects";
import { useContractors } from "@/hooks/useContractors";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import type {
  HarvestTimeEntry,
  ClientMapping,
  ProjectMapping,
  UserMapping,
  ImportEntry,
} from "@/lib/harvest-types";
import { parseHarvestTime } from "@/lib/harvest-types";

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const CREATE_NEW = "__create_new__";

export function HarvestImport() {
  const { contractorId } = useAuthContext();
  const { customers, create: createCustomer } = useCustomers();
  const { projects, create: createProject } = useProjects();
  const { contractors } = useContractors();

  const [step, setStep] = useState<Step>(1);

  // Step 1: Credentials (persist in sessionStorage)
  const [token, setToken] = useState(() =>
    typeof window !== "undefined" ? sessionStorage.getItem("harvest_token") ?? "" : ""
  );
  const [accountId, setAccountId] = useState(() =>
    typeof window !== "undefined" ? sessionStorage.getItem("harvest_account_id") ?? "" : ""
  );
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Step 2: Loading
  const [fetchError, setFetchError] = useState("");

  // Fetched data
  const [entries, setEntries] = useState<HarvestTimeEntry[]>([]);

  // Step 3: Client mappings
  const [clientMappings, setClientMappings] = useState<ClientMapping[]>([]);

  // Step 4: Project mappings
  const [projectMappings, setProjectMappings] = useState<ProjectMapping[]>([]);

  // Step 5: User mappings
  const [userMappings, setUserMappings] = useState<UserMapping[]>([]);

  // Time corrections for invalid entries (keyed by Harvest entry id)
  const [timeOverrides, setTimeOverrides] = useState<
    Map<number, { start: string; end: string }>
  >(new Map());

  // Step 7: Results
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    total: number;
    errors?: string[];
  } | null>(null);
  const [importError, setImportError] = useState("");

  // Extract unique clients, projects, users from entries
  const uniqueClients = useMemo(() => {
    const map = new Map<number, string>();
    entries.forEach((e) => map.set(e.client.id, e.client.name));
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [entries]);

  const uniqueProjects = useMemo(() => {
    const map = new Map<number, { name: string; clientId: number }>();
    entries.forEach((e) =>
      map.set(e.project.id, { name: e.project.name, clientId: e.client.id })
    );
    return Array.from(map, ([id, { name, clientId }]) => ({
      id,
      name,
      clientId,
    }));
  }, [entries]);

  const uniqueUsers = useMemo(() => {
    const map = new Map<number, string>();
    entries.forEach((e) => map.set(e.user.id, e.user.name));
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [entries]);

  // Auto-match helper (case-insensitive)
  function autoMatchCustomer(harvestName: string): string | null {
    const match = customers.find(
      (c) => c.name.toLowerCase() === harvestName.toLowerCase()
    );
    return match ? match.id : null;
  }

  function autoMatchProject(
    harvestName: string,
    venixCustomerId: string | null
  ): string | null {
    if (!venixCustomerId) return null;
    const match = projects.find(
      (p) =>
        p.name.toLowerCase() === harvestName.toLowerCase() &&
        p.customer_id === venixCustomerId
    );
    return match ? match.id : null;
  }

  function autoMatchContractor(harvestName: string): string {
    const match = contractors.find(
      (c) =>
        c.is_active &&
        c.display_name.toLowerCase() === harvestName.toLowerCase()
    );
    return match ? match.id : contractorId;
  }

  // Step 1 → 2: Fetch entries
  async function handleFetch() {
    sessionStorage.setItem("harvest_token", token);
    sessionStorage.setItem("harvest_account_id", accountId);
    setStep(2);
    setFetchError("");

    try {
      // Fetch directly from Harvest API (no server proxy needed)
      const allEntries: HarvestTimeEntry[] = [];
      let page = 1;
      while (true) {
        const url = `https://api.harvestapp.com/v2/time_entries?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}&per_page=2000&page=${page}`;
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Harvest-Account-Id": accountId,
            "User-Agent": "VenixTimeTracker",
          },
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Harvest API error (${res.status}): ${text}`);
        }
        const data = await res.json();
        allEntries.push(...data.time_entries);
        if (!data.next_page) break;
        page = data.next_page;
      }

      setEntries(allEntries);

      // Build client mappings with auto-match
      const clientMap: ClientMapping[] = [];
      const seenClients = new Set<number>();
      allEntries.forEach((e) => {
        if (!seenClients.has(e.client.id)) {
          seenClients.add(e.client.id);
          clientMap.push({
            harvestId: e.client.id,
            harvestName: e.client.name,
            venixCustomerId: autoMatchCustomer(e.client.name),
          });
        }
      });
      setClientMappings(clientMap);

      // Build project mappings with auto-match
      const projMap: ProjectMapping[] = [];
      const seenProjects = new Set<number>();
      allEntries.forEach((e) => {
        if (!seenProjects.has(e.project.id)) {
          seenProjects.add(e.project.id);
          const clientMapping = clientMap.find(
            (cm) => cm.harvestId === e.client.id
          );
          projMap.push({
            harvestId: e.project.id,
            harvestName: e.project.name,
            harvestClientId: e.client.id,
            venixProjectId: autoMatchProject(
              e.project.name,
              clientMapping?.venixCustomerId ?? null
            ),
          });
        }
      });
      setProjectMappings(projMap);

      // Build user mappings
      const userMap: UserMapping[] = [];
      const seenUsers = new Set<number>();
      allEntries.forEach((e) => {
        if (!seenUsers.has(e.user.id)) {
          seenUsers.add(e.user.id);
          userMap.push({
            harvestId: e.user.id,
            harvestName: e.user.name,
            venixContractorId: autoMatchContractor(e.user.name),
          });
        }
      });
      setUserMappings(userMap);

      setStep(3);
    } catch (err) {
      setFetchError(
        err instanceof Error ? err.message : "Failed to fetch entries"
      );
    }
  }

  // Validation helpers
  function allClientsMapped(): boolean {
    return clientMappings.every((cm) => cm.venixCustomerId !== null);
  }

  function allProjectsMapped(): boolean {
    return projectMappings.every((pm) => pm.venixProjectId !== null);
  }

  // Step 6 → 7: Import
  async function handleImport() {
    setStep(7);
    setImporting(true);
    setImportError("");
    setImportResult(null);

    try {
      // Create new customers first
      const newCustomerIds = new Map<number, string>(); // harvestClientId → new venixCustomerId
      for (const cm of clientMappings) {
        if (cm.venixCustomerId === CREATE_NEW) {
          const customer = await createCustomer(cm.harvestName);
          newCustomerIds.set(cm.harvestId, customer.id);
          cm.venixCustomerId = customer.id;
        }
      }

      // Create new projects
      for (const pm of projectMappings) {
        if (pm.venixProjectId === CREATE_NEW) {
          const clientMapping = clientMappings.find(
            (cm) => cm.harvestId === pm.harvestClientId
          );
          const customerId =
            newCustomerIds.get(pm.harvestClientId) ??
            clientMapping?.venixCustomerId;
          if (!customerId) continue;
          const project = await createProject(customerId, pm.harvestName);
          pm.venixProjectId = project.id;
        }
      }

      // Build import entries, applying time overrides and filtering invalid
      const importEntries: ImportEntry[] = entries
        .filter((e) => e.started_time && e.ended_time)
        .map((e) => {
          const clientMapping = clientMappings.find(
            (cm) => cm.harvestId === e.client.id
          );
          const projMapping = projectMappings.find(
            (pm) => pm.harvestId === e.project.id
          );
          const userMapping = userMappings.find(
            (um) => um.harvestId === e.user.id
          );

          const taskName = e.task?.name || "";
          const notes = e.notes || "";
          const description = notes
            ? `${taskName} - ${notes}`
            : taskName || "";

          const override = timeOverrides.get(e.id);
          const startTime = override?.start ?? parseHarvestTime(e.started_time!);
          let endTime = override?.end ?? parseHarvestTime(e.ended_time!);
          // Cross-midnight entries: cap at 23:59
          if (endTime <= startTime && !override) endTime = "23:59";

          return {
            contractor_id: userMapping?.venixContractorId ?? contractorId,
            customer_id: clientMapping?.venixCustomerId ?? "",
            project_id: projMapping?.venixProjectId ?? "",
            entry_date: e.spent_date,
            start_time: startTime,
            end_time: endTime,
            break_minutes: 0,
            description,
          };
        })
        .filter((e) => e.end_time > e.start_time);

      const result = await apiFetch<{
        imported: number;
        total: number;
        errors?: string[];
      }>("/api/harvest/import", {
        method: "POST",
        body: JSON.stringify({ entries: importEntries }),
      });

      setImportResult(result);
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Import failed"
      );
    } finally {
      setImporting(false);
    }
  }

  // Get projects for a specific mapped customer
  function getProjectsForClient(harvestClientId: number) {
    const clientMapping = clientMappings.find(
      (cm) => cm.harvestId === harvestClientId
    );
    if (
      !clientMapping?.venixCustomerId ||
      clientMapping.venixCustomerId === CREATE_NEW
    ) {
      return [];
    }
    return projects.filter(
      (p) => p.customer_id === clientMapping.venixCustomerId
    );
  }

  // Preview data for step 6
  const previewEntries = useMemo(() => {
    return entries.slice(0, 50).map((e) => {
      const clientMapping = clientMappings.find(
        (cm) => cm.harvestId === e.client.id
      );
      const projMapping = projectMappings.find(
        (pm) => pm.harvestId === e.project.id
      );
      const customerName =
        clientMapping?.venixCustomerId === CREATE_NEW
          ? `${e.client.name} (new)`
          : customers.find((c) => c.id === clientMapping?.venixCustomerId)
              ?.name ?? e.client.name;
      const projectName =
        projMapping?.venixProjectId === CREATE_NEW
          ? `${e.project.name} (new)`
          : projects.find((p) => p.id === projMapping?.venixProjectId)?.name ??
            e.project.name;

      return {
        date: e.spent_date,
        start: e.started_time ?? "-",
        end: e.ended_time ?? "-",
        customer: customerName,
        project: projectName,
        description: e.notes
          ? `${e.task?.name || ""} - ${e.notes}`
          : e.task?.name || "",
      };
    });
  }, [entries, clientMappings, projectMappings, customers, projects]);

  // Entries with invalid times (missing or end <= start after cross-midnight fix)
  const invalidEntries = useMemo(() => {
    return entries.filter((e) => {
      if (!e.started_time || !e.ended_time) return true;
      const override = timeOverrides.get(e.id);
      const start = override?.start ?? parseHarvestTime(e.started_time);
      let end = override?.end ?? parseHarvestTime(e.ended_time);
      // Cross-midnight entries: cap at 23:59
      if (end <= start && !override) end = "23:59";
      return end <= start;
    });
  }, [entries, timeOverrides]);

  const validEntryCount = entries.length - invalidEntries.length;

  // Client breakdown for step 6 summary
  const clientBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    entries.forEach((e) => {
      const name = e.client.name;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    });
    return Array.from(counts, ([name, count]) => ({ name, count }));
  }, [entries]);

  const stepLabels = [
    "Credentials",
    "Fetching",
    "Map Clients",
    "Map Projects",
    "Map Users",
    "Preview",
    "Import",
  ];

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        {stepLabels.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && <span className="text-slate-700">—</span>}
            <span
              className={
                step === i + 1
                  ? "text-indigo-400 font-medium"
                  : step > i + 1
                    ? "text-slate-400"
                    : ""
              }
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Step 1: Credentials + Date Range */}
      {step === 1 && (
        <div className="space-y-4">
          <Input
            label="Harvest Personal Access Token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste your Harvest token"
          />
          <Input
            label="Harvest Account ID"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            placeholder="Your numeric account ID"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DatePicker
              label="From Date"
              value={fromDate}
              onChange={setFromDate}
            />
            <DatePicker
              label="To Date"
              value={toDate}
              onChange={setToDate}
            />
          </div>
          <Button
            onClick={handleFetch}
            disabled={!token || !accountId || !fromDate || !toDate}
            className="w-full"
          >
            Fetch Entries
          </Button>
        </div>
      )}

      {/* Step 2: Loading */}
      {step === 2 && (
        <div className="flex flex-col items-center gap-4 py-12">
          {fetchError ? (
            <>
              <p className="text-red-400">{fetchError}</p>
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
            </>
          ) : (
            <>
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-600 border-t-indigo-500" />
              <p className="text-slate-400">Fetching entries from Harvest...</p>
            </>
          )}
        </div>
      )}

      {/* Step 3: Map Clients → Customers */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">
            Map Harvest Clients to Venix Customers
          </h2>
          <div className="space-y-3">
            {clientMappings.map((cm) => (
              <div
                key={cm.harvestId}
                className="flex items-center gap-4 rounded-lg border border-slate-700 bg-slate-900 p-3"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-slate-300">
                  {cm.harvestName}
                </span>
                <span className="text-slate-600">→</span>
                <div className="flex-1">
                  <Select
                    value={cm.venixCustomerId ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setClientMappings((prev) =>
                        prev.map((m) =>
                          m.harvestId === cm.harvestId
                            ? { ...m, venixCustomerId: val || null }
                            : m
                        )
                      );
                      // Re-evaluate project mappings for this client
                      setProjectMappings((prev) =>
                        prev.map((pm) =>
                          pm.harvestClientId === cm.harvestId
                            ? { ...pm, venixProjectId: null }
                            : pm
                        )
                      );
                    }}
                    options={[
                      { value: "", label: "Select customer..." },
                      { value: CREATE_NEW, label: "➕ Create New" },
                      ...customers.map((c) => ({
                        value: c.id,
                        label: c.name,
                      })),
                    ]}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              onClick={() => setStep(4)}
              disabled={!allClientsMapped()}
              className="flex-1"
            >
              Next: Map Projects
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Map Projects → Projects */}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">
            Map Harvest Projects to Venix Projects
          </h2>
          {clientMappings.map((cm) => {
            const clientProjects = uniqueProjects.filter(
              (p) => p.clientId === cm.harvestId
            );
            if (clientProjects.length === 0) return null;

            const venixProjectsForClient = getProjectsForClient(cm.harvestId);

            return (
              <div key={cm.harvestId} className="space-y-2">
                <h3 className="text-sm font-medium text-slate-400">
                  {cm.harvestName}
                </h3>
                {clientProjects.map((hp) => {
                  const mapping = projectMappings.find(
                    (pm) => pm.harvestId === hp.id
                  );
                  return (
                    <div
                      key={hp.id}
                      className="flex items-center gap-4 rounded-lg border border-slate-700 bg-slate-900 p-3"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-300">
                        {hp.name}
                      </span>
                      <span className="text-slate-600">→</span>
                      <div className="flex-1">
                        <Select
                          value={mapping?.venixProjectId ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setProjectMappings((prev) =>
                              prev.map((pm) =>
                                pm.harvestId === hp.id
                                  ? { ...pm, venixProjectId: val || null }
                                  : pm
                              )
                            );
                          }}
                          options={[
                            { value: "", label: "Select project..." },
                            { value: CREATE_NEW, label: "➕ Create New" },
                            ...venixProjectsForClient.map((p) => ({
                              value: p.id,
                              label: p.name,
                            })),
                          ]}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(3)}>
              Back
            </Button>
            <Button
              onClick={() => setStep(uniqueUsers.length > 1 ? 5 : 6)}
              disabled={!allProjectsMapped()}
              className="flex-1"
            >
              {uniqueUsers.length > 1 ? "Next: Map Users" : "Next: Preview"}
            </Button>
          </div>
        </div>
      )}

      {/* Step 5: Contractor Mapping */}
      {step === 5 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">
            Map Harvest Users to Venix Contractors
          </h2>
          <div className="space-y-3">
            {userMappings.map((um) => (
              <div
                key={um.harvestId}
                className="flex items-center gap-4 rounded-lg border border-slate-700 bg-slate-900 p-3"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-slate-300">
                  {um.harvestName}
                </span>
                <span className="text-slate-600">→</span>
                <div className="flex-1">
                  <Select
                    value={um.venixContractorId}
                    onChange={(e) => {
                      setUserMappings((prev) =>
                        prev.map((m) =>
                          m.harvestId === um.harvestId
                            ? { ...m, venixContractorId: e.target.value }
                            : m
                        )
                      );
                    }}
                    options={[
                      { value: "", label: "Select contractor..." },
                      ...contractors
                        .filter((c) => c.is_active)
                        .map((c) => ({
                          value: c.id,
                          label: c.display_name,
                        })),
                    ]}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(4)}>
              Back
            </Button>
            <Button
              onClick={() => setStep(6)}
              disabled={userMappings.some((um) => !um.venixContractorId)}
              className="flex-1"
            >
              Next: Preview
            </Button>
          </div>
        </div>
      )}

      {/* Step 6: Preview + Confirm */}
      {step === 6 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">
            Preview Import
          </h2>

          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
              <p className="text-slate-500">Total Entries</p>
              <p className="text-lg font-semibold text-slate-200">
                {entries.length}
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
              <p className="text-slate-500">Date Range</p>
              <p className="text-sm font-medium text-slate-200">
                {fromDate} — {toDate}
              </p>
            </div>
            <div className="col-span-2 rounded-lg border border-slate-700 bg-slate-900 p-3 sm:col-span-1">
              <p className="text-slate-500">Clients</p>
              <div className="mt-1 space-y-0.5">
                {clientBreakdown.map((cb) => (
                  <p key={cb.name} className="text-xs text-slate-300">
                    {cb.name}: {cb.count}
                  </p>
                ))}
              </div>
            </div>
          </div>

          <div className="max-h-80 overflow-auto rounded-lg border border-slate-700">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-800 text-slate-400">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Start</th>
                  <th className="px-3 py-2">End</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Project</th>
                  <th className="px-3 py-2">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {previewEntries.map((row, i) => (
                  <tr key={i} className="text-slate-300">
                    <td className="whitespace-nowrap px-3 py-2">{row.date}</td>
                    <td className="whitespace-nowrap px-3 py-2">{row.start}</td>
                    <td className="whitespace-nowrap px-3 py-2">{row.end}</td>
                    <td className="px-3 py-2">{row.customer}</td>
                    <td className="px-3 py-2">{row.project}</td>
                    <td className="max-w-xs truncate px-3 py-2">
                      {row.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {entries.length > 50 && (
            <p className="text-xs text-slate-500">
              Showing first 50 of {entries.length} entries
            </p>
          )}

          {/* Invalid entries section */}
          {invalidEntries.length > 0 && (
            <div className="space-y-3">
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                <p className="text-sm font-medium text-amber-400">
                  {invalidEntries.length} {invalidEntries.length === 1 ? "entry has" : "entries have"} invalid times (end ≤ start) and will be skipped unless corrected
                </p>
              </div>
              <div className="max-h-60 overflow-auto rounded-lg border border-slate-700">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-800 text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Original</th>
                      <th className="px-3 py-2">Start</th>
                      <th className="px-3 py-2">End</th>
                      <th className="px-3 py-2">Client / Project</th>
                      <th className="px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {invalidEntries.map((e) => {
                      const override = timeOverrides.get(e.id);
                      const parsedStart = e.started_time ? parseHarvestTime(e.started_time) : "00:00";
                      const parsedEnd = e.ended_time ? parseHarvestTime(e.ended_time) : "00:00";
                      const currentStart = override?.start ?? parsedStart;
                      const currentEnd = override?.end ?? parsedEnd;

                      return (
                        <tr key={e.id} className="text-slate-300">
                          <td className="whitespace-nowrap px-3 py-2">{e.spent_date}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-slate-500">
                            {e.started_time ?? "-"} → {e.ended_time ?? "-"}
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="time"
                              value={currentStart}
                              onChange={(ev) => {
                                setTimeOverrides((prev) => {
                                  const next = new Map(prev);
                                  next.set(e.id, { start: ev.target.value, end: currentEnd });
                                  return next;
                                });
                              }}
                              className="w-24 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="time"
                              value={currentEnd}
                              onChange={(ev) => {
                                setTimeOverrides((prev) => {
                                  const next = new Map(prev);
                                  next.set(e.id, { start: currentStart, end: ev.target.value });
                                  return next;
                                });
                              }}
                              className="w-24 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2 text-slate-400">
                            {e.client.name} / {e.project.name}
                          </td>
                          <td className="px-3 py-2">
                            {currentEnd > currentStart ? (
                              <span className="text-xs text-green-400">✓ Fixed</span>
                            ) : (
                              <span className="text-xs text-amber-400">Will skip</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() =>
                setStep(uniqueUsers.length > 1 ? 5 : 4)
              }
            >
              Back
            </Button>
            <Button onClick={handleImport} className="flex-1">
              Import {validEntryCount} {validEntryCount === 1 ? "Entry" : "Entries"}
              {invalidEntries.length > 0 && ` (skipping ${invalidEntries.length})`}
            </Button>
          </div>
        </div>
      )}

      {/* Step 7: Import + Results */}
      {step === 7 && (
        <div className="flex flex-col items-center gap-4 py-12">
          {importing ? (
            <>
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-600 border-t-indigo-500" />
              <p className="text-slate-400">
                Importing entries...
              </p>
            </>
          ) : importError ? (
            <>
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-center">
                <p className="font-medium text-red-400">Import Failed</p>
                <p className="mt-1 text-sm text-red-300">{importError}</p>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(6)}>
                  Back to Preview
                </Button>
                <Button onClick={handleImport}>
                  Retry Import
                </Button>
              </div>
            </>
          ) : importResult ? (
            <>
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-6 text-center">
                <p className="text-lg font-semibold text-green-400">
                  Import Complete
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {importResult.imported} of {importResult.total} entries
                  imported successfully
                </p>
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="mt-3 text-left text-xs text-red-400">
                    {importResult.errors.map((err, i) => (
                      <p key={i}>{err}</p>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                {importResult.imported < importResult.total && (
                  <Button variant="secondary" onClick={() => setStep(6)}>
                    Back to Preview
                  </Button>
                )}
                <Button onClick={() => (window.location.href = "/")}>
                  Go to Time Entry
                </Button>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
