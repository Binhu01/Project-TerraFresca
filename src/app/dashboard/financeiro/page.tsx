import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowLeftRight,
  Wallet,
  Landmark,
} from "lucide-react";
import Link from "next/link";
import { getFinancialDashboard } from "./actions";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function FinanceiroPage() {
  const stats = await getFinancialDashboard();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-nexora-dark">
          Visão Geral Financeira
        </h1>
        <Link
          href="/dashboard/financeiro/fluxo"
          className="inline-flex items-center gap-2 rounded-lg border border-nexora-border px-4 py-2 text-sm font-medium text-nexora-text transition-colors hover:bg-nexora-bg-secondary"
        >
          <ArrowLeftRight className="h-4 w-4" />
          Fluxo de Caixa
        </Link>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-nexora-border bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-nexora-blue/10">
              <Wallet className="h-5 w-5 text-nexora-blue" />
            </div>
            <div>
              <p className="text-2xl font-bold text-nexora-dark">
                {brl.format(stats.total_balance)}
              </p>
              <p className="text-sm text-nexora-text-secondary">Saldo Total</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-nexora-border bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-nexora-dark">
                {brl.format(stats.income_this_month)}
              </p>
              <p className="text-sm text-nexora-text-secondary">Receitas (mês)</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-nexora-border bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
              <TrendingDown className="h-5 w-5 text-nexora-error" />
            </div>
            <div>
              <p className="text-2xl font-bold text-nexora-dark">
                {brl.format(stats.expense_this_month)}
              </p>
              <p className="text-sm text-nexora-text-secondary">Despesas (mês)</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-nexora-border bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-nexora-cyan/10">
              <DollarSign className="h-5 w-5 text-nexora-cyan" />
            </div>
            <div>
              <p className="text-2xl font-bold text-nexora-dark">
                {brl.format(stats.projected_balance)}
              </p>
              <p className="text-sm text-nexora-text-secondary">Saldo Projetado</p>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-nexora-border bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-nexora-text-secondary">A Receber (aberto)</p>
              <p className="text-xl font-bold text-nexora-dark">
                {brl.format(stats.receivables_amount_open)}
              </p>
              <p className="text-xs text-nexora-text-secondary mt-1">
                {stats.receivables_open} título{stats.receivables_open !== 1 ? "s" : ""}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-200" />
          </div>
        </div>

        <div className="rounded-xl border border-nexora-border bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-nexora-text-secondary">A Pagar (aberto)</p>
              <p className="text-xl font-bold text-nexora-dark">
                {brl.format(stats.payables_amount_open)}
              </p>
              <p className="text-xs text-nexora-text-secondary mt-1">
                {stats.payables_open} título{stats.payables_open !== 1 ? "s" : ""}
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-200" />
          </div>
        </div>

        <div className="rounded-xl border border-nexora-border bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-nexora-text-secondary">Recebíveis Vencidos</p>
              <p className="text-xl font-bold text-nexora-error">
                {stats.receivables_overdue}
              </p>
              <p className="text-xs text-nexora-text-secondary mt-1">Atenção necessária</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-200" />
          </div>
        </div>

        <div className="rounded-xl border border-nexora-border bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-nexora-text-secondary">Pagáveis Vencidos</p>
              <p className="text-xl font-bold text-nexora-error">
                {stats.payables_overdue}
              </p>
              <p className="text-xs text-nexora-text-secondary mt-1">Atenção necessária</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-200" />
          </div>
        </div>
      </div>

      {/* Net Flow Card */}
      <div className="rounded-xl border border-nexora-border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-nexora-dark">Fluxo Líquido do Mês</h2>
        <div className="flex items-end gap-4">
          <p
            className={`text-3xl font-bold ${
              stats.net_flow_this_month >= 0 ? "text-green-600" : "text-nexora-error"
            }`}
          >
            {brl.format(stats.net_flow_this_month)}
          </p>
          <p className="mb-1 text-sm text-nexora-text-secondary">
            {stats.net_flow_this_month >= 0 ? "Positivo" : "Negativo"} — receitas menos despesas realizadas
          </p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/dashboard/financeiro/receber"
          className="group flex items-center gap-4 rounded-xl border border-nexora-border bg-white p-4 transition-all hover:border-nexora-blue/30 hover:shadow-sm"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50 transition-colors group-hover:bg-green-100">
            <TrendingUp className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-nexora-dark">Contas a Receber</p>
            <p className="text-sm text-nexora-text-secondary">Gerenciar recebíveis</p>
          </div>
        </Link>

        <Link
          href="/dashboard/financeiro/pagar"
          className="group flex items-center gap-4 rounded-xl border border-nexora-border bg-white p-4 transition-all hover:border-nexora-blue/30 hover:shadow-sm"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 transition-colors group-hover:bg-red-100">
            <TrendingDown className="h-6 w-6 text-nexora-error" />
          </div>
          <div>
            <p className="font-semibold text-nexora-dark">Contas a Pagar</p>
            <p className="text-sm text-nexora-text-secondary">Gerenciar despesas</p>
          </div>
        </Link>

        <Link
          href="/dashboard/financeiro/contas"
          className="group flex items-center gap-4 rounded-xl border border-nexora-border bg-white p-4 transition-all hover:border-nexora-blue/30 hover:shadow-sm"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-nexora-blue/10 transition-colors group-hover:bg-nexora-blue/20">
            <Landmark className="h-6 w-6 text-nexora-blue" />
          </div>
          <div>
            <p className="font-semibold text-nexora-dark">Contas Financeiras</p>
            <p className="text-sm text-nexora-text-secondary">Bancos, caixa, carteiras</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

