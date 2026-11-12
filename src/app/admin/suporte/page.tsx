import { MessageSquare, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { adminGetSupportTickets } from "@/app/dashboard/billing/actions";

export const instant = false;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  open: { label: "Aberto", color: "bg-blue-100 text-blue-700", icon: AlertCircle },
  in_progress: { label: "Em andamento", color: "bg-amber-100 text-amber-700", icon: Clock },
  waiting_customer: { label: "Aguardando cliente", color: "bg-purple-100 text-purple-700", icon: Clock },
  resolved: { label: "Resolvido", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  closed: { label: "Fechado", color: "bg-slate-100 text-slate-600", icon: CheckCircle2 },
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-slate-500",
  medium: "text-blue-600",
  high: "text-amber-600",
  urgent: "text-red-600 font-bold",
};

export default async function AdminSuportePage() {
  const tickets = await adminGetSupportTickets();

  const openCount = tickets.filter((t) => t.status === "open" || t.status === "in_progress").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0B1220]">Tickets de Suporte</h2>
          <p className="mt-1 text-sm text-slate-500">
            {openCount} ticket{openCount !== 1 ? "s" : ""} aberto{openCount !== 1 ? "s" : ""} · {tickets.length} total
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#E4E9F2] bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E4E9F2] bg-slate-50">
              <th className="px-4 py-3 text-left font-semibold text-[#0B1220]">Assunto</th>
              <th className="px-4 py-3 text-left font-semibold text-[#0B1220]">Organização</th>
              <th className="px-4 py-3 text-left font-semibold text-[#0B1220]">Prioridade</th>
              <th className="px-4 py-3 text-left font-semibold text-[#0B1220]">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-[#0B1220]">Criado em</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                  <MessageSquare className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                  Nenhum ticket de suporte encontrado.
                </td>
              </tr>
            ) : (
              tickets.map((ticket) => {
                const statusCfg = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.open;
                const StatusIcon = statusCfg.icon;
                const priorityColor = PRIORITY_COLORS[ticket.priority] ?? "text-slate-500";
                const orgName =
                  (ticket.organizations as Record<string, unknown>)?.name as string | undefined ?? "—";

                return (
                  <tr key={ticket.id} className="border-b border-[#E4E9F2] last:border-0 hover:bg-slate-50/50">
                    <td className="max-w-xs truncate px-4 py-3 font-medium text-[#0B1220]" title={ticket.subject}>
                      {ticket.subject}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{orgName}</td>
                    <td className={`px-4 py-3 capitalize ${priorityColor}`}>
                      {ticket.priority}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusCfg.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(ticket.created_at).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}