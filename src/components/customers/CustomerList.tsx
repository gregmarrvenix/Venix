"use client";

import { useState, useMemo } from "react";
import { useCustomers } from "@/hooks/useCustomers";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { CustomerForm } from "./CustomerForm";
import type { Customer } from "@/lib/types";

export function CustomerList() {
  const { customers, loading, create, update, refresh } = useCustomers({ includeInactive: true });
  const toast = useToast();
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const activeCustomers = useMemo(() => customers.filter((c) => c.is_active), [customers]);
  const inactiveCustomers = useMemo(() => customers.filter((c) => !c.is_active), [customers]);

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

  async function handleToggleActive(id: string, currentlyActive: boolean) {
    try {
      await update(id, { is_active: !currentlyActive });
      toast.success(currentlyActive ? "Customer deactivated" : "Customer activated");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update customer");
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
        <h2 className="text-lg font-semibold text-slate-200">Active Customers</h2>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          Add Customer
        </Button>
      </div>

      {/* Active customers — Desktop table */}
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left text-slate-400">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {activeCustomers.map((c) => (
              <tr key={c.id} className="border-b border-slate-700/50">
                <td className="py-3 text-slate-200">{c.name}</td>
                <td className="py-3 text-right">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setEditingCustomer(c)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleToggleActive(c.id, true)} className="text-red-400 hover:text-red-300">
                      Deactivate
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {activeCustomers.length === 0 && (
              <tr><td colSpan={2} className="py-6 text-center text-slate-400">No active customers</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Active customers — Mobile cards */}
      <div className="md:hidden space-y-2">
        {activeCustomers.map((c) => (
          <div key={c.id} className="rounded-lg bg-slate-800 border border-slate-700 p-3 flex items-center justify-between">
            <span className="text-slate-200 font-medium">{c.name}</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setEditingCustomer(c)}>
                Edit
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleToggleActive(c.id, true)} className="text-red-400">
                Deactivate
              </Button>
            </div>
          </div>
        ))}
        {activeCustomers.length === 0 && (
          <p className="text-slate-400 text-center py-6">No active customers</p>
        )}
      </div>

      {/* Inactive customers section */}
      {inactiveCustomers.length > 0 && (
        <>
          <div className="mt-8 mb-4 border-t border-slate-700 pt-4">
            <h2 className="text-lg font-semibold text-slate-400">Inactive Customers</h2>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <tbody>
                {inactiveCustomers.map((c) => (
                  <tr key={c.id} className="border-b border-slate-700/50">
                    <td className="py-3 text-slate-400">{c.name}</td>
                    <td className="py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => setEditingCustomer(c)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleToggleActive(c.id, false)} className="text-green-400 hover:text-green-300">
                          Activate
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {inactiveCustomers.map((c) => (
              <div key={c.id} className="rounded-lg bg-slate-800 border border-slate-700 p-3 flex items-center justify-between opacity-75">
                <span className="text-slate-400 font-medium">{c.name}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditingCustomer(c)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleToggleActive(c.id, false)} className="text-green-400">
                    Activate
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Customer">
        <CustomerForm onSave={handleCreate} onCancel={() => setShowCreate(false)} />
      </Modal>

      <Modal isOpen={!!editingCustomer} onClose={() => setEditingCustomer(null)} title="Edit Customer">
        {editingCustomer && (
          <CustomerForm customer={editingCustomer} onSave={handleUpdate} onCancel={() => setEditingCustomer(null)} />
        )}
      </Modal>
    </>
  );
}
