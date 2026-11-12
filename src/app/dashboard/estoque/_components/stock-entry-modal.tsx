"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, PackagePlus } from "lucide-react";
import { stockEntrySchema } from "../schemas";
import { recordStockEntry } from "../actions";

type StockEntryFormValues = z.infer<typeof stockEntrySchema>;

interface StockEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Array<{ id: string; name: string; sku: string | null }>;
  warehouses: Array<{ id: string; name: string; code: string }>;
  onSuccess?: () => void;
}

export function StockEntryModal({
  isOpen,
  onClose,
  products,
  warehouses,
  onSuccess,
}: StockEntryModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<StockEntryFormValues>({
    resolver: zodResolver(stockEntrySchema) as never,
    defaultValues: {
      warehouse_id: "",
      product_id: "",
      variant_id: "",
      quantity: undefined,
      movement_type: "manual_in",
      reason: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        warehouse_id: "",
        product_id: "",
        variant_id: "",
        quantity: undefined,
        movement_type: "manual_in",
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

  const onSubmit = async (data: StockEntryFormValues) => {
    try {
      await recordStockEntry(data);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError("root", {
        message: err instanceof Error ? err.message : "Falha ao registrar entrada de estoque.",
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="stock-entry-title"
    >
      <div
        className="bg-white rounded-xl border border-nexora-border p-6 shadow-xl max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-nexora-blue" />
            <h2 id="stock-entry-title" className="text-lg font-semibold text-nexora-text">
              Registrar Entrada de Estoque
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
            <label htmlFor="warehouse_id" className="block text-sm font-medium text-nexora-text mb-1">
              Armazém
            </label>
            <select
              id="warehouse_id"
              {...register("warehouse_id")}
              className="w-full rounded-lg border border-nexora-border bg-white px-3 py-2 text-sm text-nexora-text focus:outline-none focus:ring-2 focus:ring-nexora-blue focus:border-transparent"
            >
              <option value="">Selecione um armazém</option>
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
            <label htmlFor="movement_type" className="block text-sm font-medium text-nexora-text mb-1">
              Tipo de Movimento
            </label>
            <select
              id="movement_type"
              {...register("movement_type")}
              className="w-full rounded-lg border border-nexora-border bg-white px-3 py-2 text-sm text-nexora-text focus:outline-none focus:ring-2 focus:ring-nexora-blue focus:border-transparent"
            >
              <option value="initial_balance">Saldo Inicial</option>
              <option value="manual_in">Entrada Manual</option>
              <option value="adjustment_in">Ajuste Positivo</option>
            </select>
            {errors.movement_type && (
              <p className="mt-1 text-sm text-nexora-error">{errors.movement_type.message}</p>
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
              placeholder="Descreva o motivo da entrada de estoque"
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
              {isSubmitting ? "Registrando..." : "Registrar Entrada"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}