import { redirect } from "next/navigation";
import {
  CreditCard,
  FileText,
  Activity,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getMySubscription,
  getMyInvoices,
  getMyUsageSummary,
  getMySupportTickets,
  getMySubscriptionEvents,
} from "./actions";

export const instant = false;

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "Ativa", color: "bg-emerald-100 text-emerald-700" },
  trialing: { label: "Teste grátis", color: "bg-blue-100 text-blue-700" },
  past_due: { label: "Pagamento pendente", color: "bg-amber-100 text-amber-700" },
  grace_period: { label: "Período de carência", color: "bg-orange-100 text-orange-700" },
  paused: { label: "Pausada", color: "bg-slate-100 text-slate-600" },
  canceled: { label: "Cancelada", color: "bg-red-100 text-red-700" },
  expired: { label: "Expirada", color: "bg-red-100 text-red-600" },
  incomplete: { label: "Incompleta", color: "bg-yellow-100 text-yellow-700" },
};

const INVOICE_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "text-amber-600" },
  approved: { label: "Aprovada", color: "text-emerald-600" },
  refused: { label: "Recusada", color: "text-red-600" },
  processing: { label: "Processando", color: "text-blue-600" },
  refunded: { label: "Reembolsada", color: "text-slate-500" },
  cancelled: { label: "Cancelada", color: "text-slate-400" },
};

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const [subscription, invoices, usageSummary, tickets, events] = await Promise.all([
    getMySubscription(),
    getMyInvoices(),
    getMyUsageSummary(),
    getMySupportTickets(),
    getMySubscriptionEvents(),
  ]);

  const statusInfo = subscription
    ? STATUS_LABELS[subscription.status] ?? { label: subscription.status, color: "bg-slate-100 text-slate-600" }
    : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0B1220]">Minha Assinatura</h1>
        <p className="mt-1 text-sm text-slate-500">
          Gerencie seu plano, faturas e uso da plataforma.
        </p>
      </div>

      {!subscription ? (
        /* No subscription state */
        <div className="rounded-xl border border-dashed border-[#E4E9F2] bg-white p-12 text-center">
          <CreditCard className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-lg font-semibold text-[#0B1220]">
            Nenhuma assinatura ativa
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Sua organização ainda não possui um plano ativo. Escolha um plano para começar.
          </p>
          <a
            href="/planos"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#3563F5] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2a52d4]"
          >
            Ver planos
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      ) : (
        <>
          {/* Subscription Overview Card */}
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-[#E4E9F2] bg-white p-6 shadow-sm md:col-span-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-[#0B1220]">
                      {subscription.plan_name}
                    </h2>
                    {statusInfo && (
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Cobrança {subscription.billing_interval === "annual" ? "anual" : "mensal"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[#0B1220]">
                    {subscription.monthly_price === 0
                      ? "Grátis"
                      : BRL.format(subscription.monthly_price)}
                  </p>
                  {subscription.monthly_price > 0 && (
                    <p className="text-xs text-slate-400">/mês</p>
                  )}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[#E4E9F2] pt-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-slate-400">Início do ciclo</p>
                  <p className="mt-1 text-sm font-medium text-[#0B1220]">
                    {subscription.current_period_start
                      ? new Date(subscription.current_period_start).toLocaleDateString("pt-BR")
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Próxima cobrança</p>
                  <p className="mt-1 text-sm font-medium text-[#0B1220]">
                    {subscription.current_period_end
                      ? new Date(subscription.current_period_end).toLocaleDateString("pt-BR")
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Trial</p>
                  <p className="mt-1 text-sm font-medium text-[#0B1220]">
                    {subscription.trial_end
                      ? `Até ${new Date(subscription.trial_end).toLocaleDateString("pt-BR")}`
                      : "Sem trial"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Assinatura desde</p>
                  <p className="mt-1 text-sm font-medium text-[#0B1220]">
                    {new Date(subscription.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="space-y-4">
              <div className="rounded-xl border border-[#E4E9F2] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#3563F5]/10">
                    <Activity className="h-5 w-5 text-[#3563F5]" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Status</p>
                    <p className="text-sm font-semibold text-[#0B1220]">{statusInfo?.label}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-[#E4E9F2] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#20C5C9]/10">
                    <FileText className="h-5 w-5 text-[#20C5C9]" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Faturas pendentes</p>
                    <p className="text-sm font-semibold text-[#0B1220]">
                      {invoices.filter((i) => i.status === "pending").length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-[#E4E9F2] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                    <MessageSquare className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Tickets abertos</p>
                    <p className="text-sm font-semibold text-[#0B1220]">
                      {tickets.filter((t) => t.status === "open" || t.status === "in_progress").length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Usage Quotas */}
          {usageSummary.length > 0 && (
            <div>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#0B1220]">
                <TrendingUp className="h-5 w-5 text-[#3563F5]" />
                Uso do período
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {usageSummary.map((u) => {
                  const pct = u.percentage ?? 0;
                  const isWarning = pct >= 80;
                  const isDanger = pct >= 95;

                  return (
                    <div
                      key={u.feature_key}
                      className="rounded-xl border border-[#E4E9F2] bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-[#0B1220]">
                          {u.feature_key.split(".").pop()?.replace(/_/g, " ") ?? u.feature_key}
                        </p>
                        {isDanger && <AlertTriangle className="h-4 w-4 text-red-500" />}
                        {isWarning && !isDanger && <Clock className="h-4 w-4 text-amber-500" />}
                      </div>
                      <div className="mt-3 flex items-end gap-2">
                        <span className="text-2xl font-bold text-[#0B1220]">{u.current_usage}</span>
                        <span className="mb-1 text-sm text-slate-400">
                          / {u.limit === null || u.limit === 0 ? "∞" : u.limit}
                        </span>
                      </div>
                      {u.limit !== null && u.limit > 0 && (
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isDanger
                                ? "bg-red-500"
                                : isWarning
                                  ? "bg-amber-500"
                                  : "bg-[#20C5C9]"
                            }`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Invoices */}
          <div>
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#0B1220]">
              <FileText className="h-5 w-5 text-[#3563F5]" />
              Faturas recentes
            </h3>
            {invoices.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#E4E9F2] bg-white p-8 text-center">
                <p className="text-sm text-slate-500">Nenhuma fatura emitida ainda.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#E4E9F2] bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E4E9F2] bg-slate-50">
                      <th className="px-4 py-3 text-left font-semibold text-[#0B1220]">Vencimento</th>
                      <th className="px-4 py-3 text-left font-semibold text-[#0B1220]">Valor</th>
                      <th className="px-4 py-3 text-left font-semibold text-[#0B1220]">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-[#0B1220]">Pago em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.slice(0, 10).map((inv) => {
                      const st = INVOICE_STATUS[inv.status] ?? { label: inv.status, color: "text-slate-500" };
                      return (
                        <tr key={inv.id} className="border-b border-[#E4E9F2] last:border-0">
                          <td className="px-4 py-3 text-[#0B1220]">
                            {new Date(inv.due_at).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="px-4 py-3 font-medium text-[#0B1220]">
                            {BRL.format(inv.amount)}
                          </td>
                          <td className={`px-4 py-3 font-medium ${st.color}`}>{st.label}</td>
                          <td className="px-4 py-3 text-slate-500">
                            {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString("pt-BR") : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Events Timeline */}
          {events.length > 0 && (
            <div>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#0B1220]">
                <Clock className="h-5 w-5 text-[#3563F5]" />
                Histórico da assinatura
              </h3>
              <div className="space-y-3">
                {events.slice(0, 10).map((evt) => (
                  <div
                    key={evt.id}
                    className="flex items-start gap-3 rounded-lg border border-[#E4E9F2] bg-white p-4 shadow-sm"
                  >
                    {evt.event_type.includes("payment_received") || evt.event_type.includes("activated") ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                    ) : evt.event_type.includes("failed") || evt.event_type.includes("canceled") ? (
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                    ) : evt.event_type.includes("upgrade") ? (
                      <ArrowUpRight className="mt-0.5 h-5 w-5 shrink-0 text-[#3563F5]" />
                    ) : evt.event_type.includes("downgrade") ? (
                      <ArrowDownRight className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                    ) : (
                      <Activity className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#0B1220]">
                        {evt.event_type.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(evt.occurred_at).toLocaleString("pt-BR")} · Fonte: {evt.source}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}