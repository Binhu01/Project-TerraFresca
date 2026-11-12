"use client";

import { useState, useTransition } from "react";
import { ArrowRightLeft, Check } from "lucide-react";
import { updateOrderStatus } from "../../../actions";
import type { OrderStatus } from "@/types/sales";

const statusOptions: { value: OrderStatus; label: string }[] = [
  { value: "draft", label: "Rascunho" },
  { value: "confirmed", label: "Confirmado" },
  { value: "preparing", label: "Em preparo" },
  { value: "completed", label: "Concluído" },
  { value: "cancelled", label: "Cancelado" },
];

export function StatusChangeForm({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: OrderStatus;
}) {
  const [status, setStatus] = useState<OrderStatus>(currentStatus);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (status === currentStatus && !reason.trim()) return;

    setSuccess(false);
    startTransition(async () => {
      try {
        await updateOrderStatus(orderId, { status, reason: reason || undefined });
        setSuccess(true);
        setReason("");
        setTimeout(() => setSuccess(false), 3000);
      } catch {
        // Error is handled by the server action / Next.js error boundary
      }
    });
  };

  return (
    <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
      <h2 className="font-display text-lg font-semibold text-nexora-dark">
        Alterar status
      </h2>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label
            htmlFor="new-status"
            className="block text-xs font-medium uppercase tracking-wider text-nexora-text-secondary"
          >
            Novo status
          </label>
          <select
            id="new-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatus)}
            disabled={isPending}
            className="mt-1 w-full rounded-lg border border-nexora-border bg-nexora-bg-secondary px-3 py-2 text-sm text-nexora-dark focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue disabled:opacity-50"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="status-reason"
            className="block text-xs font-medium uppercase tracking-wider text-nexora-text-secondary"
          >
            Motivo (opcional)
          </label>
          <textarea
            id="status-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isPending}
            rows={2}
            placeholder="Descreva o motivo da alteração..."
            className="mt-1 w-full resize-none rounded-lg border border-nexora-border bg-nexora-bg-secondary px-3 py-2 text-sm text-nexora-dark placeholder:text-nexora-text-secondary focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={isPending || (status === currentStatus && !reason.trim())}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-nexora-blue px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-nexora-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? (
            <>Atualizando...</>
          ) : success ? (
            <>
              <Check className="h-4 w-4" />
              Status atualizado
            </>
          ) : (
            <>
              <ArrowRightLeft className="h-4 w-4" />
              Atualizar status
            </>
          )}
        </button>
      </form>
    </div>
  );
}