import { headers } from "next/headers";
import Link from "next/link";
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  User,
  Plus,
  ArrowRight,
  CalendarDays,
} from "lucide-react";
import { getTasksDashboardStats, getTasks } from "./actions";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function TarefasDashboardPage() {
  await headers();

  const [stats, recentResult] = await Promise.all([
    getTasksDashboardStats(),
    getTasks({ page: 1, perPage: 10 }),
  ]);

  const statCards = [
    { label: "Minhas tarefas", value: stats.my_tasks_count, icon: User, color: "text-nexora-blue bg-blue-50 border-blue-200" },
    { label: "A fazer", value: stats.todo_count, icon: CheckSquare, color: "text-gray-600 bg-gray-50 border-gray-200" },
    { label: "Em andamento", value: stats.in_progress_count, icon: Clock, color: "text-amber-600 bg-amber-50 border-amber-200" },
    { label: "Concluídas", value: stats.done_count, icon: CheckSquare, color: "text-green-600 bg-green-50 border-green-200" },
    { label: "Atrasadas", value: stats.overdue_count, icon: AlertTriangle, color: "text-red-600 bg-red-50 border-red-200" },
    { label: "Urgentes", value: stats.urgent_count, icon: AlertTriangle, color: "text-orange-600 bg-orange-50 border-orange-200" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-nexora-dark">Tarefas</h1>
          <p className="mt-1 text-sm text-nexora-text-secondary">
            Gerencie tarefas, acompanhe prazos e organize o trabalho da equipe.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/tarefas/kanban"
            className="inline-flex items-center gap-1.5 rounded-lg border border-nexora-border bg-white px-4 py-2 text-sm font-medium text-nexora-dark transition-colors hover:bg-nexora-bg-secondary"
          >
            <CheckSquare className="h-4 w-4" />
            Kanban
          </Link>
          <Link
            href="/dashboard/agenda"
            className="inline-flex items-center gap-1.5 rounded-lg border border-nexora-border bg-white px-4 py-2 text-sm font-medium text-nexora-dark transition-colors hover:bg-nexora-bg-secondary"
          >
            <CalendarDays className="h-4 w-4" />
            Agenda
          </Link>
          <Link
            href="/dashboard/tarefas/novo"
            className="inline-flex items-center gap-1.5 rounded-lg bg-nexora-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Nova tarefa
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`rounded-xl border p-4 ${card.color}`}>
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5 opacity-70" />
                <span className="text-2xl font-bold">{card.value}</span>
              </div>
              <p className="mt-1 text-xs font-medium opacity-80">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Tasks */}
      <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-nexora-dark">Tarefas recentes</h2>
          <Link
            href="/dashboard/tarefas/lista"
            className="inline-flex items-center gap-1 text-sm font-medium text-nexora-blue transition-colors hover:text-blue-700"
          >
            Ver todas
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentResult.tasks.length === 0 ? (
          <div className="mt-8 text-center">
            <CheckSquare className="mx-auto h-10 w-10 text-nexora-border" />
            <p className="mt-3 text-sm text-nexora-text-secondary">Nenhuma tarefa encontrada.</p>
            <Link
              href="/dashboard/tarefas/novo"
              className="mt-2 inline-block text-sm font-medium text-nexora-blue hover:text-blue-700"
            >
              Criar primeira tarefa
            </Link>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-nexora-border bg-nexora-bg-secondary/50">
                <tr>
                  <th className="px-4 py-2.5 font-semibold text-nexora-dark">Tarefa</th>
                  <th className="px-4 py-2.5 font-semibold text-nexora-dark">Status</th>
                  <th className="px-4 py-2.5 font-semibold text-nexora-dark">Prioridade</th>
                  <th className="px-4 py-2.5 font-semibold text-nexora-dark">Responsável</th>
                  <th className="px-4 py-2.5 font-semibold text-nexora-dark">Prazo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexora-border">
                {recentResult.tasks.map((task) => {
                  const statusColors: Record<string, string> = {
                    todo: "bg-gray-100 text-gray-700",
                    in_progress: "bg-amber-100 text-amber-700",
                    done: "bg-green-100 text-green-700",
                    cancelled: "bg-red-100 text-red-700",
                  };
                  const priorityColors: Record<string, string> = {
                    low: "text-gray-500",
                    medium: "text-blue-600",
                    high: "text-orange-600",
                    urgent: "text-red-600 font-bold",
                  };
                  const statusLabels: Record<string, string> = {
                    todo: "A fazer",
                    in_progress: "Em andamento",
                    done: "Concluído",
                    cancelled: "Cancelado",
                  };
                  const priorityLabels: Record<string, string> = {
                    low: "Baixa",
                    medium: "Média",
                    high: "Alta",
                    urgent: "Urgente",
                  };

                  return (
                    <tr key={task.id} className="transition-colors hover:bg-nexora-bg-secondary/30">
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/dashboard/tarefas/${task.id}`}
                          className="font-medium text-nexora-dark hover:text-nexora-blue"
                        >
                          {task.title}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[task.status] ?? statusColors.todo}`}>
                          {statusLabels[task.status] ?? task.status}
                        </span>
                      </td>
                      <td className={`px-4 py-2.5 ${priorityColors[task.priority] ?? ""}`}>
                        {priorityLabels[task.priority] ?? task.priority}
                      </td>
                      <td className="px-4 py-2.5 text-nexora-text-secondary">
                        {task.assignee_name ?? "Sem responsável"}
                      </td>
                      <td className="px-4 py-2.5 text-nexora-text-secondary">
                        {task.due_date
                          ? new Date(task.due_date).toLocaleDateString("pt-BR")
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}