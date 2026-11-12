"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Send,
  XCircle,
  Package,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import type { PurchaseOrderWithItems } from "@/types/purchases";
import {
  approvePurchaseOrder,
  sendPurchaseOrder,
  cancelPurchaseOrder,
} from "../../actions";

interface OrderActionsProps {
  order: PurchaseOrderWithItems;
}

export function OrderActions({ order }: OrderActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  function handleAction(action: () => Promise<unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao executar ação.");
      }
    });
  }

  const canApprove = order.status === "draft";
  const canSend = order.status === "approved";
  const canCancel = !["received", "cancelled"].includes(order.status);
  const canReceive = ["sent", "partially_received", "approved"].includes(order.status);

  if (!canApprove && !canSend && !canCancel && !canReceive) {
    return null;
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canApprove && (
          <button
            onClick={() => handleAction(() => approvePurchaseOrder(order.id))}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            {isPending ? "Aprovando…" : "Aprovar ordem"}
          </button>
        )}

        {canSend && (
          <button
            onClick={() => handleAction(() => sendPurchaseOrder(order.id))}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {isPending ? "Enviando…" : "Marcar como enviada"}
          </button>
        )}

        {canReceive && (
          <a
            href={`/dashboard/compras/recebimentos/novo?order_id=${order.id}`}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700"
          >
            <Package className="h-4 w-4" />
            Registrar recebimento
          </a>
        )}

        {canCancel && !showCancelConfirm && (
          <button
            onClick={() => setShowCancelConfirm(true)}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />
            Cancelar ordem
          </button>
        )}
      </div>

      {/* Cancel Confirmation */}
      {showCancelConfirm && (
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">Confirmar cancelamento</h3>
              <p className="mt-1 text-sm text-red-700">
                Esta ação não pode ser desfeita. Itens já recebidos serão mantidos no estoque.
              </p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Motivo do cancelamento (opcional)…"
                rows={2}
                className="mt-3 w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
              />
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() =>
                    handleAction(async () => {
                      await cancelPurchaseOrder(order.id, cancelReason || undefined);
                      setShowCancelConfirm(false);
                    })
                  }
                  disabled={isPending}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {isPending ? "Cancelando…" : "Confirmar cancelamento"}
                </button>
                <button
                  onClick={() => {
                    setShowCancelConfirm(false);
                    setCancelReason("");
                  }}
                  className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  Voltar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}