"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Scale } from "lucide-react";
import { stockAdjustmentSchema } from "../schemas";
import { recordStockAdjustment } from "../actions";

type StockAdjustmentFormValues = z.infer<typeof stockAdjustmentSchema>;

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Array<{ id: string; name: string; sku: string | null }>;
  warehouses: Array<{ id: string; name: string; code: string }>;
  currentQuantity?: number | null;
  onSuccess?: () => void;
}

export function StockAdjustmentModal({
  isOpen,
  onClose,
  products,
  warehouses,
  currentQuantity,
  onSuccess,
}: StockAdjustmentModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<StockAdjustmentFormValues>({
    resolver: zodResolver(stockAdjustmentSchema) as never,
    defaultValues: {
      warehouse_id: "",
      product_id: "",
      variant_id: "",
      counted_quantity: undefined,
      reason: "",
    },
  });

  const watchedWarehouse = watch("warehouse_id");
  const watchedProduct = watch("product_id");

  useEffect(() => {
    if (isOpen) {
      reset({
        warehouse_id: "",
        product_id: "",
        variant_id: "",
        counted_quantity: undefined,
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

  const onSubmit = async (data: StockAdjustmentFormValues) => {
    try {
      await recordStockAdjustment(data);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError("root", {
        message: err instanceof Error ? err.message : "Falha ao registrar ajuste de estoque.",
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="stock-adjustment-title"
    >
      <div
        className="bg-white rounded-xl border border-nexora-border p-6 shadow-xl max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-nexora-blue" />
            <h2 id="stock-adjustment-title" className="text-lg font-semibold text-nexora-text">
              Ajuste de Estoque
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
            <label htmlFor="adj_warehouse_id" className="block text-sm font-medium text-nexora-text mb-1">
              Depósito
            </label>
            <select
              id="adj_warehouse_id"
              {...register("warehouse_id")}
              className="w-full rounded-lg border border-nexora-border bg-white px-3 py-2 text-sm text-nexora-text focus:outline-none focus:ring-2 focus:ring-nexora-blue focus:border-transparent"
            >
              <option value="">Selecione um depósito</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
            {errors.warehouse_id && (
              <p className="mt-1 text-sm text-nexora-error">{errors.warehouse_id.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="adj_product_id" className="block text-sm font-medium text-nexora-text mb-1">
              Produto
            </label>
            <select
              id="adj_product_id"
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
            <label htmlFor="adj_variant_id" className="block text-sm font-medium text-nexora-text mb-1">
              Variante <span className="text-nexora-text-secondary">(opcional)</span>
            </label>
            <input
              id="adj_variant_id"
              type="text"
              {...register("variant_id")}
              placeholder="ID da variante (opcional)"
              className="w-full rounded-lg border border-nexora-border bg-white px-3 py-2 text-sm text-nexora-text placeholder:text-nexora-text-secondary focus:outline-none focus:ring-2 focus:ring-nexora-blue focus:border-transparent"
            />
            {errors.variant_id && (
              <p className="mt-1 text-sm text-nexora-error">{errors.variant_id.message}</p>
            )}
          </div>

          {currentQuantity !== undefined && currentQuantity !== null && watchedWarehouse && watchedProduct && (
            <div className="rounded-lg bg-nexora-blue/5 border border-nexora-blue/20 p-3">
              <p className="text-sm text-nexora-text">
                <span className="font-medium">Quantidade registrada:</span>{" "}
                <span className="font-semibold">{currentQuantity}</span>
              </p>
            </div>
          )}

          <div>
            <label htmlFor="counted_quantity" className="block text-sm font-medium text-nexora-text mb-1">
              Quantidade Contada
            </label>
            <input
              id="counted_quantity"
              type="number"
              step="0.01"
              min="0"
              {...register("counted_quantity", { valueAsNumber: true })}
              placeholder="Informe a quantidade física contada"
              className="w-full rounded-lg border border-nexora-border bg-white px-3 py-2 text-sm text-nexora-text placeholder:text-nexora-text-secondary focus:outline-none focus:ring-2 focus:ring-nexora-blue focus:border-transparent"
            />
            {errors.counted_quantity && (
              <p className="mt-1 text-sm text-nexora-error">{errors.counted_quantity.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="adj_reason" className="block text-sm font-medium text-nexora-text mb-1">
              Motivo do Ajuste
            </label>
            <textarea
              id="adj_reason"
              rows={3}
              {...register("reason")}
              placeholder="Descreva o motivo do ajuste de estoque"
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
              {isSubmitting ? "Registrando..." : "Registrar Ajuste"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}