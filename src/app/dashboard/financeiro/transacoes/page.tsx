import { Receipt, Search, Filter } from "lucide-react";
import Link from "next/link";
import { getTransactions } from "../actions";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const typeLabels: Record<string, string> = {
 opening_balance: "Saldo inicial",
 income: "Receita",
 expense: "Despesa",
 transfer_in: "Transferência (entrada)",
 transfer_out: "Transferência (saída)",
 fee: "Taxa",
 reversal: "Estorno",
};

interface PageProps {
 searchParams: Promise<{
 account_id?: string;
 transaction_type?: string;
 date_from?: string;
 date_to?: string;
 page?: string;
 }>;
}

export default async function TransacoesPage({ searchParams }: PageProps) {
 const params = await searchParams;
 const accountId = params.account_id || "";
 const txType = params.transaction_type || "all";
 const dateFrom = params.date_from || "";
 const dateTo = params.date_to || "";
 const page = parseInt(params.page || "1", 10);

 const { transactions, total } = await getTransactions({
 account_id: accountId || undefined,
 transaction_type: txType !== "all" ? txType : undefined,
 date_from: dateFrom || undefined,
 date_to: dateTo || undefined,
 page,
 perPage: 50,
 });

 const totalPages = Math.max(1, Math.ceil(total / 50));

 return (
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <h1 className="font-display text-2xl font-bold text-nexora-dark">Transações</h1>
 <p className="text-sm text-nexora-text-secondary">Livro-caixa imutável</p>
 </div>

 {/* Filters */}
 <div className="rounded-xl border border-nexora-border bg-white p-4">
 <form className="flex flex-wrap items-end gap-3">
 <div className="min-w-[160px]">
 <label className="mb-1 block text-sm font-medium text-nexora-text">Tipo</label>
 <select
 name="transaction_type"
 defaultValue={txType}
 className="w-full rounded-lg border border-nexora-border bg-nexora-bg px-3 py-2 text-nexora-text focus:border-nexora-blue focus:outline-none focus:ring-2 focus:ring-nexora-blue/20"
 >
 <option value="all">Todos</option>
 <option value="income">Receita</option>
 <option value="expense">Despesa</option>
 <option value="transfer_in">Transferência (entrada)</option>
 <option value="transfer_out">Transferência (saída)</option>
 <option value="fee">Taxa</option>
 <option value="reversal">Estorno</option>
 <option value="opening_balance">Saldo inicial</option>
 </select>
 </div>
 <div className="min-w-[140px]">
 <label className="mb-1 block text-sm font-medium text-nexora-text">De</label>
 <input
 type="date"
 name="date_from"
 defaultValue={dateFrom}
 className="w-full rounded-lg border border-nexora-border bg-nexora-bg px-3 py-2 text-nexora-text focus:border-nexora-blue focus:outline-none focus:ring-2 focus:ring-nexora-blue/20"
 />
 </div>
 <div className="min-w-[140px]">
 <label className="mb-1 block text-sm font-medium text-nexora-text">Até</label>
 <input
 type="date"
 name="date_to"
 defaultValue={dateTo}
 className="w-full rounded-lg border border-nexora-border bg-nexora-bg px-3 py-2 text-nexora-text focus:border-nexora-blue focus:outline-none focus:ring-2 focus:ring-nexora-blue/20"
 />
 </div>
 <button
 type="submit"
 className="inline-flex items-center gap-2 rounded-lg bg-nexora-blue px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
 >
 <Filter className="h-4 w-4" />
 Filtrar
 </button>
 {(accountId || txType !== "all" || dateFrom || dateTo) && (
 <Link
 href="/dashboard/financeiro/transacoes"
 className="inline-flex items-center rounded-lg border border-nexora-border px-4 py-2 text-sm text-nexora-text transition-colors hover:bg-nexora-bg-secondary"
 >
 Limpar
 </Link>
 )}
 </form>
 </div>

 {/* Table */}
 <div className="overflow-hidden rounded-xl border border-nexora-border bg-white">
 {transactions.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-16">
 <Receipt className="mb-4 h-12 w-12 text-nexora-text-secondary/50" />
 <p className="text-lg font-medium text-nexora-dark">Nenhuma transação encontrada</p>
 <p className="text-sm text-nexora-text-secondary">
 As transações são registradas automaticamente ao criar pagamentos e transferências.
 </p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="border-b border-nexora-border bg-nexora-bg">
 <tr>
 <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">
 Data/Hora
 </th>
 <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">
 Tipo
 </th>
 <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">
 Conta
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
 </tr>
 </thead>
 <tbody className="divide-y divide-nexora-border">
 {transactions.map((t) => {
 const accountName =
 (t.account as { name: string } | null)?.name ?? "—";
 const categoryName =
 (t.category as { name: string } | null)?.name ?? "—";

 return (
 <tr key={t.id} className="transition-colors hover:bg-nexora-bg-secondary">
 <td className="whitespace-nowrap px-4 py-3 text-sm text-nexora-text">
 {new Date(t.occurred_at).toLocaleDateString("pt-BR")}{" "}
 <span className="text-nexora-text-secondary">
 {new Date(t.occurred_at).toLocaleTimeString("pt-BR", {
 hour: "2-digit",
 minute: "2-digit",
 })}
 </span>
 </td>
 <td className="px-4 py-3 text-sm text-nexora-text">
 {typeLabels[t.transaction_type] ?? t.transaction_type}
 </td>
 <td className="px-4 py-3 text-sm text-nexora-text">{accountName}</td>
 <td className="px-4 py-3 text-sm text-nexora-text">{categoryName}</td>
 <td className="max-w-[250px] truncate px-4 py-3 text-sm text-nexora-text">
 {t.description ?? "—"}
 </td>
 <td
 className={`px-4 py-3 text-right font-mono text-sm ${
 Number(t.amount) >= 0 ? "text-green-600" : "text-nexora-error"
 }`}
 >
 {Number(t.amount) >= 0 ? "+" : ""}
 {brl.format(Number(t.amount))}
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 )}
 </div>

 {/* Pagination */}
 {totalPages > 1 && (
 <div className="flex items-center justify-between">
 <p className="text-sm text-nexora-text-secondary">
 Página {page} de {totalPages} ({total} transações)
 </p>
 <div className="flex items-center gap-2">
 {page > 1 && (
 <Link
 href={`/dashboard/financeiro/transacoes?page=${page - 1}${txType !== "all" ? `&transaction_type=${txType}` : ""}${dateFrom ? `&date_from=${dateFrom}` : ""}${dateTo ? `&date_to=${dateTo}` : ""}`}
 className="rounded-lg border border-nexora-border px-4 py-2 text-sm text-nexora-text transition-colors hover:bg-nexora-bg-secondary"
 >
 Anterior
 </Link>
 )}
 {page < totalPages && (
 <Link
 href={`/dashboard/financeiro/transacoes?page=${page + 1}${txType !== "all" ? `&transaction_type=${txType}` : ""}${dateFrom ? `&date_from=${dateFrom}` : ""}${dateTo ? `&date_to=${dateTo}` : ""}`}
 className="rounded-lg border border-nexora-border px-4 py-2 text-sm text-nexora-text transition-colors hover:bg-nexora-bg-secondary"
 >
 Próxima
 </Link>
 )}
 </div>
 </div>
 )}
 </div>
 );
}