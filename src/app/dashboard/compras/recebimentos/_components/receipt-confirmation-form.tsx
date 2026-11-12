"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { PurchaseOrderWithItems, PurchaseOrderItem } from "@/types/purchases";
import { confirmGoodsReceipt } from "../../actions";

interface ReceiptConfirmationFormProps {
  order: PurchaseOrderWithItems;
  pendingItems: PurchaseOrderItem[];
}

interface ReceiptItemState {
  purchase_order_item_id: string;
  quantity_received: number;
  quantity_accepted: number;
  quantity_rejected: number;
  rejection_reason: string;
}

export function ReceiptConfirmationForm({
  order,
  pendingItems,
}: ReceiptConfirmationFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [warehouseId, setWarehouseId] = useState(order.destination_warehouse_id ?? "");
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<ReceiptItemState[]>(
    pendingItems.map((item) => {
      const pending = item.quantity_ordered - item.quantity_received - item.quantity_cancelled;
      return {
        purchase_order_item_id: item.id,
        quantity_received: pending,
        quantity_accepted: pending,
        quantity_rejected: 0,
        rejection_reason: "",
      };
    }),
  );

  function updateItem(index: number, field: keyof ReceiptItemState, value: string | number) {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // Auto-adjust: accepted + rejected should not exceed received
      if (field === "quantity_received") {
        const received = Number(value) || 0;
        const currentRejected = updated[index].quantity_rejected;
        updated[index].quantity_accepted = Math.max(0, received - currentRejected);
      } else if (field === "quantity_rejected") {
        const rejected = Number(value) || 0;
        const currentReceived = updated[index].quantity_received;
        updated[index].quantity_accepted = Math.max(0, currentReceived - rejected);
      } else if (field === "quantity_accepted") {
        const accepted = Number(value) || 0;
        const currentReceived = updated[index].quantity_received;
        updated[index].quantity_rejected = Math.max(0, currentReceived - accepted);
      }

      return updated;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!warehouseId) {
      setError("Informe o depósito de destino.");
      return;
    }

    const hasAnyReceived = items.some((item) => item.quantity_received > 0);
    if (!hasAnyReceived) {
      setError("Informe a quantidade recebida de pelo menos um item.");
      return;
    }

    // Validate: accepted + rejected must equal received for each item
    for (const item of items) {
      if (item.quantity_received > 0 && item.quantity_accepted + item.quantity_rejected !== item.quantity_received) {
        setError(`A soma de aceitos (${item.quantity_accepted}) e rejeitados (${item.quantity_rejected}) deve ser igual à quantidade recebida (${item.quantity_received}).`);
        return;
      }
    }

    startTransition(async () => {
      try {
        await confirmGoodsReceipt({
          purchase_order_id: order.id,
          warehouse_id: warehouseId,
          received_at: receivedAt,
          notes: notes || undefined,
          items: items
            .filter((item) => item.quantity_received > 0)
            .map((item) => ({
              purchase_order_item_id: item.purchase_order_item_id,
              quantity_received: item.quantity_received,
              quantity_accepted: item.quantity_accepted,
              quantity_rejected: item.quantity_rejected,
              rejection_reason: item.rejection_reason || undefined,
            })),
        });
        router.push("/dashboard/compras/recebimentos");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao confirmar recebimento.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Header Info */}
      <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-nexora-dark">Dados do recebimento</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-nexora-dark">Depósito destino *</label>
            <input
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              placeholder="UUID do depósito"
              required
              className="w-full rounded-lg border border-nexora-border bg-white px-3 py-2.5 text-sm focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-nexora-dark">Data de entrada *</label>
            <input
              type="date"
              value={receivedAt}
              onChange={(e) => setReceivedAt(e.target.value)}
              required
              className="w-full rounded-lg border border-nexora-border bg-white px-3 py-2.5 text-sm focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-nexora-dark">Ordem de compra</label>
            <input
              disabled
              value={order.purchase_number}
              className="w-full rounded-lg border border-nexora-border bg-nexora-bg-secondary/50 px-3 py-2.5 text-sm text-nexora-text-secondary"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-nexora-dark">Observações</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Notas sobre este recebimento…"
            className="w-full rounded-lg border border-nexora-border bg-white px-3 py-2.5 text-sm focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
          />
        </div>
      </div>

      {/* Items */}
      <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-nexora-dark">Itens para recebimento</h2>
        <p className="mt-1 text-xs text-nexora-text-secondary">
          Informe as quantidades recebidas, aceitas e rejeitadas para cada item pendente.
        </p>

        <div className="mt-4 space-y-4">
          {items.map((item, index) => {
            const poItem = pendingItems.find((pi) => pi.id === item.purchase_order_item_id)!;
            const pending = poItem.quantity_ordered - poItem.quantity_received - poItem.quantity_cancelled;
            const hasDiscrepancy = item.quantity_received !== pending;

            return (
              <div
                key={item.purchase_order_item_id}
                className={`rounded-lg border p-4 ${hasDiscrepancy ? "border-amber-300 bg-amber-50/30" : "border-nexora-border/50 bg-nexora-bg-secondary/20"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-nexora-dark">{poItem.product_name_snapshot}</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-nexora-text-secondary">
                      {poItem.sku_snapshot && <span>SKU: {poItem.sku_snapshot}</span>}
                      <span>Pedido: {poItem.quantity_ordered}</span>
                      <span>Já recebido: {poItem.quantity_received}</span>
                      <span className="font-semibold text-nexora-dark">Pendente: {pending}</span>
                    </div>
                  </div>
                  {hasDiscrepancy && (
                    <div className="flex shrink-0 items-center gap-1 text-xs font-medium text-amber-700">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Divergência
                    </div>
                  )}
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-nexora-dark">Qtd. recebida *</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      max={pending}
                      value={item.quantity_received || ""}
                      onChange={(e) => updateItem(index, "quantity_received", parseFloat(e.target.value) || 0)}
                      className="w-full rounded-md border border-nexora-border bg-white px-2 py-1.5 text-sm focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-green-700">Aceita</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={item.quantity_accepted || ""}
                      onChange={(e) => updateItem(index, "quantity_accepted", parseFloat(e.target.value) || 0)}
                      className="w-full rounded-md border border-nexora-border bg-white px-2 py-1.5 text-sm text-green-700 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-red-700">Rejeitada</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={item.quantity_rejected || ""}
                      onChange={(e) => updateItem(index, "quantity_rejected", parseFloat(e.target.value) || 0)}
                      className="w-full rounded-md border border-nexora-border bg-white px-2 py-1.5 text-sm text-red-700 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-nexora-dark">Motivo rejeição</label>
                    <input
                      value={item.rejection_reason}
                      onChange={(e) => updateItem(index, "rejection_reason", e.target.value)}
                      placeholder={item.quantity_rejected > 0 ? "Obrigatório se houver rejeição" : "—"}
                      disabled={item.quantity_rejected === 0}
                      className="w-full rounded-md border border-nexora-border bg-white px-2 py-1.5 text-sm disabled:bg-nexora-bg-secondary/50 disabled:text-nexora-text-secondary/50"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700 disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" />
          {isPending ? "Confirmando…" : "Confirmar recebimento"}
        </button>
        <a
          href={`/dashboard/compras/ordens/${order.id}`}
          className="inline-flex items-center gap-2 rounded-lg border border-nexora-border bg-white px-6 py-2.5 text-sm font-medium text-nexora-dark transition-colors hover:bg-nexora-bg-secondary"
        >
          <X className="h-4 w-4" />
          Cancelar
        </a>
      </div>
    </form>
  );
}