"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ContractorForm } from "./ContractorForm";
import type { Contractor } from "@/lib/types";

export function ContractorList() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const toast = useToast();

  const fetchContractors = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Contractor[]>("/api/contractors");
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

  async function handleDeactivate(id: string) {
    try {
      await apiFetch(`/api/contractors/${id}`, { method: "DELETE" });
      setContractors((prev) => prev.filter((c) => c.id !== id));
      setConfirmDelete(null);
      toast.success("Contractor deactivated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to deactivate");
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-slate-800 rounded-lg border border-slate-700" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-200">Contractors</h2>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          Add Contractor
        </Button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left text-slate-400">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Email</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {contractors.map((c) => (
              <tr key={c.id} className="border-b border-slate-700/50">
                <td className="py-3 text-slate-200">{c.display_name}</td>
                <td className="py-3 text-slate-400">{c.email}</td>
                <td className="py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.is_active ? "bg-green-500/10 text-green-400" : "bg-slate-700 text-slate-400"}`}>
                    {c.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-3 text-right">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setEditingContractor(c)}>
                      Edit
                    </Button>
                    {c.is_active && (
                      <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(c.id)} className="text-red-400 hover:text-red-300">
                        Deactivate
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {contractors.map((c) => (
          <div key={c.id} className="rounded-lg bg-slate-800 border border-slate-700 p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-200 font-medium">{c.display_name}</div>
                <div className="text-slate-400 text-sm">{c.email}</div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEditingContractor(c)}>
                  Edit
                </Button>
                {c.is_active && (
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(c.id)} className="text-red-400">
                    Deactivate
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Contractor">
        <ContractorForm onSave={handleCreate} onCancel={() => setShowCreate(false)} />
      </Modal>

      <Modal isOpen={!!editingContractor} onClose={() => setEditingContractor(null)} title="Edit Contractor">
        {editingContractor && (
          <ContractorForm contractor={editingContractor} onSave={handleUpdate} onCancel={() => setEditingContractor(null)} />
        )}
      </Modal>

      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Deactivate Contractor">
        <p className="text-slate-300 mb-4">Are you sure you want to deactivate this contractor?</p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => confirmDelete && handleDeactivate(confirmDelete)}>Deactivate</Button>
        </div>
      </Modal>
    </>
  );
}
