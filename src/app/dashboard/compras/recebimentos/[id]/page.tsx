import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Package,
  CheckCircle2,
  AlertTriangle,
  User,
  Warehouse,
} from "lucide-react";
import { getGoodsReceiptById } from "../../actions";
import type { GoodsReceiptStatus } from "@/types/purchases";

const STATUS_CONFIG: Record<GoodsReceiptStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  confirmed: { label: "Confirmado", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  partial: { label: "Parcial", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Package },
  with_discrepancies: { label: "Com divergências", color: "bg-red-100 text-red-700 border-red-200", icon: AlertTriangle },
};

export default async function RecebimentoDetailPage(props: { params: Promise<{ id: string }> }) {
  await headers();
  const { id } = await props.params;
  const receipt = await getGoodsReceiptById(id);

  if (!receipt) {
    notFound();
  }

  const statusInfo = STATUS_CONFIG[receipt.status] ?? STATUS_CONFIG.confirmed;
  const StatusIcon = statusInfo.icon;
  const items = receipt.items ?? [];

  const totalReceived = items.reduce((sum, item) => sum + item.quantity_accepted, 0);
  const totalRejected = items.reduce((sum, item) => sum + item.quantity_rejected, 0);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/dashboard/compras/recebimentos"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-nexora-text-secondary transition-colors hover:text-nexora-blue"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para recebimentos
      </Link>

      {/* Header Card */}
      <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-bold text-nexora-dark">{receipt.receipt_number}</h1>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusInfo.color}`}>
                <StatusIcon className="h-3 w-3" />
                {statusInfo.label}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-nexora-text-secondary">
              <span className="flex items-center gap-1.5">
                <Package className="h-4 w-4 text-nexora-blue" />
                Ordem:{" "}
                <Link
                  href={`/dashboard/compras/ordens/${receipt.purchase_order_id}`}
                  className="font-medium text-nexora-blue hover:underline"
                >
                  {receipt.purchase_number ?? receipt.purchase_order_id.slice(0, 8)}
                </Link>
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-nexora-blue" />
                Recebido em {new Date(receipt.received_at).toLocaleDateString("pt-BR")}
              </span>
              {receipt.warehouse_name && (
                <span className="flex items-center gap-1.5">
                  <Warehouse className="h-4 w-4 text-nexora-blue" />
                  Depósito: {receipt.warehouse_name}
                </span>
              )}
              {receipt.receiver_name && (
                <span className="flex items-center gap-1.5">
                  <User className="h-4 w-4 text-nexora-blue" />
                  Recebido por: {receipt.receiver_name}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-nexora-text-secondary">Total recebido</p>
            <p className="text-2xl font-bold text-green-700">{totalReceived} un.</p>
            {totalRejected > 0 && (
              <p className="text-sm font-medium text-red-600">{totalRejected} rejeitadas</p>
            )}
          </div>
        </div>

        {receipt.notes && (
          <div className="mt-4 rounded-lg border border-nexora-border/50 bg-amber-50/50 p-4">
            <p className="text-xs font-medium text-amber-700">Observações</p>
            <p className="mt-1 whitespace-pre-line text-sm text-nexora-dark">{receipt.notes}</p>
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-nexora-dark">Itens recebidos</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-nexora-border bg-nexora-bg-secondary/50">
              <tr>
                <th className="px-4 py-2.5 font-semibold text-nexora-dark">Produto</th>
                <th className="px-4 py-2.5 text-right font-semibold text-nexora-dark">Pedida</th>
                <th className="px-4 py-2.5 text-right font-semibold text-nexora-dark">Recebida</th>
                <th className="px-4 py-2.5 text-right font-semibold text-nexora-dark">Aceita</th>
                <th className="px-4 py-2.5 text-right font-semibold text-nexora-dark">Rejeitada</th>
                <th className="px-4 py-2.5 font-semibold text-nexora-dark">Motivo rejeição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nexora-border">
              {items.map((item) => (
                <tr key={item.id} className={`transition-colors hover:bg-nexora-bg-secondary/30 ${item.quantity_rejected > 0 ? "bg-red-50/30" : ""}`}>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-nexora-dark">{item.product_name ?? item.product_id}</p>
                    {item.sku && (
                      <p className="text-xs text-nexora-text-secondary">SKU: {item.sku}</p>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-nexora-text-secondary">
                    {item.quantity_ordered ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-nexora-dark">
                    {item.quantity_received}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-green-700">
                    {item.quantity_accepted}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {item.quantity_rejected > 0 ? (
                      <span className="font-medium text-red-600">{item.quantity_rejected}</span>
                    ) : (
                      <span className="text-nexora-text-secondary">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-nexora-text-secondary">
                    {item.rejection_reason ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Metadata Footer */}
      <div className="rounded-lg border border-nexora-border/50 bg-nexora-bg-secondary/30 px-4 py-3 text-xs text-nexora-text-secondary">
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <span>Criado em: {new Date(receipt.created_at).toLocaleDateString("pt-BR")}</span>
          <span>ID: {receipt.id.slice(0, 8)}</span>
        </div>
      </div>
    </div>
  );
}