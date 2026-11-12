import { headers } from "next/headers";
import { Users, TrendingUp, Target, ArrowRightLeft } from "lucide-react";
import { getCRMKPIs, getPipelineFunnel, getLeadsBySource } from "../actions";
import { KPICard } from "../_components/kpi-card";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function RelatoriosCRMPage() {
  await headers();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const dateRange = {
    from: thirtyDaysAgo.toISOString().split("T")[0],
    to: now.toISOString().split("T")[0],
    preset: "last_30_days" as const,
  };

  const [kpis, funnel, bySource] = await Promise.all([
    getCRMKPIs(dateRange),
    getPipelineFunnel(),
    getLeadsBySource(dateRange),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-nexora-dark">Relatórios de CRM</h1>
        <p className="mt-1 text-sm text-nexora-text-secondary">
          Pipeline, leads, conversões e clientes · Últimos 30 dias
        </p>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Clientes ativos"
          value={kpis.totalActiveCustomers}
          icon={<Users className="h-5 w-5" />}
          accentColor="bg-nexora-blue/10 text-nexora-blue"
        />
        <KPICard
          label="Novos clientes"
          value={kpis.newCustomersInPeriod}
          change={kpis.customersChange}
          changeLabel="período anterior"
          icon={<TrendingUp className="h-5 w-5" />}
          accentColor="bg-green-50 text-green-600"
        />
        <KPICard
          label="Taxa de conversão"
          value={`${kpis.conversionRate.toFixed(1)}%`}
          icon={<Target className="h-5 w-5" />}
          accentColor="bg-nexora-cyan/10 text-nexora-cyan"
          subtitle={`${kpis.wonLeads} ganhos de ${kpis.totalLeads} leads`}
        />
        <KPICard
          label="Valor do pipeline"
          value={brl.format(kpis.pipelineValue)}
          icon={<ArrowRightLeft className="h-5 w-5" />}
          accentColor="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Secondary KPIs Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-nexora-border bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-nexora-dark">{kpis.totalLeads}</p>
          <p className="text-xs text-nexora-text-secondary">Total de leads</p>
        </div>
        <div className="rounded-xl border border-nexora-border bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-green-600">{kpis.wonLeads}</p>
          <p className="text-xs text-nexora-text-secondary">Leads ganhos</p>
        </div>
        <div className="rounded-xl border border-nexora-border bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-red-600">{kpis.lostLeads}</p>
          <p className="text-xs text-nexora-text-secondary">Leads perdidos</p>
        </div>
        <div className="rounded-xl border border-nexora-border bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-nexora-dark">
            {kpis.previousLeads !== null ? `${((kpis.leadsChange ?? 0) >= 0 ? "+" : "")}${(kpis.leadsChange ?? 0).toFixed(1)}%` : "—"}
          </p>
          <p className="text-xs text-nexora-text-secondary">Variação de leads</p>
        </div>
      </div>

      {/* Pipeline Funnel */}
      <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-nexora-dark">Funil de pipeline</h2>
        {funnel.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center text-center">
            <ArrowRightLeft className="mb-3 h-10 w-10 text-nexora-text-secondary/40" />
            <p className="text-sm text-nexora-text-secondary">Nenhum lead no pipeline</p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-nexora-border text-xs uppercase tracking-wide text-nexora-text-secondary">
                  <th className="pb-3 pr-4 font-medium">Estágio</th>
                  <th className="pb-3 pr-4 text-right font-medium">Leads</th>
                  <th className="pb-3 pr-4 text-right font-medium">Valor estimado</th>
                  <th className="pb-3 text-right font-medium">Convertidos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexora-border/50">
                {funnel.map((stage) => (
                  <tr key={stage.stageId} className={stage.isWon ? "bg-green-50/30" : stage.isLost ? "bg-red-50/30" : ""}>
                    <td className="py-3 pr-4 font-medium text-nexora-dark">
                      {stage.stageName}
                      {stage.isWon && <span className="ml-2 inline-block rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">GANHO</span>}
                      {stage.isLost && <span className="ml-2 inline-block rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">PERDIDO</span>}
                    </td>
                    <td className="py-3 pr-4 text-right text-nexora-text-secondary">{stage.leadCount}</td>
                    <td className="py-3 pr-4 text-right font-semibold text-nexora-dark">{brl.format(stage.totalValue)}</td>
                    <td className="py-3 text-right text-nexora-text-secondary">{stage.convertedCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Leads by Source */}
      <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-nexora-dark">Leads por origem</h2>
        {bySource.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center text-center">
            <Users className="mb-3 h-8 w-8 text-nexora-text-secondary/40" />
            <p className="text-sm text-nexora-text-secondary">Sem leads cadastrados no período</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {bySource.map((src) => (
              <div key={src.source}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-nexora-dark">{src.source || "Sem origem"}</span>
                  <span className="text-nexora-text-secondary">
                    {src.count} leads · {brl.format(src.estimatedValue)}
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-nexora-bg-secondary">
                  <div
                    className="h-full rounded-full bg-nexora-cyan"
                    style={{
                      width: `${Math.min((src.count / Math.max(...bySource.map((s) => s.count), 1)) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}