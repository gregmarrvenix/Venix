"use client";

import { useState, useMemo } from "react";
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
  const { projects, loading, create, update, refresh } = useProjects({
    customerId: filterCustomerId || undefined,
    includeInactive: true,
  });
  const toast = useToast();
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const activeProjects = useMemo(() => projects.filter((p) => p.is_active), [projects]);
  const inactiveProjects = useMemo(() => projects.filter((p) => !p.is_active), [projects]);

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

  async function handleToggleActive(id: string, currentlyActive: boolean) {
    try {
      await update(id, { is_active: !currentlyActive });
      toast.success(currentlyActive ? "Project deactivated" : "Project activated");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update project");
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

      {/* Active projects — Desktop table */}
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left text-slate-400">
              <th className="pb-2 font-medium">Project Name</th>
              <th className="pb-2 font-medium">Customer</th>
              <th className="pb-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {activeProjects.map((p) => (
              <tr key={p.id} className="border-b border-slate-700/50">
                <td className="py-3 text-slate-200">{p.name}</td>
                <td className="py-3 text-slate-400">{p.customer?.name ?? "—"}</td>
                <td className="py-3 text-right">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setEditingProject(p)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleToggleActive(p.id, true)} className="text-red-400 hover:text-red-300">
                      Deactivate
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {activeProjects.length === 0 && (
              <tr><td colSpan={3} className="py-6 text-center text-slate-400">No active projects</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Active projects — Mobile cards */}
      <div className="md:hidden space-y-2">
        {activeProjects.map((p) => (
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
                <Button variant="ghost" size="sm" onClick={() => handleToggleActive(p.id, true)} className="text-red-400">
                  Deactivate
                </Button>
              </div>
            </div>
          </div>
        ))}
        {activeProjects.length === 0 && (
          <p className="text-slate-400 text-center py-6">No active projects</p>
        )}
      </div>

      {/* Inactive projects section */}
      {inactiveProjects.length > 0 && (
        <>
          <h3 className="text-sm font-medium text-slate-400 mt-8 mb-3">Inactive Projects</h3>

          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <tbody>
                {inactiveProjects.map((p) => (
                  <tr key={p.id} className="border-b border-slate-700/50">
                    <td className="py-3 text-slate-400">{p.name}</td>
                    <td className="py-3 text-slate-400">{p.customer?.name ?? "—"}</td>
                    <td className="py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => setEditingProject(p)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleToggleActive(p.id, false)} className="text-green-400 hover:text-green-300">
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
            {inactiveProjects.map((p) => (
              <div key={p.id} className="rounded-lg bg-slate-800 border border-slate-700 p-3 opacity-75">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 font-medium">{p.name}</span>
                    <span className="text-slate-500 text-sm ml-2">{p.customer?.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditingProject(p)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleToggleActive(p.id, false)} className="text-green-400">
                      Activate
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Project">
        <ProjectForm onSave={handleCreate} onCancel={() => setShowCreate(false)} />
      </Modal>

      <Modal isOpen={!!editingProject} onClose={() => setEditingProject(null)} title="Edit Project">
        {editingProject && (
          <ProjectForm project={editingProject} onSave={handleUpdate} onCancel={() => setEditingProject(null)} />
        )}
      </Modal>
    </>
  );
}
