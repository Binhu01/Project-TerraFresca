"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Search,
} from "lucide-react";
import {
  createOrderSchema,
  type CreateOrderInput,
} from "../../schemas";
import type { OrderWithDetails } from "@/types/sales";
import type { Customer } from "@/types/crm";
import type { SalesChannel } from "@/types/sales";
import { getCustomers } from "../../../clientes/actions";
import { getSalesChannels } from "../../actions";

interface OrderFormProps {
  initialData?: OrderWithDetails;
  submitLabel: string;
  onSubmit: (data: CreateOrderInput) => Promise<{ error?: string; id?: string }>;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export default function OrderForm({
  initialData,
  submitLabel,
  onSubmit,
}: OrderFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Customer search state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Channels state
  const [channels, setChannels] = useState<SalesChannel[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<CreateOrderInput>({
    resolver: zodResolver(createOrderSchema) as never,
    defaultValues: {
      customer_id: initialData?.customer_id ?? "",
      channel_id: initialData?.channel_id ?? "",
      notes: initialData?.notes ?? "",
      items: initialData?.items?.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount,
      })) ?? [{ description: "", quantity: 1, unit_price: 0, discount: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = watch("items");
  const selectedCustomerId = watch("customer_id");
  const selectedChannelId = watch("channel_id");

  // Load channels on mount
  useEffect(() => {
    async function loadChannels() {
      const result = await getSalesChannels();
      if ("channels" in result && result.channels) {
        setChannels(result.channels as SalesChannel[]);
      }
    }
    loadChannels();
  }, []);

  // Load initial customer name for display
  useEffect(() => {
    if (initialData?.customer) {
      setCustomerSearch(initialData.customer.name);
    }
  }, [initialData]);

  // Search customers with debounce
  const searchCustomers = useCallback(
    async (search: string) => {
      setIsLoadingCustomers(true);
      try {
        const result = await getCustomers({ search, pageSize: 20 });
        if ("customers" in result) {
          setCustomers(result.customers);
        }
      } finally {
        setIsLoadingCustomers(false);
      }
    },
    [],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (showCustomerDropdown || !selectedCustomerId) {
        searchCustomers(customerSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, showCustomerDropdown, selectedCustomerId, searchCustomers]);

  // Calculate totals
  const calculateLineTotal = (item: { quantity: number; unit_price: number; discount: number }) => {
    return item.quantity * item.unit_price - item.discount;
  };

  const subtotal = watchedItems?.reduce((sum, item) => {
    if (!item) return sum;
    return sum + item.quantity * item.unit_price;
  }, 0) ?? 0;

  const totalDiscount = watchedItems?.reduce((sum, item) => {
    if (!item) return sum;
    return sum + (item.discount ?? 0);
  }, 0) ?? 0;

  const grandTotal = subtotal - totalDiscount;

  const handleFormSubmit = async (data: CreateOrderInput) => {
    setSubmitError(null);
    setIsSubmitting(true);

    const result = await onSubmit(data);

    setIsSubmitting(false);

    if (result.error) {
      setSubmitError(result.error);
    } else if (result.id) {
      router.push(`/dashboard/vendas/pedidos/${result.id}`);
      router.refresh();
    } else {
      router.push("/dashboard/vendas/pedidos");
      router.refresh();
    }
  };

  const selectCustomer = (customer: Customer) => {
    setValue("customer_id", customer.id);
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
  };

  const clearCustomer = () => {
    setValue("customer_id", "");
    setCustomerSearch("");
    setShowCustomerDropdown(true);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      {/* Error Banner */}
      {submitError && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-medium text-red-800">Erro ao salvar</p>
            <p className="mt-1 text-sm text-red-700">{submitError}</p>
          </div>
        </div>
      )}

      {/* Section: Dados do Pedido */}
      <section className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-nexora-text-secondary">
          Dados do Pedido
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {/* Customer Selector */}
          <div className="relative sm:col-span-2">
            <label
              htmlFor="customer-search"
              className="block text-sm font-medium text-nexora-dark"
            >
              Cliente <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-nexora-text-secondary" />
                <input
                  id="customer-search"
                  type="text"
                  placeholder="Buscar cliente por nome, e-mail ou telefone..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                    if (!e.target.value) {
                      setValue("customer_id", "");
                    }
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                  className="w-full rounded-lg border border-nexora-border py-2 pl-9 pr-3 text-sm text-nexora-dark placeholder:text-nexora-text-secondary focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
                />
              </div>
              {showCustomerDropdown && (
                <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-nexora-border bg-white shadow-lg">
                  {isLoadingCustomers ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-nexora-text-secondary" />
                    </div>
                  ) : customers.length === 0 ? (
                    <p className="px-3 py-4 text-center text-sm text-nexora-text-secondary">
                      Nenhum cliente encontrado
                    </p>
                  ) : (
                    customers.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onMouseDown={() => selectCustomer(customer)}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-nexora-bg-secondary ${
                          selectedCustomerId === customer.id
                            ? "bg-nexora-bg-secondary font-medium text-nexora-blue"
                            : "text-nexora-dark"
                        }`}
                      >
                        <span>{customer.name}</span>
                        {customer.email && (
                          <span className="ml-2 text-xs text-nexora-text-secondary">
                            {customer.email}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {selectedCustomerId && (
              <button
                type="button"
                onClick={clearCustomer}
                className="mt-1 text-xs text-nexora-blue hover:underline"
              >
                Limpar seleção
              </button>
            )}
            {errors.customer_id && (
              <p className="mt-1 text-xs text-red-600">{errors.customer_id.message}</p>
            )}
            <input type="hidden" {...register("customer_id")} />
          </div>

          {/* Channel Selector */}
          <div>
            <label
              htmlFor="channel_id"
              className="block text-sm font-medium text-nexora-dark"
            >
              Canal de Venda
            </label>
            <select
              id="channel_id"
              {...register("channel_id")}
              className="mt-1 w-full rounded-lg border border-nexora-border px-3 py-2 text-sm text-nexora-dark focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            >
              <option value="">Selecione um canal (opcional)</option>
              {channels
                .filter((ch) => ch.is_active)
                .map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </section>

      {/* Section: Itens */}
      <section className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-nexora-text-secondary">
            Itens
          </h2>
          <button
            type="button"
            onClick={() => append({ description: "", quantity: 1, unit_price: 0, discount: 0 })}
            className="inline-flex items-center gap-1.5 rounded-lg border border-nexora-border px-3 py-1.5 text-xs font-medium text-nexora-dark hover:bg-nexora-bg-secondary"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar Item
          </button>
        </div>

        {errors.items?.root && (
          <p className="mt-2 text-xs text-red-600">{errors.items.root.message}</p>
        )}

        <div className="mt-4 space-y-4">
          {fields.map((field, index) => {
            const item = watchedItems?.[index];
            const lineTotal = item ? calculateLineTotal(item) : 0;

            return (
              <div
                key={field.id}
                className="rounded-lg border border-nexora-border bg-nexora-bg p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-3">
                    {/* Description */}
                    <div>
                      <label className="block text-xs font-medium text-nexora-text-secondary">
                        Descrição <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Descrição do produto/serviço"
                        {...register(`items.${index}.description`)}
                        className="mt-1 w-full rounded-lg border border-nexora-border px-3 py-2 text-sm text-nexora-dark placeholder:text-nexora-text-secondary focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
                      />
                      {errors.items?.[index]?.description && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.items[index]?.description?.message}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {/* Quantity */}
                      <div>
                        <label className="block text-xs font-medium text-nexora-text-secondary">
                          Qtd <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                          className="mt-1 w-full rounded-lg border border-nexora-border px-3 py-2 text-sm text-nexora-dark focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
                        />
                        {errors.items?.[index]?.quantity && (
                          <p className="mt-1 text-xs text-red-600">
                            {errors.items[index]?.quantity?.message}
                          </p>
                        )}
                      </div>

                      {/* Unit Price */}
                      <div>
                        <label className="block text-xs font-medium text-nexora-text-secondary">
                          Preço Unit. <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          {...register(`items.${index}.unit_price`, { valueAsNumber: true })}
                          className="mt-1 w-full rounded-lg border border-nexora-border px-3 py-2 text-sm text-nexora-dark focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
                        />
                        {errors.items?.[index]?.unit_price && (
                          <p className="mt-1 text-xs text-red-600">
                            {errors.items[index]?.unit_price?.message}
                          </p>
                        )}
                      </div>

                      {/* Discount */}
                      <div>
                        <label className="block text-xs font-medium text-nexora-text-secondary">
                          Desconto
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          {...register(`items.${index}.discount`, { valueAsNumber: true })}
                          className="mt-1 w-full rounded-lg border border-nexora-border px-3 py-2 text-sm text-nexora-dark focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Line Total & Remove */}
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                      <p className="text-xs text-nexora-text-secondary">Total</p>
                      <p className="text-sm font-semibold text-nexora-dark">
                        {formatCurrency(lineTotal)}
                      </p>
                    </div>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="rounded p-1.5 text-nexora-text-secondary hover:bg-red-50 hover:text-red-600"
                        title="Remover item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Running Total */}
        <div className="mt-6 rounded-lg border border-nexora-border bg-nexora-bg p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-nexora-text-secondary">Subtotal</span>
              <span className="font-medium text-nexora-dark">{formatCurrency(subtotal)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-nexora-text-secondary">Descontos</span>
                <span className="font-medium text-red-600">-{formatCurrency(totalDiscount)}</span>
              </div>
            )}
            <div className="border-t border-nexora-border pt-2">
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-nexora-dark">Total</span>
                <span className="text-lg font-bold text-nexora-blue">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section: Observações */}
      <section className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-nexora-text-secondary">
          Observações
        </h2>
        <div className="mt-4">
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-nexora-dark"
          >
            Notas
          </label>
          <textarea
            id="notes"
            rows={4}
            placeholder="Informações adicionais sobre o pedido..."
            {...register("notes")}
            className="mt-1 w-full resize-y rounded-lg border border-nexora-border px-3 py-2 text-sm text-nexora-dark placeholder:text-nexora-text-secondary focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
          />
        </div>
      </section>

      {/* Submit Button */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isSubmitting}
          className="rounded-lg border border-nexora-border px-4 py-2.5 text-sm font-medium text-nexora-text hover:bg-nexora-bg-secondary disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg bg-nexora-blue px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-nexora-blue/90 disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Salvando..." : submitLabel}
        </button>
      </div>
    </form>
  );
}