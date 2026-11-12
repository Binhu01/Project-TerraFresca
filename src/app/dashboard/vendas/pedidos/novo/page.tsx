"use client";

import OrderForm from "../_components/order-form";
import { createOrder } from "../../actions";
import type { CreateOrderInput } from "../../schemas";

export default function NewOrderPage() {
  const handleSubmit = async (data: CreateOrderInput) => {
    try {
      const result = await createOrder(data);
      if (result.success && result.id) return { id: result.id };
      return { error: "Erro ao criar pedido" };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Erro desconhecido" };
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-nexora-dark">
          Novo Pedido
        </h1>
        <p className="mt-1 text-sm text-nexora-text-secondary">
          Preencha os dados abaixo para criar um novo pedido de venda.
        </p>
      </div>

      <OrderForm submitLabel="Criar pedido" onSubmit={handleSubmit} />
    </div>
  );
}