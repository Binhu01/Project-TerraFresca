"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, X, Plus, Trash2 } from "lucide-react";
import type { Supplier } from "@/types/purchases";
import { createPurchaseOrder } from "../../actions";

interface PurchaseOrderFormProps {
  suppliers: Supplier[];
  preselectedSupplierId?: string;
}

interface OrderItem {
  product_id: string;
  variant_id: string;
  quantity: number;
  unit_price: number;
  discount: number;
  notes: string;
  product_name: string;
}

const EMPTY_ITEM: OrderItem = {
  product_id: "",
  variant_id: "",
  quantity: 1,
  unit_price: 0,
  discount: 0,
  notes: "",
  product_name: "",
};

export function PurchaseOrderForm({ suppliers, preselectedSupplierId }: PurchaseOrderFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [supplierId, setSupplierId] = useState(preselectedSupplierId ?? "");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [commercialTerms, setCommercialTerms] = useState("");
  const [freightAmount, setFreightAmount] = useState(0);
  const [additionalCosts, setAdditionalCosts] = useState(0);
  const [items, setItems] = useState<OrderItem[]>([{ ...EMPTY_ITEM }]);

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof OrderItem, value: string | number) {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  const subtotal = items.reduce((sum, item) => {
    const lineTotal = item.quantity * item.unit_price - item.discount;
    return sum + Math.max(0, lineTotal);
  }, 0);
  const total = subtotal + freightAmount + additionalCosts;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!supplierId) {
      setError("Selecione um fornecedor.");
      return;
    }

    const validItems = items.filter((item) => item.product_id && item.quantity > 0 && item.unit_price >= 0);
    if (validItems.length === 0) {
      setError("Adicione pelo menos um item com produto, quantidade e preço.");
      return;
    }

    startTransition(async () => {
      try {
        await createPurchaseOrder({
          supplier_id: supplierId,
          issue_date: issueDate,
          expected_delivery_date: expectedDelivery || undefined,
          destination_warehouse_id: warehouseId || undefined,
          notes: notes || undefined,
          commercial_terms: commercialTerms || undefined,
          freight_amount: freightAmount > 0 ? freightAmount : undefined,
          additional_costs: additionalCosts > 0 ? additionalCosts : undefined,
          items: validItems.map((item) => ({
            product_id: item.product_id,
            variant_id: item.variant_id || undefined,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount: item.discount > 0 ? item.discount : undefined,
            notes: item.notes || undefined,
          })),
        });
        router.push("/dashboard/compras/ordens");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao criar ordem de compra.");
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
        <h2 className="font-display text-lg font-semibold text-nexora-dark">Dados da ordem</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-nexora-dark">Fornecedor *</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              required
              className="w-full rounded-lg border border-nexora-border bg-white px-3 py-2.5 text-sm focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            >
              <option value="">Selecione…</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.trade_name || s.legal_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-nexora-dark">Data de emissão *</label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              required
              className="w-full rounded-lg border border-nexora-border bg-white px-3 py-2.5 text-sm focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-nexora-dark">Previsão de entrega</label>
            <input
              type="date"
              value={expectedDelivery}
              onChange={(e) => setExpectedDelivery(e.target.value)}
              className="w-full rounded-lg border border-nexora-border bg-white px-3 py-2.5 text-sm focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-nexora-dark">Depósito destino</label>
            <input
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              placeholder="ID do depósito (opcional)"
              className="w-full rounded-lg border border-nexora-border bg-white px-3 py-2.5 text-sm focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-nexora-dark">Frete (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={freightAmount || ""}
              onChange={(e) => setFreightAmount(parseFloat(e.target.value) || 0)}
              placeholder="0,00"
              className="w-full rounded-lg border border-nexora-border bg-white px-3 py-2.5 text-sm focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-nexora-dark">Custos adicionais (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={additionalCosts || ""}
              onChange={(e) => setAdditionalCosts(parseFloat(e.target.value) || 0)}
              placeholder="0,00"
              className="w-full rounded-lg border border-nexora-border bg-white px-3 py-2.5 text-sm focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-nexora-dark">Itens</h2>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium text-nexora-blue hover:bg-nexora-blue/10"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar item
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {items.map((item, index) => (
            <div key={index} className="rounded-lg border border-nexora-border/50 bg-nexora-bg-secondary/20 p-4">
              <div className="flex items-start gap-3">
                <div className="grid flex-1 gap-3 md:grid-cols-6">
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-nexora-dark">Produto (ID) *</label>
                    <input
                      value={item.product_id}
                      onChange={(e) => updateItem(index, "product_id", e.target.value)}
                      placeholder="UUID do produto"
                      className="w-full rounded-md border border-nexora-border bg-white px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-nexora-dark">Qtd. *</label>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={item.quantity || ""}
                      onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                      className="w-full rounded-md border border-nexora-border bg-white px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-nexora-dark">Preço unit. *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price || ""}
                      onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                      className="w-full rounded-md border border-nexora-border bg-white px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-nexora-dark">Desconto</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.discount || ""}
                      onChange={(e) => updateItem(index, "discount", parseFloat(e.target.value) || 0)}
                      className="w-full rounded-md border border-nexora-border bg-white px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-nexora-dark">Variante (ID)</label>
                    <input
                      value={item.variant_id}
                      onChange={(e) => updateItem(index, "variant_id", e.target.value)}
                      placeholder="Opcional"
                      className="w-full rounded-md border border-nexora-border bg-white px-2 py-1.5 text-sm"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={items.length <= 1}
                  className="mt-5 rounded p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2">
                <input
                  value={item.notes}
                  onChange={(e) => updateItem(index, "notes", e.target.value)}
                  placeholder="Observação do item (opcional)"
                  className="w-full rounded-md border border-nexora-border bg-white px-2 py-1.5 text-xs text-nexora-text-secondary"
                />
              </div>
              <div className="mt-2 text-right text-xs font-medium text-nexora-dark">
                Linha: R$ {(item.quantity * item.unit_price - item.discount).toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="mt-4 flex justify-end">
          <div className="w-full max-w-xs space-y-2 rounded-lg border border-nexora-border/50 bg-nexora-bg-secondary/30 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-nexora-text-secondary">Subtotal</span>
              <span className="font-medium text-nexora-dark">R$ {subtotal.toFixed(2)}</span>
            </div>
            {freightAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-nexora-text-secondary">Frete</span>
                <span className="font-medium text-nexora-dark">R$ {freightAmount.toFixed(2)}</span>
              </div>
            )}
            {additionalCosts > 0 && (
              <div className="flex justify-between">
                <span className="text-nexora-text-secondary">Custos adicionais</span>
                <span className="font-medium text-nexora-dark">R$ {additionalCosts.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-nexora-border pt-2 text-base font-bold">
              <span className="text-nexora-dark">Total</span>
              <span className="text-nexora-dark">R$ {total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes & Terms */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-nexora-dark">Observações</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Observações internas sobre esta ordem…"
            className="mt-3 w-full rounded-lg border border-nexora-border bg-white px-3 py-2.5 text-sm focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
          />
        </div>
        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-nexora-dark">Condições comerciais</h2>
          <textarea
            value={commercialTerms}
            onChange={(e) => setCommercialTerms(e.target.value)}
            rows={3}
            placeholder="Prazo de pagamento, condições de frete, etc."
            className="mt-3 w-full rounded-lg border border-nexora-border bg-white px-3 py-2.5 text-sm focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-nexora-blue px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-nexora-blue/90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isPending ? "Criando…" : "Criar ordem de compra"}
        </button>
        <a
          href="/dashboard/compras/ordens"
          className="inline-flex items-center gap-2 rounded-lg border border-nexora-border bg-white px-6 py-2.5 text-sm font-medium text-nexora-dark transition-colors hover:bg-nexora-bg-secondary"
        >
          <X className="h-4 w-4" />
          Cancelar
        </a>
      </div>
    </form>
  );
}