"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ContractorForm } from "./ContractorForm";
import type { Contractor } from "@/lib/types";

export function ContractorList() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const toast = useToast();

  const activeContractors = useMemo(() => contractors.filter((c) => c.is_active), [contractors]);
  const inactiveContractors = useMemo(() => contractors.filter((c) => !c.is_active), [contractors]);

  const fetchContractors = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Contractor[]>("/api/contractors?include_inactive=true");
      setContractors(data);
    } catch (err) {
      console.error("Failed to fetch contractors:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContractors();
  }, [fetchContractors]);

  async function handleCreate(data: { display_name: string; email: string }) {
    const contractor = await apiFetch<Contractor>("/api/contractors", {
      method: "POST",
      body: JSON.stringify(data),
    });
    setContractors((prev) => [...prev, contractor]);
    setShowCreate(false);
    toast.success("Contractor created");
  }

  async function handleUpdate(data: { display_name: string; email: string }) {
    if (!editingContractor) return;
    const contractor = await apiFetch<Contractor>(`/api/contractors/${editingContractor.id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    setContractors((prev) => prev.map((c) => (c.id === editingContractor.id ? contractor : c)));
    setEditingContractor(null);
    toast.success("Contractor updated");
  }

  async function handleToggleActive(id: string, currentlyActive: boolean) {
    try {
      const contractor = await apiFetch<Contractor>(`/api/contractors/${id}`, {
        method: "PUT",
        body: JSON.stringify({ is_active: !currentlyActive }),
      });
      setContractors((prev) => prev.map((c) => (c.id === id ? contractor : c)));
      toast.success(currentlyActive ? "Contractor deactivated" : "Contractor activated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update contractor");
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 rounded-lg bg-slate-800" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-200">Active Contractors</h2>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          Add Contractor
        </Button>
      </div>

      {/* Active contractors — Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700">
              <TableHead className="text-slate-400">Name</TableHead>
              <TableHead className="text-slate-400">Email</TableHead>
              <TableHead className="text-right text-slate-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeContractors.map((c) => (
              <TableRow key={c.id} className="border-slate-700/50">
                <TableCell className="text-slate-200">{c.display_name}</TableCell>
                <TableCell className="text-slate-400">{c.email}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button variant="secondary" size="sm" onClick={() => setEditingContractor(c)}>
                      Edit
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleToggleActive(c.id, true)}>
                      Deactivate
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {activeContractors.length === 0 && (
              <TableRow><TableCell colSpan={3} className="py-6 text-center text-slate-400">No active contractors</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Active contractors — Mobile cards */}
      <div className="md:hidden space-y-2">
        {activeContractors.map((c) => (
          <div key={c.id} className="rounded-lg bg-slate-800 border border-slate-700 p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-200 font-medium">{c.display_name}</div>
                <div className="text-slate-400 text-sm">{c.email}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setEditingContractor(c)}>
                  Edit
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleToggleActive(c.id, true)}>
                  Deactivate
                </Button>
              </div>
            </div>
          </div>
        ))}
        {activeContractors.length === 0 && (
          <p className="text-slate-400 text-center py-6">No active contractors</p>
        )}
      </div>

      {/* Inactive contractors section */}
      {inactiveContractors.length > 0 && (
        <>
          <div className="mt-8 mb-4 pt-4">
            <Separator className="mb-4 bg-slate-700" />
            <h2 className="text-lg font-semibold text-slate-400">Inactive Contractors</h2>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableBody>
                {inactiveContractors.map((c) => (
                  <TableRow key={c.id} className="border-slate-700/50">
                    <TableCell className="text-slate-400">{c.display_name}</TableCell>
                    <TableCell className="text-slate-500">{c.email}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button variant="secondary" size="sm" onClick={() => setEditingContractor(c)}>
                          Edit
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => handleToggleActive(c.id, false)}>
                          Activate
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {inactiveContractors.map((c) => (
              <div key={c.id} className="rounded-lg bg-slate-800 border border-slate-700 p-3 opacity-75">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-slate-400 font-medium">{c.display_name}</div>
                    <div className="text-slate-500 text-sm">{c.email}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setEditingContractor(c)}>
                      Edit
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handleToggleActive(c.id, false)}>
                      Activate
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Contractor">
        <ContractorForm onSave={handleCreate} onCancel={() => setShowCreate(false)} />
      </Modal>

      <Modal isOpen={!!editingContractor} onClose={() => setEditingContractor(null)} title="Edit Contractor">
        {editingContractor && (
          <ContractorForm contractor={editingContractor} onSave={handleUpdate} onCancel={() => setEditingContractor(null)} />
        )}
      </Modal>
    </>
  );
}
