"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTask } from "../actions";
import type { TaskStatus, TaskPriority } from "@/types/tasks-calendar";

interface Member {
  membership_id: string;
  name: string;
  email: string;
}

interface TaskFormProps {
  members: Member[];
  initialData?: {
    title?: string;
    description?: string | null;
    status?: string;
    priority?: string;
    due_date?: string | null;
    assigned_to?: string | null;
    linked_client_id?: string | null;
    linked_lead_id?: string | null;
    linked_order_id?: string | null;
    linked_supplier_id?: string | null;
  };
  taskId?: string;
}

export function TaskForm({ members, initialData, taskId }: TaskFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    setError(null);

    try {
      const input = {
        title: formData.get("title") as string,
        description: (formData.get("description") as string) || null,
        status: ((formData.get("status") as string) || "todo") as TaskStatus,
        priority: ((formData.get("priority") as string) || "medium") as TaskPriority,
        due_date: (formData.get("due_date") as string) || null,
        assigned_to: (formData.get("assigned_to") as string) || null,
        linked_client_id: (formData.get("linked_client_id") as string) || null,
        linked_lead_id: (formData.get("linked_lead_id") as string) || null,
        linked_order_id: (formData.get("linked_order_id") as string) || null,
        linked_supplier_id: (formData.get("linked_supplier_id") as string) || null,
      };

      if (taskId) {
        await createTask(input);
      } else {
        await createTask(input);
      }

      router.push("/dashboard/tarefas");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar tarefa");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Title */}
          <div className="sm:col-span-2">
            <label htmlFor="title" className="block text-sm font-medium text-nexora-dark">
              Título *
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              maxLength={300}
              defaultValue={initialData?.title ?? ""}
              className="mt-1 w-full rounded-lg border border-nexora-border px-3 py-2 text-sm text-nexora-dark placeholder:text-nexora-text-secondary/50 focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
              placeholder="Ex: Revisar proposta comercial"
            />
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-nexora-dark">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={initialData?.status ?? "todo"}
              className="mt-1 w-full rounded-lg border border-nexora-border px-3 py-2 text-sm text-nexora-dark focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            >
              <option value="todo">A fazer</option>
              <option value="in_progress">Em andamento</option>
              <option value="done">Concluído</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-nexora-dark">
              Prioridade
            </label>
            <select
              id="priority"
              name="priority"
              defaultValue={initialData?.priority ?? "medium"}
              className="mt-1 w-full rounded-lg border border-nexora-border px-3 py-2 text-sm text-nexora-dark focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            >
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label htmlFor="due_date" className="block text-sm font-medium text-nexora-dark">
              Prazo
            </label>
            <input
              id="due_date"
              name="due_date"
              type="date"
              defaultValue={initialData?.due_date ? initialData.due_date.slice(0, 10) : ""}
              className="mt-1 w-full rounded-lg border border-nexora-border px-3 py-2 text-sm text-nexora-dark focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            />
          </div>

          {/* Assigned To */}
          <div>
            <label htmlFor="assigned_to" className="block text-sm font-medium text-nexora-dark">
              Responsável
            </label>
            <select
              id="assigned_to"
              name="assigned_to"
              defaultValue={initialData?.assigned_to ?? ""}
              className="mt-1 w-full rounded-lg border border-nexora-border px-3 py-2 text-sm text-nexora-dark focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            >
              <option value="">Sem responsável</option>
              {members.map((m) => (
                <option key={m.membership_id} value={m.membership_id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-nexora-dark">
              Descrição
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              maxLength={5000}
              defaultValue={initialData?.description ?? ""}
              className="mt-1 w-full rounded-lg border border-nexora-border px-3 py-2 text-sm text-nexora-dark placeholder:text-nexora-text-secondary/50 focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
              placeholder="Detalhes adicionais sobre a tarefa..."
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-nexora-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Salvando..." : taskId ? "Atualizar tarefa" : "Criar tarefa"}
        </button>
        <a
          href="/dashboard/tarefas"
          className="inline-flex items-center gap-1.5 rounded-lg border border-nexora-border bg-white px-6 py-2.5 text-sm font-medium text-nexora-dark transition-colors hover:bg-nexora-bg-secondary"
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}