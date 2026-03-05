"use client";

import { useState, useMemo } from "react";
import { useCustomers } from "@/hooks/useCustomers";
import { useProjects } from "@/hooks/useProjects";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
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
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 rounded-lg bg-slate-800" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold text-slate-200">Active Projects</h2>
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
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700">
              <TableHead className="text-slate-400">Project Name</TableHead>
              <TableHead className="text-slate-400">Customer</TableHead>
              <TableHead className="text-right text-slate-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeProjects.map((p) => (
              <TableRow key={p.id} className="border-slate-700/50">
                <TableCell className="text-slate-200">{p.name}</TableCell>
                <TableCell className="text-slate-400">{p.customer?.name ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button variant="secondary" size="sm" onClick={() => setEditingProject(p)}>
                      Edit
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleToggleActive(p.id, true)}>
                      Deactivate
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {activeProjects.length === 0 && (
              <TableRow><TableCell colSpan={3} className="py-6 text-center text-slate-400">No active projects</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
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
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setEditingProject(p)}>
                  Edit
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleToggleActive(p.id, true)}>
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
          <div className="mt-8 mb-4 pt-4">
            <Separator className="mb-4 bg-slate-700" />
            <h2 className="text-lg font-semibold text-slate-400">Inactive Projects</h2>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableBody>
                {inactiveProjects.map((p) => (
                  <TableRow key={p.id} className="border-slate-700/50">
                    <TableCell className="text-slate-400">{p.name}</TableCell>
                    <TableCell className="text-slate-400">{p.customer?.name ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button variant="secondary" size="sm" onClick={() => setEditingProject(p)}>
                          Edit
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => handleToggleActive(p.id, false)}>
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
            {inactiveProjects.map((p) => (
              <div key={p.id} className="rounded-lg bg-slate-800 border border-slate-700 p-3 opacity-75">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 font-medium">{p.name}</span>
                    <span className="text-slate-500 text-sm ml-2">{p.customer?.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setEditingProject(p)}>
                      Edit
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handleToggleActive(p.id, false)}>
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
