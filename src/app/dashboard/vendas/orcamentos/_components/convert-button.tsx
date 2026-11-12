"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";
import { convertQuoteToOrder } from "../../actions";

export function ConvertButton({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConvert = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await convertQuoteToOrder(quoteId);
      if ("success" in result && result.orderId) {
        router.push(`/dashboard/vendas/pedidos/${result.orderId}`);
        router.refresh();
      } else {
        setError("Falha ao converter orçamento.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado ao converter.");
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-nexora-blue px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-nexora-blue/90 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        Converter em Pedido
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl border border-nexora-border bg-white p-6 shadow-lg">
            <h3 className="font-display text-lg font-semibold text-nexora-dark">
              Converter em Pedido
            </h3>
            <p className="mt-2 text-sm text-nexora-text-secondary">
              Esta ação criará um novo pedido com base neste orçamento e marcará o orçamento como convertido. Deseja continuar?
            </p>
            {error && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setError(null);
                }}
                disabled={loading}
                className="rounded-lg border border-nexora-border px-4 py-2 text-sm font-medium text-nexora-text hover:bg-nexora-bg-secondary disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConvert}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-nexora-blue px-4 py-2 text-sm font-medium text-white hover:bg-nexora-blue/90 disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Convertendo..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}