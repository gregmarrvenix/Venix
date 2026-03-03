"use client";

import { useState } from "react";
import { useCustomers } from "@/hooks/useCustomers";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { CustomerForm } from "./CustomerForm";
import type { Customer } from "@/lib/types";

export function CustomerList() {
  const { customers, loading, create, update, remove } = useCustomers();
  const toast = useToast();
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function handleCreate(data: { name: string }) {
    await create(data.name);
    setShowCreate(false);
    toast.success("Customer created");
  }

  async function handleUpdate(data: { name: string }) {
    if (!editingCustomer) return;
    await update(editingCustomer.id, data);
    setEditingCustomer(null);
    toast.success("Customer updated");
  }

  async function handleDeactivate(id: string) {
    try {
      await remove(id);
      setConfirmDelete(null);
      toast.success("Customer deactivated");
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
        <h2 className="text-lg font-semibold text-slate-200">Customers</h2>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          Add Customer
        </Button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left text-slate-400">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-slate-700/50">
                <td className="py-3 text-slate-200">{c.name}</td>
                <td className="py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.is_active ? "bg-green-500/10 text-green-400" : "bg-slate-700 text-slate-400"}`}>
                    {c.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-3 text-right">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setEditingCustomer(c)}>
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
        {customers.map((c) => (
          <div key={c.id} className="rounded-lg bg-slate-800 border border-slate-700 p-3 flex items-center justify-between">
            <div>
              <span className="text-slate-200 font-medium">{c.name}</span>
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${c.is_active ? "bg-green-500/10 text-green-400" : "bg-slate-700 text-slate-400"}`}>
                {c.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setEditingCustomer(c)}>
                Edit
              </Button>
              {c.is_active && (
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(c.id)} className="text-red-400">
                  Deactivate
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Customer">
        <CustomerForm onSave={handleCreate} onCancel={() => setShowCreate(false)} />
      </Modal>

      <Modal isOpen={!!editingCustomer} onClose={() => setEditingCustomer(null)} title="Edit Customer">
        {editingCustomer && (
          <CustomerForm customer={editingCustomer} onSave={handleUpdate} onCancel={() => setEditingCustomer(null)} />
        )}
      </Modal>

      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Deactivate Customer">
        <p className="text-slate-300 mb-4">Are you sure you want to deactivate this customer?</p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => confirmDelete && handleDeactivate(confirmDelete)}>Deactivate</Button>
        </div>
      </Modal>
    </>
  );
}
