import { headers } from "next/headers";
import { ShoppingCart, DollarSign, TrendingUp, Package, Users } from "lucide-react";
import {
  getSalesKPIs,
  getSalesByChannel,
  getTopCustomers,
  getTopProducts,
} from "../actions";
import { KPICard } from "../_components/kpi-card";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function RelatoriosVendasPage() {
  await headers();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const dateRange = {
    from: thirtyDaysAgo.toISOString().split("T")[0],
    to: now.toISOString().split("T")[0],
    preset: "last_30_days" as const,
  };

  const [kpis, byChannel, topCustomers, topProducts] = await Promise.all([
    getSalesKPIs(dateRange),
    getSalesByChannel(dateRange),
    getTopCustomers(dateRange),
    getTopProducts(dateRange),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-nexora-dark">
          Relatórios Comerciais
        </h1>
        <p className="mt-1 text-sm text-nexora-text-secondary">
          Análise de pedidos, receita, canais e produtos · Últimos 30 dias
        </p>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Receita total"
          value={brl.format(kpis.totalRevenue)}
          change={kpis.revenueChange}
          changeLabel="período anterior"
          icon={<DollarSign className="h-5 w-5" />}
          accentColor="bg-green-50 text-green-600"
          subtitle={`${kpis.totalOrders} pedidos`}
        />
        <KPICard
          label="Ticket médio"
          value={brl.format(kpis.avgTicket)}
          icon={<ShoppingCart className="h-5 w-5" />}
          accentColor="bg-nexora-blue/10 text-nexora-blue"
        />
        <KPICard
          label="Margem bruta"
          value={brl.format(kpis.grossMargin)}
          icon={<TrendingUp className="h-5 w-5" />}
          accentColor="bg-nexora-cyan/10 text-nexora-cyan"
          subtitle={`${kpis.marginRate.toFixed(1)}% da receita`}
        />
        <KPICard
          label="Pedidos concluídos"
          value={kpis.completedOrders}
          change={kpis.ordersChange}
          changeLabel="período anterior"
          icon={<Package className="h-5 w-5" />}
          accentColor="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Sales by Channel */}
      <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-nexora-dark">
          Receita por canal
        </h2>
        {byChannel.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center text-center">
            <ShoppingCart className="mb-3 h-10 w-10 text-nexora-text-secondary/40" />
            <p className="text-sm text-nexora-text-secondary">
              Sem dados de vendas no período
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-nexora-border text-xs uppercase tracking-wide text-nexora-text-secondary">
                  <th className="pb-3 pr-4 font-medium">Canal</th>
                  <th className="pb-3 pr-4 text-right font-medium">Pedidos</th>
                  <th className="pb-3 pr-4 text-right font-medium">Receita</th>
                  <th className="pb-3 pr-4 text-right font-medium">Ticket médio</th>
                  <th className="pb-3 text-right font-medium">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexora-border/50">
                {byChannel.map((ch) => (
                  <tr key={ch.channelName}>
                    <td className="py-3 pr-4 font-medium text-nexora-dark">
                      {ch.channelName}
                    </td>
                    <td className="py-3 pr-4 text-right text-nexora-text-secondary">
                      {ch.orderCount}
                    </td>
                    <td className="py-3 pr-4 text-right font-semibold text-nexora-dark">
                      {brl.format(ch.totalRevenue)}
                    </td>
                    <td className="py-3 pr-4 text-right text-nexora-text-secondary">
                      {brl.format(ch.avgTicket)}
                    </td>
                    <td className="py-3 text-right text-nexora-text-secondary">
                      {ch.percentage.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top Customers + Top Products side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Customers */}
        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-nexora-blue" />
            <h2 className="font-display text-lg font-semibold text-nexora-dark">
              Top clientes
            </h2>
          </div>
          {topCustomers.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center text-center">
              <Users className="mb-3 h-8 w-8 text-nexora-text-secondary/40" />
              <p className="text-sm text-nexora-text-secondary">
                Nenhum cliente com pedidos no período
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {topCustomers.map((c, i) => (
                <div
                  key={c.customerId}
                  className="flex items-center justify-between rounded-lg border border-nexora-border/50 p-3"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-nexora-blue/10 text-xs font-bold text-nexora-blue">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-nexora-dark">
                        {c.customerName}
                      </p>
                      <p className="text-xs text-nexora-text-secondary">
                        {c.orderCount} pedidos
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-nexora-dark">
                    {brl.format(c.totalRevenue)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-amber-600" />
            <h2 className="font-display text-lg font-semibold text-nexora-dark">
              Top produtos
            </h2>
          </div>
          {topProducts.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center text-center">
              <Package className="mb-3 h-8 w-8 text-nexora-text-secondary/40" />
              <p className="text-sm text-nexora-text-secondary">
                Nenhum produto vendido no período
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {topProducts.map((p, i) => (
                <div
                  key={p.productId}
                  className="flex items-center justify-between rounded-lg border border-nexora-border/50 p-3"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-50 text-xs font-bold text-amber-600">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-nexora-dark">
                        {p.productName}
                      </p>
                      <p className="text-xs text-nexora-text-secondary">
                        {p.quantitySold} un. vendidas
                        {p.sku && ` · ${p.sku}`}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-nexora-dark">
                    {brl.format(p.totalRevenue)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}