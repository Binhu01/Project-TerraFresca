import { headers } from "next/headers";
import { ArrowLeftRight, TrendingUp, TrendingDown } from "lucide-react";
import { getCashFlow } from "../actions";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function FluxoPage() {
  await headers();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const cashFlow = await getCashFlow({
    date_from: monthStart,
    date_to: monthEnd,
    mode: "projected",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-nexora-dark">Fluxo de Caixa</h1>
        <p className="text-sm text-nexora-text-secondary">
          {now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-nexora-border bg-white p-4">
          <p className="text-sm text-nexora-text-secondary">Saldo Inicial</p>
          <p className="text-xl font-bold text-nexora-dark">
            {brl.format(cashFlow.opening_balance)}
          </p>
        </div>
        <div className="rounded-xl border border-nexora-border bg-white p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <p className="text-sm text-nexora-text-secondary">Entradas</p>
          </div>
          <p className="text-xl font-bold text-green-600">
            {brl.format(cashFlow.total_income)}
          </p>
        </div>
        <div className="rounded-xl border border-nexora-border bg-white p-4">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-nexora-error" />
            <p className="text-sm text-nexora-text-secondary">Saídas</p>
          </div>
          <p className="text-xl font-bold text-nexora-error">
            {brl.format(cashFlow.total_expense)}
          </p>
        </div>
        <div className="rounded-xl border border-nexora-border bg-white p-4">
          <p className="text-sm text-nexora-text-secondary">Saldo Final</p>
          <p className={`text-xl font-bold ${cashFlow.closing_balance >= 0 ? "text-nexora-dark" : "text-nexora-error"}`}>
            {brl.format(cashFlow.closing_balance)}
          </p>
        </div>
      </div>

      {/* Projected Info */}
      {(cashFlow.projected_receivables > 0 || cashFlow.projected_payables > 0) && (
        <div className="rounded-xl border border-nexora-cyan/20 bg-nexora-cyan/5 p-4">
          <h3 className="mb-2 text-sm font-semibold text-nexora-dark">Projeção para o período</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-nexora-text-secondary">A receber previsto</p>
              <p className="font-mono text-sm font-medium text-green-600">
                +{brl.format(cashFlow.projected_receivables)}
              </p>
            </div>
            <div>
              <p className="text-xs text-nexora-text-secondary">A pagar previsto</p>
              <p className="font-mono text-sm font-medium text-nexora-error">
                -{brl.format(cashFlow.projected_payables)}
              </p>
            </div>
            <div>
              <p className="text-xs text-nexora-text-secondary">Saldo projetado</p>
              <p className={`font-mono text-sm font-bold ${cashFlow.projected_balance >= 0 ? "text-nexora-dark" : "text-nexora-error"}`}>
                {brl.format(cashFlow.projected_balance)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="overflow-hidden rounded-xl border border-nexora-border bg-white">
        <div className="border-b border-nexora-border px-5 py-4">
          <h2 className="text-lg font-semibold text-nexora-dark">Movimentações do Período</h2>
        </div>
        {cashFlow.entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <ArrowLeftRight className="mb-4 h-12 w-12 text-nexora-text-secondary/50" />
            <p className="text-lg font-medium text-nexora-dark">Nenhuma movimentação no período</p>
            <p className="text-sm text-nexora-text-secondary">
              Registre pagamentos ou transferências para ver o fluxo de caixa.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-nexora-border bg-nexora-bg">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">
                    Data
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">
                    Categoria
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">
                    Descrição
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">
                    Valor
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">
                    Saldo
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexora-border">
                {cashFlow.entries.map((entry, idx) => {
                  const typeLabels: Record<string, string> = {
                    opening_balance: "Saldo inicial",
                    income: "Receita",
                    expense: "Despesa",
                    transfer_in: "Transferência (entrada)",
                    transfer_out: "Transferência (saída)",
                    fee: "Taxa",
                    reversal: "Estorno",
                  };

                  return (
                    <tr key={idx} className="transition-colors hover:bg-nexora-bg-secondary">
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-nexora-text">
                        {new Date(entry.date).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-sm text-nexora-text">
                        {typeLabels[entry.type] ?? entry.type}
                      </td>
                      <td className="px-4 py-3 text-sm text-nexora-text">
                        {entry.category_name ?? "—"}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-sm text-nexora-text">
                        {entry.description ?? "—"}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono text-sm ${entry.amount >= 0 ? "text-green-600" : "text-nexora-error"}`}>
                        {entry.amount >= 0 ? "+" : ""}{brl.format(entry.amount)}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono text-sm ${entry.running_balance >= 0 ? "text-nexora-dark" : "text-nexora-error"}`}>
                        {brl.format(entry.running_balance)}
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