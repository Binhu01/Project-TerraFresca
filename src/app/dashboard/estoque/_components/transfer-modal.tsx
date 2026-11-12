"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, ArrowRightLeft } from "lucide-react";
import { stockTransferSchema } from "../schemas";
import { transferStock } from "../actions";

type StockTransferFormValues = z.infer<typeof stockTransferSchema>;

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Array<{ id: string; name: string; sku: string | null }>;
  warehouses: Array<{ id: string; name: string; code: string }>;
  onSuccess?: () => void;
}

export function TransferModal({
  isOpen,
  onClose,
  products,
  warehouses,
  onSuccess,
}: TransferModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<StockTransferFormValues>({
    resolver: zodResolver(stockTransferSchema) as never,
    defaultValues: {
      source_warehouse_id: "",
      destination_warehouse_id: "",
      product_id: "",
      variant_id: "",
      quantity: undefined,
      reason: "",
    },
  });

  const sourceId = watch("source_warehouse_id");
  const destinationId = watch("destination_warehouse_id");

  useEffect(() => {
    if (isOpen) {
      reset({
        source_warehouse_id: "",
        destination_warehouse_id: "",
        product_id: "",
        variant_id: "",
        quantity: undefined,
        reason: "",
      });
    }
  }, [isOpen, reset]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      return () => document.removeEventListener("keydown", handleEsc);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const onSubmit = async (data: StockTransferFormValues) => {
    if (data.source_warehouse_id === data.destination_warehouse_id) {
      setError("destination_warehouse_id", {
        message: "Depósito de destino deve ser diferente do depósito de origem",
      });
      return;
    }

    try {
      await transferStock(data);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError("root", {
        message: err instanceof Error ? err.message : "Falha ao registrar transferência de estoque.",
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="transfer-title"
    >
      <div
        className="bg-white rounded-xl border border-nexora-border p-6 shadow-xl max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-nexora-blue" />
            <h2 id="transfer-title" className="text-lg font-semibold text-nexora-text">
              Transferência entre Depósitos
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-nexora-text-secondary hover:text-nexora-text transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="source_warehouse_id" className="block text-sm font-medium text-nexora-text mb-1">
              Depósito de Origem
            </label>
            <select
              id="source_warehouse_id"
              {...register("source_warehouse_id")}
              className="w-full rounded-lg border border-nexora-border bg-white px-3 py-2 text-sm text-nexora-text focus:outline-none focus:ring-2 focus:ring-nexora-blue focus:border-transparent"
            >
              <option value="">Selecione o depósito de origem</option>
              {warehouses
                .filter((w) => w.id !== destinationId)
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
            </select>
            {errors.source_warehouse_id && (
              <p className="mt-1 text-sm text-nexora-error">{errors.source_warehouse_id.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="destination_warehouse_id" className="block text-sm font-medium text-nexora-text mb-1">
              Depósito de Destino
            </label>
            <select
              id="destination_warehouse_id"
              {...register("destination_warehouse_id")}
              className="w-full rounded-lg border border-nexora-border bg-white px-3 py-2 text-sm text-nexora-text focus:outline-none focus:ring-2 focus:ring-nexora-blue focus:border-transparent"
            >
              <option value="">Selecione o depósito de destino</option>
              {warehouses
                .filter((w) => w.id !== sourceId)
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
            </select>
            {errors.destination_warehouse_id && (
              <p className="mt-1 text-sm text-nexora-error">{errors.destination_warehouse_id.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="product_id" className="block text-sm font-medium text-nexora-text mb-1">
              Produto
            </label>
            <select
              id="product_id"
              {...register("product_id")}
              className="w-full rounded-lg border border-nexora-border bg-white px-3 py-2 text-sm text-nexora-text focus:outline-none focus:ring-2 focus:ring-nexora-blue focus:border-transparent"
            >
              <option value="">Selecione um produto</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.sku ? ` (SKU: ${p.sku})` : ""}
                </option>
              ))}
            </select>
            {errors.product_id && (
              <p className="mt-1 text-sm text-nexora-error">{errors.product_id.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="variant_id" className="block text-sm font-medium text-nexora-text mb-1">
              Variante <span className="text-nexora-text-secondary">(opcional)</span>
            </label>
            <input
              id="variant_id"
              type="text"
              {...register("variant_id")}
              placeholder="ID da variante (opcional)"
              className="w-full rounded-lg border border-nexora-border bg-white px-3 py-2 text-sm text-nexora-text placeholder:text-nexora-text-secondary focus:outline-none focus:ring-2 focus:ring-nexora-blue focus:border-transparent"
            />
            {errors.variant_id && (
              <p className="mt-1 text-sm text-nexora-error">{errors.variant_id.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-nexora-text mb-1">
              Quantidade
            </label>
            <input
              id="quantity"
              type="number"
              step="0.01"
              min="0.01"
              {...register("quantity")}
              className="w-full rounded-lg border border-nexora-border bg-white px-3 py-2 text-sm text-nexora-text focus:outline-none focus:ring-2 focus:ring-nexora-blue focus:border-transparent"
            />
            {errors.quantity && (
              <p className="mt-1 text-sm text-nexora-error">{errors.quantity.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-nexora-text mb-1">
              Motivo
            </label>
            <textarea
              id="reason"
              rows={3}
              {...register("reason")}
              placeholder="Descreva o motivo da transferência"
              className="w-full rounded-lg border border-nexora-border bg-white px-3 py-2 text-sm text-nexora-text placeholder:text-nexora-text-secondary resize-none focus:outline-none focus:ring-2 focus:ring-nexora-blue focus:border-transparent"
            />
            {errors.reason && (
              <p className="mt-1 text-sm text-nexora-error">{errors.reason.message}</p>
            )}
          </div>

          {errors.root && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-nexora-error">{errors.root.message}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-nexora-text-secondary hover:text-nexora-text transition-colors"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-nexora-blue rounded-lg hover:bg-nexora-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "Transferindo..." : "Registrar Transferência"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}