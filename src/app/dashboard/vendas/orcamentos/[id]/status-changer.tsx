"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ChevronDown } from "lucide-react";
import { updateQuoteStatus } from "../../actions";
import type { QuoteStatus } from "@/types/sales";

const statusOptions: { value: QuoteStatus; label: string }[] = [
  { value: "draft", label: "Rascunho" },
  { value: "sent", label: "Enviado" },
  { value: "accepted", label: "Aceito" },
  { value: "rejected", label: "Rejeitado" },
  { value: "expired", label: "Expirado" },
];

export function StatusChanger({
  quoteId,
  currentStatus,
}: {
  quoteId: string;
  currentStatus: QuoteStatus;
}) {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<QuoteStatus>(currentStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleUpdate = async () => {
    if (selectedStatus === currentStatus) return;
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const result = await updateQuoteStatus(quoteId, { status: selectedStatus });
      if ("success" in result) {
        setSuccess(true);
        router.refresh();
      } else {
        setError("Falha ao atualizar status.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const hasChanged = selectedStatus !== currentStatus;

  return (
    <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
      <h2 className="font-display text-base font-semibold text-nexora-dark">
        Alterar status
      </h2>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative">
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value as QuoteStatus);
              setSuccess(false);
            }}
            disabled={loading}
            className="w-full appearance-none rounded-lg border border-nexora-border bg-nexora-bg-secondary py-2 pl-3 pr-9 text-sm text-nexora-dark focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue disabled:opacity-50 sm:w-48"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-nexora-text-secondary" />
        </div>
        <button
          onClick={handleUpdate}
          disabled={!hasChanged || loading}
          className="inline-flex items-center gap-2 rounded-lg bg-nexora-blue px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-nexora-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Atualizando..." : "Atualizar status"}
        </button>
      </div>
      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}
      {success && (
        <p className="mt-3 text-sm text-green-600">Status atualizado com sucesso.</p>
      )}
    </div>
  );
}