import { headers } from "next/headers";
import { DollarSign, TrendingUp, TrendingDown, Wallet, AlertTriangle, ArrowUpRight, ArrowDownRight } from "lucide-react";
import {
  getFinancialKPIs,
  getCashflowMonthly,
  getReceivablesAging,
  getPayablesAging,
  getExpensesByCategory,
  getAccountBalances,
} from "../actions";
import { KPICard } from "../_components/kpi-card";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function RelatoriosFinanceiroPage() {
  await headers();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const dateRange = {
    from: thirtyDaysAgo.toISOString().split("T")[0],
    to: now.toISOString().split("T")[0],
    preset: "last_30_days" as const,
  };

  const [kpis, cashflow, receivablesAging, payablesAging, expensesByCat, accounts] = await Promise.all([
    getFinancialKPIs(dateRange),
    getCashflowMonthly(6),
    getReceivablesAging(),
    getPayablesAging(),
    getExpensesByCategory(dateRange),
    getAccountBalances(),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-nexora-dark">Relatórios Financeiros</h1>
        <p className="mt-1 text-sm text-nexora-text-secondary">
          Fluxo de caixa, contas a receber/pagar e inadimplência · Últimos 30 dias
        </p>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Total recebido"
          value={brl.format(kpis.totalReceived)}
          change={kpis.receivedChange}
          changeLabel="período anterior"
          icon={<ArrowUpRight className="h-5 w-5" />}
          accentColor="bg-green-50 text-green-600"
        />
        <KPICard
          label="Total pago"
          value={brl.format(kpis.totalPaid)}
          change={kpis.paidChange}
          changeLabel="período anterior"
          icon={<ArrowDownRight className="h-5 w-5" />}
          accentColor="bg-red-50 text-red-600"
        />
        <KPICard
          label="Saldo em contas"
          value={brl.format(kpis.accountBalance)}
          icon={<Wallet className="h-5 w-5" />}
          accentColor="bg-nexora-blue/10 text-nexora-blue"
        />
        <KPICard
          label="Fluxo líquido"
          value={brl.format(kpis.netCashflow)}
          icon={kpis.netCashflow >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
          accentColor={kpis.netCashflow >= 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}
        />
      </div>

      {/* Secondary KPIs Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-nexora-border bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-green-600">{brl.format(kpis.openReceivables)}</p>
          <p className="text-xs text-nexora-text-secondary">A receber pendente</p>
        </div>
        <div className="rounded-xl border border-nexora-border bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-red-600">{brl.format(kpis.overdueReceivables)}</p>
          <p className="text-xs text-nexora-text-secondary">Recebíveis vencidos</p>
        </div>
        <div className="rounded-xl border border-nexora-border bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-amber-600">{brl.format(kpis.openPayables)}</p>
          <p className="text-xs text-nexora-text-secondary">A pagar pendente</p>
        </div>
        <div className="rounded-xl border border-nexora-border bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-red-600">{brl.format(kpis.overduePayables)}</p>
          <p className="text-xs text-nexora-text-secondary">Pagáveis vencidos</p>
        </div>
      </div>

      {/* Cashflow Monthly Table */}
      <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-nexora-dark">Fluxo de caixa mensal</h2>
        {cashflow.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center text-center">
            <DollarSign className="mb-3 h-10 w-10 text-nexora-text-secondary/40" />
            <p className="text-sm text-nexora-text-secondary">Sem transações financeiras registradas</p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-nexora-border text-xs uppercase tracking-wide text-nexora-text-secondary">
                  <th className="pb-3 pr-4 font-medium">Mês</th>
                  <th className="pb-3 pr-4 text-right font-medium">Entradas</th>
                  <th className="pb-3 pr-4 text-right font-medium">Saídas</th>
                  <th className="pb-3 text-right font-medium">Líquido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexora-border/50">
                {cashflow.map((row) => {
                  const monthDate = new Date(row.month_start + "T00:00:00");
                  const label = monthDate.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
                  return (
                    <tr key={row.month_start}>
                      <td className="py-3 pr-4 font-medium capitalize text-nexora-dark">{label}</td>
                      <td className="py-3 pr-4 text-right text-green-600">{brl.format(row.total_income)}</td>
                      <td className="py-3 pr-4 text-right text-red-600">{brl.format(row.total_expense)}</td>
                      <td className={`py-3 text-right font-semibold ${row.net_flow >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {brl.format(row.net_flow)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Aging Analysis Side by Side */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Receivables Aging */}
        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h2 className="font-display text-lg font-semibold text-nexora-dark">Inadimplência — A receber</h2>
          </div>
          {receivablesAging.length === 0 ? (
            <div className="mt-6 flex flex-col items-center justify-center text-center">
              <p className="text-sm text-nexora-text-secondary">Sem recebíveis pendentes</p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {receivablesAging.map((bucket) => (
                <div key={bucket.bucket} className="flex items-center justify-between rounded-lg border border-nexora-border/50 p-3">
                  <div>
                    <p className="text-sm font-medium text-nexora-dark">{bucket.label}</p>
                    <p className="text-xs text-nexora-text-secondary">{bucket.count} títulos</p>
                  </div>
                  <p className={`text-sm font-semibold ${bucket.bucket === "current" ? "text-green-600" : "text-red-600"}`}>
                    {brl.format(bucket.totalAmount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payables Aging */}
        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h2 className="font-display text-lg font-semibold text-nexora-dark">Obrigações — A pagar</h2>
          </div>
          {payablesAging.length === 0 ? (
            <div className="mt-6 flex flex-col items-center justify-center text-center">
              <p className="text-sm text-nexora-text-secondary">Sem obrigações pendentes</p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {payablesAging.map((bucket) => (
                <div key={bucket.bucket} className="flex items-center justify-between rounded-lg border border-nexora-border/50 p-3">
                  <div>
                    <p className="text-sm font-medium text-nexora-dark">{bucket.label}</p>
                    <p className="text-xs text-nexora-text-secondary">{bucket.count} títulos</p>
                  </div>
                  <p className={`text-sm font-semibold ${bucket.bucket === "current" ? "text-green-600" : "text-red-600"}`}>
                    {brl.format(bucket.totalAmount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Expenses by Category + Account Balances */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Expenses by Category */}
        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-nexora-dark">Despesas por categoria</h2>
          {expensesByCat.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center text-center">
              <DollarSign className="mb-3 h-8 w-8 text-nexora-text-secondary/40" />
              <p className="text-sm text-nexora-text-secondary">Sem despesas no período</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {expensesByCat.map((cat) => (
                <div key={cat.categoryName}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-nexora-dark">{cat.categoryName}</span>
                    <span className="text-nexora-text-secondary">{brl.format(cat.totalAmount)} ({cat.percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-nexora-bg-secondary">
                    <div
                      className="h-full rounded-full bg-nexora-blue"
                      style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Account Balances */}
        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-nexora-dark">Saldos por conta</h2>
          {accounts.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center text-center">
              <Wallet className="mb-3 h-8 w-8 text-nexora-text-secondary/40" />
              <p className="text-sm text-nexora-text-secondary">Nenhuma conta financeira cadastrada</p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {accounts.map((acc) => (
                <div key={acc.accountId} className="flex items-center justify-between rounded-lg border border-nexora-border/50 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-nexora-dark">{acc.accountName}</p>
                    <p className="text-xs capitalize text-nexora-text-secondary">{acc.accountType}</p>
                  </div>
                  <p className={`text-sm font-semibold ${acc.balance >= 0 ? "text-nexora-dark" : "text-red-600"}`}>
                    {brl.format(acc.balance)}
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