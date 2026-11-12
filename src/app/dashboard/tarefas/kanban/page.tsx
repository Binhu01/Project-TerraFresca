import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft, Plus, CheckSquare } from "lucide-react";
import { getKanbanData } from "../actions";

const PRIORITY_COLORS: Record<string, string> = {
  low: "border-l-gray-300",
  medium: "border-l-blue-400",
  high: "border-l-orange-400",
  urgent: "border-l-red-500",
};

export default async function KanbanPage() {
  await headers();
  const columns = await getKanbanData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/tarefas"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-nexora-text-secondary transition-colors hover:text-nexora-blue"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <h1 className="font-display text-2xl font-bold text-nexora-dark">Kanban</h1>
        </div>
        <Link
          href="/dashboard/tarefas/novo"
          className="inline-flex items-center gap-1.5 rounded-lg bg-nexora-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nova tarefa
        </Link>
      </div>

      {/* Kanban Board */}
      <div className="grid gap-6 lg:grid-cols-3">
        {columns.map((column) => (
          <div key={column.status} className="flex flex-col">
            {/* Column Header */}
            <div className="mb-3 flex items-center justify-between rounded-lg bg-nexora-bg-secondary px-4 py-3">
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-nexora-dark">
                {column.label}
              </h2>
              <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-nexora-text-secondary shadow-sm">
                {column.count}
              </span>
            </div>

            {/* Cards */}
            <div className="flex min-h-[200px] flex-col gap-3">
              {column.tasks.length === 0 ? (
                <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-nexora-border p-6">
                  <p className="text-xs text-nexora-text-secondary">Sem tarefas</p>
                </div>
              ) : (
                column.tasks.map((task) => (
                  <Link
                    key={task.id}
                    href={`/dashboard/tarefas/${task.id}`}
                    className={`group rounded-xl border border-nexora-border border-l-4 bg-white p-4 shadow-sm transition-all hover:shadow-md ${PRIORITY_COLORS[task.priority] ?? "border-l-gray-300"}`}
                  >
                    <h3 className="font-medium text-nexora-dark group-hover:text-nexora-blue">
                      {task.title}
                    </h3>

                    {/* Checklist progress */}
                    {task.checklist_total > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-nexora-text-secondary">
                          <span>Checklist</span>
                          <span>{task.checklist_completed}/{task.checklist_total}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-nexora-bg-secondary">
                          <div
                            className="h-full rounded-full bg-nexora-cyan transition-all"
                            style={{ width: `${(task.checklist_completed / task.checklist_total) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="mt-3 flex items-center justify-between text-xs text-nexora-text-secondary">
                      <span>{task.assignee_name ?? "Sem responsável"}</span>
                      {task.due_date && (
                        <span className={new Date(task.due_date) < new Date() && task.status !== "done" ? "font-bold text-red-600" : ""}>
                          {new Date(task.due_date).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}