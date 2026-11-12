import { headers } from "next/headers";
import Link from "next/link";
import { Bell, CheckCheck, Settings, Trash2 } from "lucide-react";
import { getNotifications } from "../tarefas/actions";

const TYPE_LABELS: Record<string, string> = {
  task_assigned: "Tarefa atribuída",
  task_due_soon: "Prazo próximo",
  task_overdue: "Tarefa atrasada",
  task_completed: "Tarefa concluída",
  event_reminder: "Lembrete de evento",
  event_updated: "Evento atualizado",
  event_cancelled: "Evento cancelado",
  order_status_changed: "Pedido atualizado",
  payment_received: "Pagamento recebido",
  payment_overdue: "Pagamento atrasado",
  stock_low: "Estoque baixo",
  purchase_received: "Compra recebida",
  member_joined: "Novo membro",
  system: "Sistema",
};

const TYPE_COLORS: Record<string, string> = {
  task_assigned: "bg-blue-100 text-blue-700",
  task_due_soon: "bg-amber-100 text-amber-700",
  task_overdue: "bg-red-100 text-red-700",
  task_completed: "bg-green-100 text-green-700",
  event_reminder: "bg-purple-100 text-purple-700",
  event_updated: "bg-indigo-100 text-indigo-700",
  event_cancelled: "bg-gray-100 text-gray-700",
  order_status_changed: "bg-cyan-100 text-cyan-700",
  payment_received: "bg-green-100 text-green-700",
  payment_overdue: "bg-red-100 text-red-700",
  stock_low: "bg-orange-100 text-orange-700",
  purchase_received: "bg-teal-100 text-teal-700",
  member_joined: "bg-emerald-100 text-emerald-700",
  system: "bg-gray-100 text-gray-700",
};

export default async function NotificacoesPage() {
  await headers();
  const data = await getNotifications(1, 50);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-nexora-dark">Notificações</h1>
          <p className="mt-1 text-sm text-nexora-text-secondary">
            {data.unread_count > 0
              ? `${data.unread_count} não lida${data.unread_count > 1 ? "s" : ""}`
              : "Todas as notificações foram lidas"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/notificacoes/preferencias"
            className="inline-flex items-center gap-1.5 rounded-lg border border-nexora-border bg-white px-4 py-2 text-sm font-medium text-nexora-dark transition-colors hover:bg-nexora-bg-secondary"
          >
            <Settings className="h-4 w-4" />
            Preferências
          </Link>
        </div>
      </div>

      {/* Notifications List */}
      {data.notifications.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-nexora-border p-12 text-center">
          <Bell className="mx-auto h-12 w-12 text-nexora-border" />
          <p className="mt-4 text-sm font-medium text-nexora-dark">Nenhuma notificação</p>
          <p className="mt-1 text-xs text-nexora-text-secondary">
            Você será notificado sobre tarefas, eventos e atualizações importantes.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.notifications.map((notification) => {
            const typeLabel = TYPE_LABELS[notification.type] ?? notification.type;
            const typeColor = TYPE_COLORS[notification.type] ?? TYPE_COLORS.system;

            return (
              <div
                key={notification.id}
                className={`group flex items-start gap-4 rounded-xl border p-4 transition-all ${
                  notification.is_read
                    ? "border-nexora-border bg-white opacity-70"
                    : "border-nexora-blue/30 bg-blue-50/30 shadow-sm"
                }`}
              >
                {/* Icon */}
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${typeColor}`}>
                  <Bell className="h-4 w-4" />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-sm ${notification.is_read ? "text-nexora-text-secondary" : "font-medium text-nexora-dark"}`}>
                        {notification.title}
                      </p>
                      {notification.body && (
                        <p className="mt-0.5 text-xs text-nexora-text-secondary">{notification.body}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-[10px] text-nexora-text-secondary">
                      {new Date(notification.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="mt-2 flex items-center gap-3">
                    {!notification.is_read && (
                      <form action={`/dashboard/notificacoes/${notification.id}/ler`} method="POST">
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 text-xs font-medium text-nexora-blue hover:text-blue-700"
                        >
                          <CheckCheck className="h-3 w-3" />
                          Marcar como lida
                        </button>
                      </form>
                    )}
                    {notification.link && (
                      <Link
                        href={notification.link}
                        className="text-xs font-medium text-nexora-text-secondary hover:text-nexora-blue"
                      >
                        Ver detalhes →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}