import { notFound } from "next/navigation";
import { getOrderById, updateOrder } from "../../../actions";
import OrderForm from "../../_components/order-form";
import type { CreateOrderInput } from "../../../schemas";

interface EditOrderPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditOrderPage({ params }: EditOrderPageProps) {
  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) {
    notFound();
  }

  async function handleSubmit(data: CreateOrderInput) {
    "use server";
    try {
      const res = await updateOrder(id, data);
      if (res.success) return { id };
      return { error: "Erro ao atualizar pedido" };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Erro desconhecido" };
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-nexora-dark">
          Editar Pedido
        </h1>
        <p className="mt-1 text-sm text-nexora-text-secondary">
          Pedido {order.document_number} — atualize os dados abaixo.
        </p>
      </div>

      <OrderForm
        initialData={order}
        submitLabel="Salvar alterações"
        onSubmit={handleSubmit}
      />
    </div>
  );
}