import { redirect } from "next/navigation";
import {
  Users,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  FileText,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAdminDashboardStats } from "@/app/dashboard/billing/actions";

export const instant = false;

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  // Verify platform admin access
  const { data: admin } = await supabase
    .from("platform_admins")
    .select("id, internal_role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!admin) redirect("/dashboard");

  const stats = await getAdminDashboardStats();

  const statCards = [
    {
      label: "Organizações ativas",
      value: stats.active_organizations,
      icon: Users,
      color: "text-[#3563F5]",
      bg: "bg-[#3563F5]/10",
    },
    {
      label: "Assinaturas ativas",
      value: stats.active_subscriptions,
      icon: CreditCard,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Pagamentos pendentes",
      value: stats.past_due_subscriptions,
      icon: AlertTriangle,
      color: "text-amber-600",
      bg: "bg-amber-500/10",
    },
    {
      label: "Novas orgs (30d)",
      value: stats.new_orgs_last_30d,
      icon: TrendingUp,
      color: "text-[#20C5C9]",
      bg: "bg-[#20C5C9]/10",
    },
    {
      label: "Faturas pendentes",
      value: stats.pending_invoices,
      icon: FileText,
      color: "text-purple-600",
      bg: "bg-purple-500/10",
    },
    {
      label: "Falhas pagamento (30d)",
      value: stats.failed_payments_last_30d,
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-500/10",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1220]">Painel Administrativo</h1>
          <p className="mt-1 text-sm text-slate-500">
            Visão geral da plataforma Nexora · {admin.internal_role.replace(/_/g, " ")}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-[#E4E9F2] bg-white px-4 py-2 shadow-sm">
          <ShieldCheck className="h-4 w-4 text-[#3563F5]" />
          <span className="text-sm font-medium text-[#0B1220]">Platform Admin</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-[#E4E9F2] bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-400">{card.label}</p>
                <p className="text-2xl font-bold text-[#0B1220]">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Plan Distribution */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[#E4E9F2] bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#0B1220]">
            <CreditCard className="h-5 w-5 text-[#3563F5]" />
            Distribuição por plano
          </h3>
          {stats.plan_distribution.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma assinatura ativa.</p>
          ) : (
            <div className="space-y-3">
              {stats.plan_distribution.map((plan) => {
                const total = stats.active_subscriptions || 1;
                const pct = Math.round((plan.count / total) * 100);
                return (
                  <div key={plan.plan_slug}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-[#0B1220]">{plan.plan_name}</span>
                      <span className="text-slate-500">{plan.count} ({pct}%)</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#3563F5]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Summary */}
        <div className="rounded-xl border border-[#E4E9F2] bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#0B1220]">
            <TrendingUp className="h-5 w-5 text-[#20C5C9]" />
            Resumo da plataforma
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-[#E4E9F2] pb-2">
              <dt className="text-slate-500">Total de organizações</dt>
              <dd className="font-semibold text-[#0B1220]">{stats.total_organizations}</dd>
            </div>
            <div className="flex justify-between border-b border-[#E4E9F2] pb-2">
              <dt className="text-slate-500">Em trial</dt>
              <dd className="font-semibold text-[#0B1220]">{stats.trialing_organizations}</dd>
            </div>
            <div className="flex justify-between border-b border-[#E4E9F2] pb-2">
              <dt className="text-slate-500">Assinaturas canceladas</dt>
              <dd className="font-semibold text-red-600">{stats.canceled_subscriptions}</dd>
            </div>
            <div className="flex justify-between pt-1">
              <dt className="text-slate-500">Taxa de conversão (trial→ativa)</dt>
              <dd className="font-semibold text-[#0B1220]">
                {stats.trialing_organizations > 0
                  ? `${Math.round(
                      ((stats.active_subscriptions - stats.trialing_organizations) /
                        (stats.active_subscriptions + stats.trialing_organizations)) *
                        100,
                    )}%`
                  : "—"}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Organizações", href: "/admin/organizacoes", icon: Users, desc: "Gerenciar empresas" },
          { label: "Planos", href: "/admin/planos", icon: CreditCard, desc: "Catálogo e versões" },
          { label: "Suporte", href: "/admin/suporte", icon: MessageSquare, desc: "Tickets e atendimento" },
          { label: "Audit Log", href: "/admin/audit", icon: ShieldCheck, desc: "Logs da plataforma" },
        ].map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="group rounded-xl border border-[#E4E9F2] bg-white p-5 shadow-sm transition hover:border-[#3563F5]/30 hover:shadow-md"
          >
            <item.icon className="h-6 w-6 text-[#3563F5] transition group-hover:scale-110" />
            <h4 className="mt-3 font-semibold text-[#0B1220]">{item.label}</h4>
            <p className="mt-1 text-xs text-slate-500">{item.desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
}