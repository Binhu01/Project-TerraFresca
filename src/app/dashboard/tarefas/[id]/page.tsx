import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Trash2,
  User,
} from "lucide-react";
import { getTaskById, getTaskChecklists, getSubtasks } from "../actions";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  todo: { label: "A fazer", color: "bg-gray-100 text-gray-700 border-gray-200" },
  in_progress: { label: "Em andamento", color: "bg-amber-100 text-amber-700 border-amber-200" },
  done: { label: "Concluído", color: "bg-green-100 text-green-700 border-green-200" },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-700 border-red-200" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: "Baixa", color: "text-gray-500" },
  medium: { label: "Média", color: "text-blue-600" },
  high: { label: "Alta", color: "text-orange-600" },
  urgent: { label: "Urgente", color: "text-red-600 font-bold" },
};

export default async function TarefaDetailPage(props: { params: Promise<{ id: string }> }) {
  await headers();
  const { id } = await props.params;
  const task = await getTaskById(id);

  if (!task) {
    notFound();
  }

  const [checklists, subtasks] = await Promise.all([
    getTaskChecklists(id),
    getSubtasks(id),
  ]);

  const statusInfo = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.todo;
  const priorityInfo = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/dashboard/tarefas"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-nexora-text-secondary transition-colors hover:text-nexora-blue"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para tarefas
      </Link>

      {/* Header Card */}
      <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-bold text-nexora-dark">{task.title}</h1>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              <span className={`text-sm font-medium ${priorityInfo.color}`}>
                {priorityInfo.label}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-nexora-text-secondary">
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4 text-nexora-blue" />
                Criado por: {task.creator_name}
              </span>
              {task.assignee_name && (
                <span className="flex items-center gap-1.5">
                  <User className="h-4 w-4 text-nexora-cyan" />
                  Responsável: {task.assignee_name}
                </span>
              )}
              {task.due_date && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-nexora-blue" />
                  Prazo: {new Date(task.due_date).toLocaleDateString("pt-BR")}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-nexora-blue" />
                Criado em: {new Date(task.created_at).toLocaleDateString("pt-BR")}
              </span>
            </div>
          </div>
        </div>

        {task.description && (
          <div className="mt-6 rounded-lg bg-nexora-bg-secondary/50 p-4">
            <p className="whitespace-pre-line text-sm text-nexora-text-secondary">{task.description}</p>
          </div>
        )}
      </div>

      {/* Checklist */}
      <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-nexora-dark">
          Checklist ({task.checklist_completed}/{task.checklist_total})
        </h2>
        {checklists.length === 0 ? (
          <p className="mt-4 text-sm text-nexora-text-secondary">Nenhum item no checklist.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {checklists.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-lg border border-nexora-border p-3">
                {item.is_completed ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-nexora-border" />
                )}
                <span className={`text-sm ${item.is_completed ? "text-nexora-text-secondary line-through" : "text-nexora-dark"}`}>
                  {item.title}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Subtasks */}
      {subtasks.length > 0 && (
        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-nexora-dark">
            Subtarefas ({subtasks.length})
          </h2>
          <div className="mt-4 space-y-2">
            {subtasks.map((sub) => {
              const subStatus = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.todo;
              return (
                <Link
                  key={sub.id}
                  href={`/dashboard/tarefas/${sub.id}`}
                  className="flex items-center justify-between rounded-lg border border-nexora-border p-3 transition-colors hover:bg-nexora-bg-secondary/30"
                >
                  <span className="text-sm font-medium text-nexora-dark">{sub.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${subStatus.color}`}>
                    {subStatus.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}