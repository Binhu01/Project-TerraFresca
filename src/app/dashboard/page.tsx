import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization, getOrganizationMemberCount } from "@/lib/organizations";
import { redirect } from "next/navigation";
import {
  Building2,
  Users,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Target,
  Trophy,
  AlertTriangle,
  ShoppingCart,
  Percent,
  Package,
  Warehouse,
  ArrowLeftRight,
} from "lucide-react";
import { getCustomerStats } from "./clientes/actions";
import { getLeadStats, getLeadsByStage, getPipelineAndStages } from "./leads/actions";
import { getSalesStats, getQuoteStats } from "./vendas/actions";
import { getProductStats } from "./produtos/actions";
import { getInventoryStats } from "./estoque/actions";
import { getFinancialDashboard } from "./financeiro/actions";

export default async function DashboardPage() {
  // Force dynamic rendering — reads request headers to opt out of static caching
  await headers();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const activeData = await getActiveOrganization();

  if (!activeData) redirect("/dashboard/onboarding");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const memberCount = await getOrganizationMemberCount(activeData.org.id);

  // CRM metrics
  const customerStats = await getCustomerStats(activeData.org.id);
  const leadStats = await getLeadStats(activeData.org.id);

  // Sales metrics
  let salesStats: Awaited<ReturnType<typeof getSalesStats>> | null = null;
  let quoteStats: Awaited<ReturnType<typeof getQuoteStats>> | null = null;
  try {
    salesStats = await getSalesStats(activeData.org.id);
    quoteStats = await getQuoteStats(activeData.org.id);
  } catch {
    // Sales module may not have data yet
  }

  // Inventory & Product metrics
  let productStats: Awaited<ReturnType<typeof getProductStats>> | null = null;
  let inventoryStats: Awaited<ReturnType<typeof getInventoryStats>> | null = null;
  try {
    productStats = await getProductStats(activeData.org.id);
    inventoryStats = await getInventoryStats(activeData.org.id);
  } catch {
    // Inventory module may not have data yet
  }

  // Financial metrics
  let financialStats: Awaited<ReturnType<typeof getFinancialDashboard>> | null = null;
  try {
    financialStats = await getFinancialDashboard();
  } catch {
    // Financial module may not have data yet
  }

  let pipelineStages: { stage: { id: string; name: string }; leads: unknown[] }[] = [];
  try {
    const pipelineData = await getPipelineAndStages();
    if (pipelineData?.pipeline?.id) {
      pipelineStages = await getLeadsByStage(pipelineData.pipeline.id);
    }
  } catch {
    // Pipeline may not exist yet — show empty state gracefully
  }

  const roleName: Record<string, string> = {
    OWNER: "Proprietário",
    ADMIN: "Administrador",
    MANAGER: "Gestor",
    EMPLOYEE: "Colaborador",
  };

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  })();

  const displayName = profile?.full_name?.split(" ")[0] ?? "Usuário";

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="font-display text-2xl font-bold text-nexora-dark">
          {greeting}, {displayName}
        </h1>
        <p className="mt-1 text-nexora-text-secondary">
          Visão geral da sua organização{" "}
          <span className="font-medium text-nexora-text">
            {activeData.org.name}
          </span>
          .
        </p>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-nexora-blue/10 text-nexora-blue">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-nexora-text-secondary">
                Organização
              </p>
              <p className="truncate text-sm font-semibold text-nexora-dark">
                {activeData.org.name}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-nexora-cyan/10 text-nexora-cyan">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-nexora-text-secondary">
                Membros
              </p>
              <p className="text-sm font-semibold text-nexora-dark">
                {memberCount} {memberCount === 1 ? "membro" : "membros"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-nexora-success/10 text-nexora-success">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-nexora-text-secondary">
                Seu papel
              </p>
              <p className="text-sm font-semibold text-nexora-dark">
                {roleName[activeData.org.membership.role] ??
                  activeData.org.membership.role}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-nexora-blue/10 text-nexora-blue">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-nexora-text-secondary">
                Status
              </p>
              <p className="text-sm font-semibold text-nexora-success">
                Configurado
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Resumo Comercial */}
      <div>
        <h2 className="mb-4 font-display text-lg font-semibold text-nexora-dark">
          Resumo Comercial
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-nexora-blue/10 text-nexora-blue">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-nexora-text-secondary">
                  Clientes Ativos
                </p>
                <p className="text-sm font-semibold text-nexora-dark">
                  {customerStats.active}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-nexora-cyan/10 text-nexora-cyan">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-nexora-text-secondary">
                  Leads Abertos
                </p>
                <p className="text-sm font-semibold text-nexora-dark">
                  {leadStats.open}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-nexora-success/10 text-nexora-success">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-nexora-text-secondary">
                  Leads Ganhos
                </p>
                <p className="text-sm font-semibold text-nexora-dark">
                  {leadStats.won}
                </p>
              </div>
            </div>
          </div>

          <div className={`rounded-xl border bg-white p-6 shadow-sm ${leadStats.overdue > 0 ? "border-amber-300 ring-1 ring-amber-200" : "border-nexora-border"}`}>
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${leadStats.overdue > 0 ? "bg-amber-500/10 text-amber-600" : "bg-nexora-bg-secondary text-nexora-text-secondary"}`}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-nexora-text-secondary">
                  Retornos Atrasados
                </p>
                <p className={`text-sm font-semibold ${leadStats.overdue > 0 ? "text-amber-600" : "text-nexora-dark"}`}>
                  {leadStats.overdue}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Métricas de Vendas */}
      <div>
        <h2 className="mb-4 font-display text-lg font-semibold text-nexora-dark">
          Métricas de Vendas
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-nexora-success/10 text-nexora-success">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-nexora-text-secondary">
                  Receita Total
                </p>
                <p className="text-sm font-semibold text-nexora-dark">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(salesStats?.revenue_total ?? 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-nexora-blue/10 text-nexora-blue">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-nexora-text-secondary">
                  Receita este Mês
                </p>
                <p className="text-sm font-semibold text-nexora-dark">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(salesStats?.revenue_month ?? 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-nexora-cyan/10 text-nexora-cyan">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-nexora-text-secondary">
                  Pedidos Concluídos
                </p>
                <p className="text-sm font-semibold text-nexora-dark">
                  {salesStats?.completed_orders ?? 0}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
                <Percent className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-nexora-text-secondary">
                  Taxa de Conversão
                </p>
                <p className="text-sm font-semibold text-nexora-dark">
                  {quoteStats?.conversion_rate ?? 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Produtos e Estoque */}
      {(productStats || inventoryStats) && (
        <div>
          <h2 className="mb-4 font-display text-lg font-semibold text-nexora-dark">
            Produtos e Estoque
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-nexora-blue/10 text-nexora-blue">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-nexora-text-secondary">
                    Produtos Ativos
                  </p>
                  <p className="text-sm font-semibold text-nexora-dark">
                    {productStats?.active_products ?? 0}
                  </p>
                </div>
              </div>
            </div>

            <div className={`rounded-xl border bg-white p-6 shadow-sm ${(productStats?.low_stock_count ?? 0) > 0 ? "border-amber-300 ring-1 ring-amber-200" : "border-nexora-border"}`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${(productStats?.low_stock_count ?? 0) > 0 ? "bg-amber-500/10 text-amber-600" : "bg-nexora-bg-secondary text-nexora-text-secondary"}`}>
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-nexora-text-secondary">
                    Estoque Baixo
                  </p>
                  <p className={`text-sm font-semibold ${(productStats?.low_stock_count ?? 0) > 0 ? "text-amber-600" : "text-nexora-dark"}`}>
                    {productStats?.low_stock_count ?? 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-nexora-cyan/10 text-nexora-cyan">
                  <Warehouse className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-nexora-text-secondary">
                    Depósitos
                  </p>
                  <p className="text-sm font-semibold text-nexora-dark">
                    {inventoryStats?.total_warehouses ?? 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-nexora-success/10 text-nexora-success">
                  <ArrowLeftRight className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-nexora-text-secondary">
                    Movimentações (mês)
                  </p>
                  <p className="text-sm font-semibold text-nexora-dark">
                    {inventoryStats?.total_movements_month ?? 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline Comercial */}
      <div>
        <h2 className="mb-4 font-display text-lg font-semibold text-nexora-dark">
          Pipeline Comercial
        </h2>
        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
          {pipelineStages.length > 0 ? (
            <div className="space-y-3">
              {pipelineStages.map(({ stage, leads }) => {
                const total = pipelineStages.reduce((sum, s) => sum + s.leads.length, 0);
                const pct = total > 0 ? Math.round((leads.length / total) * 100) : 0;
                return (
                  <div key={stage.id} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 truncate text-sm font-medium text-nexora-dark">
                      {stage.name}
                    </span>
                    <div className="flex-1">
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-nexora-bg-secondary">
                        <div
                          className="h-full rounded-full bg-nexora-blue transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-8 shrink-0 text-right text-sm font-semibold text-nexora-dark">
                      {leads.length}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-nexora-text-secondary">
              Nenhum pipeline configurado ainda.
            </p>
          )}
        </div>
      </div>

      {/* Resumo Financeiro */}
      {financialStats && (
        <div>
          <h2 className="mb-4 font-display text-lg font-semibold text-nexora-dark">
            Resumo Financeiro
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-nexora-blue/10 text-nexora-blue">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-nexora-text-secondary">
                    Saldo Total
                  </p>
                  <p className="text-sm font-semibold text-nexora-dark">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(financialStats.total_balance)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-nexora-text-secondary">
                    A Receber (aberto)
                  </p>
                  <p className="text-sm font-semibold text-nexora-dark">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(financialStats.receivables_amount_open)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-nexora-error">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-nexora-text-secondary">
                    A Pagar (aberto)
                  </p>
                  <p className="text-sm font-semibold text-nexora-dark">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(financialStats.payables_amount_open)}
                  </p>
                </div>
              </div>
            </div>

            <div className={`rounded-xl border bg-white p-6 shadow-sm ${financialStats.net_flow_this_month >= 0 ? "border-nexora-border" : "border-amber-300 ring-1 ring-amber-200"}`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${financialStats.net_flow_this_month >= 0 ? "bg-nexora-success/10 text-nexora-success" : "bg-amber-500/10 text-amber-600"}`}>
                  <ArrowLeftRight className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-nexora-text-secondary">
                    Fluxo do Mês
                  </p>
                  <p className={`text-sm font-semibold ${financialStats.net_flow_this_month >= 0 ? "text-nexora-dark" : "text-amber-600"}`}>
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(financialStats.net_flow_this_month)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Section */}
      <div className="rounded-xl border border-nexora-border bg-white p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-nexora-blue/10 text-nexora-blue">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-nexora-dark">
              Ambiente pronto para uso
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-nexora-text-secondary">
              Sua organização <strong>{activeData.org.name}</strong> está
              configurada e operacional. Os módulos de Clientes, Leads, Vendas,
              Produtos, Estoque e Financeiro estão disponíveis. Equipe e
              Relatórios serão disponibilizados nas próximas atualizações.
            </p>
          </div>
        </div>
      </div>

      {/* Coming Soon Modules */}
      <div>
        <h2 className="mb-4 font-display text-lg font-semibold text-nexora-dark">
          Módulos em desenvolvimento
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            "Equipe",
            "Relatórios",
            "Configurações",
          ].map((module) => (
            <div
              key={module}
              className="flex items-center justify-between rounded-lg border border-dashed border-nexora-border bg-nexora-bg-secondary/50 px-4 py-3"
            >
              <span className="text-sm font-medium text-nexora-text-secondary">
                {module}
              </span>
              <span className="rounded bg-nexora-bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-nexora-text-secondary/70">
                Em breve
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}