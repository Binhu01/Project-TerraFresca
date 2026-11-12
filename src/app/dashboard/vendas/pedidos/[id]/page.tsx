import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Printer, DollarSign } from "lucide-react";
import { getOrderById, getOrderStatusHistory } from "../../actions";
import type { OrderWithDetails, OrderStatusHistoryEntry, OrderStatus } from "@/types/sales";
import { StatusChangeForm } from "./_components/status-change-form";
import { StatusTimeline } from "./_components/status-timeline";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/organizations";

// --- Formatters ---

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

function formatDate(iso: string): string {
  try {
    return dateFormatter.format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string): string {
  try {
    return dateTimeFormatter.format(new Date(iso));
  } catch {
    return iso;
  }
}

// --- Status Badge ---

const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-gray-100 text-gray-700" },
  confirmed: { label: "Confirmado", className: "bg-blue-50 text-blue-700" },
  preparing: { label: "Em preparo", className: "bg-amber-50 text-amber-700" },
  completed: { label: "Concluído", className: "bg-green-50 text-green-700" },
  cancelled: { label: "Cancelado", className: "bg-red-50 text-red-700" },
};

function StatusBadge({ status }: { status: OrderStatus }) {
  const config = statusConfig[status] ?? statusConfig.draft;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

// --- Page Component (Server) ---

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) {
    notFound();
  }

  const history = await getOrderStatusHistory(id);

  // Fetch receivables linked to this order
  const supabase = await createClient();
  const activeData = await getActiveOrganization();
  const orgId = activeData?.org?.id;
  let receivables: Array<{
    id: string;
    description: string;
    original_amount: number;
    amount_received: number;
    due_date: string;
    status: string;
    installment_number: number | null;
  }> = [];
  if (orgId) {
    const { data } = await supabase
      .from("receivables")
      .select("id, description, original_amount, amount_received, due_date, status, installment_number")
      .eq("organization_id", orgId)
      .eq("order_id", id)
      .order("installment_number", { ascending: true });
    receivables = data ?? [];
  }

  const totalReceivable = receivables.reduce((s, r) => s + Number(r.original_amount), 0);
  const totalReceived = receivables.reduce((s, r) => s + Number(r.amount_received), 0);

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/dashboard/vendas/pedidos"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-nexora-text-secondary transition-colors hover:text-nexora-dark"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para pedidos
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-nexora-dark">
            Pedido {order.document_number}
          </h1>
          <StatusBadge status={order.status} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg border border-nexora-border px-3 py-2 text-sm font-medium text-nexora-text transition-colors hover:bg-nexora-bg-secondary print:hidden"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </button>
          <Link
            href={`/dashboard/vendas/pedidos/${order.id}/editar`}
            className="inline-flex items-center gap-2 rounded-lg bg-nexora-blue px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-nexora-blue/90 print:hidden"
          >
            <Edit className="h-4 w-4" />
            Editar
          </Link>
        </div>
      </div>

      {/* Info Grid + Financial Summary */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Order Info */}
        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-nexora-dark">Informações do pedido</h2>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-nexora-text-secondary">Cliente</dt>
              <dd className="mt-1">
                <Link
                  href={`/dashboard/clientes/${order.customer.id}`}
                  className="text-sm font-medium text-nexora-blue hover:underline"
                >
                  {order.customer.name}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-nexora-text-secondary">Canal</dt>
              <dd className="mt-1 text-sm text-nexora-dark">
                {order.channel?.name ?? <span className="text-nexora-text-secondary">—</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-nexora-text-secondary">Criado por</dt>
              <dd className="mt-1 text-sm text-nexora-dark">
                {order.creator.full_name ?? <span className="text-nexora-text-secondary">—</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-nexora-text-secondary">Data de emissão</dt>
              <dd className="mt-1 text-sm text-nexora-dark">{formatDate(order.issued_at)}</dd>
            </div>
            {order.completed_at && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-nexora-text-secondary">Data de conclusão</dt>
                <dd className="mt-1 text-sm text-nexora-dark">{formatDate(order.completed_at)}</dd>
              </div>
            )}
            {order.cancelled_at && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-nexora-text-secondary">Data de cancelamento</dt>
                <dd className="mt-1 text-sm text-nexora-dark">{formatDate(order.cancelled_at)}</dd>
              </div>
            )}
          </dl>
          {order.notes && (
            <div className="mt-4 border-t border-nexora-border pt-4">
              <dt className="text-xs font-medium uppercase tracking-wider text-nexora-text-secondary">Observações</dt>
              <dd className="mt-1 text-sm text-nexora-dark whitespace-pre-line">{order.notes}</dd>
            </div>
          )}
        </div>

        {/* Financial Summary */}
        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-nexora-dark">Resumo financeiro</h2>
          <dl className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <dt className="text-sm text-nexora-text-secondary">Subtotal</dt>
              <dd className="text-sm font-medium text-nexora-dark">{formatCurrency(order.subtotal)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-nexora-text-secondary">Desconto</dt>
              <dd className="text-sm font-medium text-nexora-dark">
                {order.discount > 0 ? `- ${formatCurrency(order.discount)}` : formatCurrency(0)}
              </dd>
            </div>
            <div className="border-t border-nexora-border pt-3">
              <div className="flex items-center justify-between">
                <dt className="text-base font-semibold text-nexora-dark">Total</dt>
                <dd className="text-xl font-bold text-nexora-blue">{formatCurrency(order.total)}</dd>
              </div>
            </div>
          </dl>
        </div>
      </div>

      {/* Items Table */}
      <div className="overflow-hidden rounded-xl border border-nexora-border bg-white shadow-sm">
        <div className="px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-nexora-dark">Itens do pedido</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-nexora-border bg-nexora-bg-secondary">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 font-medium text-nexora-text-secondary">Descrição</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-nexora-text-secondary">Qtd</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-nexora-text-secondary">Preço unitário</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-nexora-text-secondary">Desconto</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-nexora-text-secondary">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nexora-border">
              {order.items.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-nexora-bg-secondary/50">
                  <td className="px-4 py-3 font-medium text-nexora-dark">{item.description}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-nexora-text">{item.quantity}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-nexora-text">{formatCurrency(item.unit_price)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-nexora-text">
                    {item.discount > 0 ? formatCurrency(item.discount) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-nexora-dark">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial Section — Receivables linked to this order */}
      {receivables.length > 0 && (
        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-nexora-blue" />
              <h2 className="font-display text-lg font-semibold text-nexora-dark">Financeiro</h2>
            </div>
            <Link
              href="/dashboard/financeiro/receber"
              className="text-sm font-medium text-nexora-blue hover:underline"
            >
              Ver todos os recebíveis
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-nexora-text-secondary">Total do pedido</p>
              <p className="text-lg font-bold text-nexora-dark">{formatCurrency(totalReceivable)}</p>
            </div>
            <div>
              <p className="text-xs text-nexora-text-secondary">Recebido</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(totalReceived)}</p>
            </div>
            <div>
              <p className="text-xs text-nexora-text-secondary">Pendente</p>
              <p className={`text-lg font-bold ${totalReceivable - totalReceived > 0 ? "text-nexora-error" : "text-green-600"}`}>
                {formatCurrency(totalReceivable - totalReceived)}
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-nexora-border bg-nexora-bg-secondary">
                <tr>
                  <th className="px-4 py-2 font-medium text-nexora-text-secondary">Parcela</th>
                  <th className="px-4 py-2 font-medium text-nexora-text-secondary">Vencimento</th>
                  <th className="px-4 py-2 text-right font-medium text-nexora-text-secondary">Valor</th>
                  <th className="px-4 py-2 text-right font-medium text-nexora-text-secondary">Recebido</th>
                  <th className="px-4 py-2 text-center font-medium text-nexora-text-secondary">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexora-border">
                {receivables.map((r) => {
                  const stLabel: Record<string, string> = {
                    open: "Em aberto",
                    partially_received: "Parcial",
                    received: "Recebido",
                    overdue: "Vencido",
                    cancelled: "Cancelado",
                  };
                  const stClass: Record<string, string> = {
                    open: "bg-blue-50 text-blue-700",
                    partially_received: "bg-yellow-50 text-yellow-700",
                    received: "bg-green-50 text-green-700",
                    overdue: "bg-red-50 text-red-700",
                    cancelled: "bg-gray-100 text-gray-600",
                  };
                  return (
                    <tr key={r.id} className="hover:bg-nexora-bg-secondary/50">
                      <td className="px-4 py-2 text-nexora-dark">
                        {r.installment_number ? `${r.installment_number}ª` : "—"}
                      </td>
                      <td className="px-4 py-2 text-nexora-text">
                        {new Date(r.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-nexora-text">
                        {formatCurrency(Number(r.original_amount))}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-nexora-text">
                        {formatCurrency(Number(r.amount_received))}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${stClass[r.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {stLabel[r.status] ?? r.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Status Change + History */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status Change Form (Client Component) */}
        <div className="print:hidden">
          <StatusChangeForm orderId={order.id} currentStatus={order.status} />
        </div>

        {/* Status History Timeline */}
        <StatusTimeline history={history} />
      </div>
    </div>
  );
}