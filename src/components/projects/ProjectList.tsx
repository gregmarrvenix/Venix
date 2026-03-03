"use client";

import { useState } from "react";
import { useCustomers } from "@/hooks/useCustomers";
import { useProjects } from "@/hooks/useProjects";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ProjectForm } from "./ProjectForm";
import type { Project } from "@/lib/types";

export function ProjectList() {
  const { customers } = useCustomers();
  const [filterCustomerId, setFilterCustomerId] = useState("");
  const { projects, loading, create, update, remove } = useProjects(
    filterCustomerId || undefined
  );
  const toast = useToast();
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function handleCreate(data: { customer_id: string; name: string }) {
    await create(data.customer_id, data.name);
    setShowCreate(false);
    toast.success("Project created");
  }

  async function handleUpdate(data: { customer_id: string; name: string }) {
    if (!editingProject) return;
    await update(editingProject.id, data);
    setEditingProject(null);
    toast.success("Project updated");
  }

  async function handleDeactivate(id: string) {
    try {
      await remove(id);
      setConfirmDelete(null);
      toast.success("Project deactivated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to deactivate");
    }
  }

  const customerOptions = customers.map((c) => ({ value: c.id, label: c.name }));

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold text-slate-200">Projects</h2>
        <div className="flex gap-2 items-center w-full sm:w-auto">
          <Select
            value={filterCustomerId}
            onChange={(e) => setFilterCustomerId(e.target.value)}
            options={[{ value: "", label: "All Customers" }, ...customerOptions]}
          />
          <Button size="sm" onClick={() => setShowCreate(true)}>
            Add Project
          </Button>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left text-slate-400">
              <th className="pb-2 font-medium">Project Name</th>
              <th className="pb-2 font-medium">Customer</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-b border-slate-700/50">
                <td className="py-3 text-slate-200">{p.name}</td>
                <td className="py-3 text-slate-400">{p.customer?.name ?? "—"}</td>
                <td className="py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? "bg-green-500/10 text-green-400" : "bg-slate-700 text-slate-400"}`}>
                    {p.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-3 text-right">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setEditingProject(p)}>
                      Edit
                    </Button>
                    {p.is_active && (
                      <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(p.id)} className="text-red-400 hover:text-red-300">
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
        {projects.map((p) => (
          <div key={p.id} className="rounded-lg bg-slate-800 border border-slate-700 p-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-slate-200 font-medium">{p.name}</span>
                <span className="text-slate-400 text-sm ml-2">{p.customer?.name}</span>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEditingProject(p)}>
                  Edit
                </Button>
                {p.is_active && (
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(p.id)} className="text-red-400">
                    Deactivate
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Project">
        <ProjectForm onSave={handleCreate} onCancel={() => setShowCreate(false)} />
      </Modal>

      <Modal isOpen={!!editingProject} onClose={() => setEditingProject(null)} title="Edit Project">
        {editingProject && (
          <ProjectForm project={editingProject} onSave={handleUpdate} onCancel={() => setEditingProject(null)} />
        )}
      </Modal>

      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Deactivate Project">
        <p className="text-slate-300 mb-4">Are you sure you want to deactivate this project?</p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => confirmDelete && handleDeactivate(confirmDelete)}>Deactivate</Button>
        </div>
      </Modal>
    </>
  );
}
