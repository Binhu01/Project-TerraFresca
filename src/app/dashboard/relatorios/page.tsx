import { headers } from "next/headers";
import Link from "next/link";
import {
  BarChart3,
  Users,
  DollarSign,
  Package,
  UserCog,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  AlertTriangle,
  Clock,
  ArrowRight,
} from "lucide-react";
import { getExecutiveDashboard } from "./actions";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatChange(value: number | null): { text: string; color: string; Icon: typeof TrendingUp } | null {
  if (value === null) return null;
  const isPositive = value >= 0;
  return {
    text: `${isPositive ? "+" : ""}${value.toFixed(1)}%`,
    color: isPositive ? "text-green-600" : "text-red-600",
    Icon: isPositive ? TrendingUp : TrendingDown,
  };
}

export default async function RelatoriosPage() {
  await headers();

  // Default: last 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const dateRange = {
    from: thirtyDaysAgo.toISOString().split("T")[0],
    to: now.toISOString().split("T")[0],
    preset: "last_30_days" as const,
  };

  const data = await getExecutiveDashboard(dateRange);

  const reportLinks = [
    { label: "Relatórios comerciais", href: "/dashboard/relatorios/vendas", icon: BarChart3, description: "Pedidos, receita, canais e produtos" },
    { label: "Relatórios de CRM", href: "/dashboard/relatorios/crm", icon: Users, description: "Pipeline, leads, conversões e clientes" },
    { label: "Relatórios financeiros", href: "/dashboard/relatorios/financeiro", icon: DollarSign, description: "Fluxo de caixa, contas e inadimplência" },
    { label: "Relatórios de estoque", href: "/dashboard/relatorios/estoque", icon: Package, description: "Posição, movimentações e valuation" },
    { label: "Relatórios de equipe", href: "/dashboard/relatorios/equipe", icon: UserCog, description: "Desempenho, departamentos e atividades" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-nexora-dark">Relatórios e Inteligência</h1>
        <p className="mt-1 text-sm text-nexora-text-secondary">
          Visão executiva dos últimos 30 dias · Última atualização: {now.toLocaleString("pt-BR")}
        </p>
      </div>

      {/* Executive KPIs Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Sales */}
        <div className="rounded-xl border border-nexora-border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-nexora-blue/10">
              <ShoppingCart className="h-5 w-5 text-nexora-blue" />
            </div>
            <div>
              <p className="text-xs font-medium text-nexora-text-secondary">Receita (pedidos)</p>
              <p className="text-xl font-bold text-nexora-dark">{brl.format(data.sales.totalRevenue)}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs">
            <span className="text-nexora-text-secondary">{data.sales.totalOrders} pedidos</span>
            {formatChange(data.sales.revenueChange) && (
              <span className={`flex items-center gap-0.5 ${formatChange(data.sales.revenueChange)!.color}`}>
                {formatChange(data.sales.revenueChange)!.Icon({ className: "h-3 w-3" })}
                {formatChange(data.sales.revenueChange)!.text}
              </span>
            )}
          </div>
        </div>

        {/* CRM */}
        <div className="rounded-xl border border-nexora-border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-nexora-cyan/10">
              <Users className="h-5 w-5 text-nexora-cyan" />
            </div>
            <div>
              <p className="text-xs font-medium text-nexora-text-secondary">Novos clientes</p>
              <p className="text-xl font-bold text-nexora-dark">{data.crm.newCustomersInPeriod}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs">
            <span className="text-nexora-text-secondary">{data.crm.totalLeads} leads · {data.crm.conversionRate.toFixed(1)}% conv.</span>
            {formatChange(data.crm.customersChange) && (
              <span className={`flex items-center gap-0.5 ${formatChange(data.crm.customersChange)!.color}`}>
                {formatChange(data.crm.customersChange)!.Icon({ className: "h-3 w-3" })}
                {formatChange(data.crm.customersChange)!.text}
              </span>
            )}
          </div>
        </div>

        {/* Financial */}
        <div className="rounded-xl border border-nexora-border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-nexora-text-secondary">Recebido no período</p>
              <p className="text-xl font-bold text-nexora-dark">{brl.format(data.financial.totalReceived)}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs">
            <span className="text-nexora-text-secondary">Saldo: {brl.format(data.financial.accountBalance)}</span>
            {formatChange(data.financial.receivedChange) && (
              <span className={`flex items-center gap-0.5 ${formatChange(data.financial.receivedChange)!.color}`}>
                {formatChange(data.financial.receivedChange)!.Icon({ className: "h-3 w-3" })}
                {formatChange(data.financial.receivedChange)!.text}
              </span>
            )}
          </div>
        </div>

        {/* Inventory */}
        <div className="rounded-xl border border-nexora-border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Package className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-nexora-text-secondary">Produtos ativos</p>
              <p className="text-xl font-bold text-nexora-dark">{data.inventory.totalProducts}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs">
            <span className="text-nexora-text-secondary">
              {data.inventory.lowStockProducts} estoque baixo · {data.inventory.outOfStockProducts} sem estoque
            </span>
          </div>
        </div>
      </div>

      {/* Secondary KPIs Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-nexora-border bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-nexora-dark">{data.sales.completedOrders}</p>
          <p className="text-xs text-nexora-text-secondary">Pedidos concluídos</p>
        </div>
        <div className="rounded-xl border border-nexora-border bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-nexora-dark">{brl.format(data.sales.avgTicket)}</p>
          <p className="text-xs text-nexora-text-secondary">Ticket médio</p>
        </div>
        <div className="rounded-xl border border-nexora-border bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-nexora-dark">{brl.format(data.financial.openReceivables)}</p>
          <p className="text-xs text-nexora-text-secondary">A receber pendente</p>
        </div>
        <div className="rounded-xl border border-nexora-border bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-red-600">{brl.format(data.financial.overdueReceivables)}</p>
          <p className="text-xs text-nexora-text-secondary">Recebíveis vencidos</p>
        </div>
      </div>

      {/* Recent Orders + Upcoming Due */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-nexora-dark">Pedidos recentes</h2>
            <Link href="/dashboard/vendas/pedidos" className="text-sm font-medium text-nexora-blue hover:underline">
              Ver todos
            </Link>
          </div>
          {data.recentOrders.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center text-center">
              <ShoppingCart className="mb-3 h-10 w-10 text-nexora-text-secondary/40" />
              <p className="text-sm text-nexora-text-secondary">Nenhum pedido registrado</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {data.recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/dashboard/vendas/pedidos/${order.id}`}
                  className="flex items-center justify-between rounded-lg border border-nexora-border/50 p-3 transition-colors hover:bg-nexora-bg-secondary"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-nexora-dark">{order.documentNumber}</p>
                    <p className="truncate text-xs text-nexora-text-secondary">
                      {order.customerName ?? "Sem cliente"} · {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-nexora-dark">{brl.format(order.total)}</p>
                    <p className="text-xs text-nexora-text-secondary">{order.status}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Due + Stock Alerts */}
        <div className="space-y-6">
          {/* Upcoming Due */}
          <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-nexora-dark">Próximos vencimentos</h2>
              <Link href="/dashboard/financeiro/receber" className="text-sm font-medium text-nexora-blue hover:underline">
                Ver contas
              </Link>
            </div>
            {data.upcomingDue.length === 0 ? (
              <div className="mt-6 flex flex-col items-center justify-center text-center">
                <Clock className="mb-3 h-8 w-8 text-nexora-text-secondary/40" />
                <p className="text-sm text-nexora-text-secondary">Sem vencimentos nos próximos 7 dias</p>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {data.upcomingDue.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-nexora-border/50 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-nexora-dark">{item.description}</p>
                      <p className="text-xs text-nexora-text-secondary">
                        {item.type === "receivable" ? "A receber" : "A pagar"} · {new Date(item.dueDate).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <p className={`text-sm font-semibold ${item.type === "receivable" ? "text-green-600" : "text-red-600"}`}>
                      {brl.format(item.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stock Alerts */}
          {data.stockAlerts.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <h2 className="font-display text-lg font-semibold text-nexora-dark">Alertas de estoque</h2>
              </div>
              <div className="mt-3 space-y-2">
                {data.stockAlerts.map((alert) => (
                  <div key={alert.productId} className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50/50 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-nexora-dark">{alert.productName}</p>
                      <p className="text-xs text-nexora-text-secondary">Mínimo: {alert.minimumStock}</p>
                    </div>
                    <span className="text-sm font-bold text-amber-700">{alert.quantityAvailable} un.</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Report Navigation Cards */}
      <div>
        <h2 className="font-display text-lg font-semibold text-nexora-dark">Relatórios detalhados</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reportLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-start gap-4 rounded-xl border border-nexora-border bg-white p-5 shadow-sm transition-all hover:border-nexora-blue/30 hover:shadow-md"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-nexora-blue/10 transition-colors group-hover:bg-nexora-blue group-hover:text-white">
                <link.icon className="h-5 w-5 text-nexora-blue transition-colors group-hover:text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-base font-semibold text-nexora-dark">{link.label}</h3>
                <p className="mt-1 text-sm text-nexora-text-secondary">{link.description}</p>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-nexora-text-secondary/40 transition-transform group-hover:translate-x-1 group-hover:text-nexora-blue" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}