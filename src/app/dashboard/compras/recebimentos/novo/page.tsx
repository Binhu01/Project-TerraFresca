import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPurchaseOrderById } from "../../actions";
import { ReceiptConfirmationForm } from "../_components/receipt-confirmation-form";

export default async function NovoRecebimentoPage(props: {
  searchParams: Promise<{ order_id?: string }>;
}) {
  await headers();
  const params = await props.searchParams;
  const orderId = params.order_id;

  if (!orderId) {
    notFound();
  }

  const order = await getPurchaseOrderById(orderId);

  if (!order) {
    notFound();
  }

  // Filter items that still have pending quantities
  const pendingItems = order.items.filter(
    (item) => item.quantity_ordered - item.quantity_received - item.quantity_cancelled > 0,
  );

  if (pendingItems.length === 0) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/compras/ordens/${order.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-nexora-text-secondary transition-colors hover:text-nexora-blue"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para ordem {order.purchase_number}
      </Link>

      <div>
        <h1 className="font-display text-2xl font-bold text-nexora-dark">Registrar recebimento</h1>
        <p className="mt-1 text-sm text-nexora-text-secondary">
          Confirme a entrada de mercadorias da ordem{" "}
          <span className="font-semibold text-nexora-dark">{order.purchase_number}</span> ·{" "}
          {order.supplier_name ?? "Fornecedor"}
        </p>
      </div>

      <ReceiptConfirmationForm order={order} pendingItems={pendingItems} />
    </div>
  );
}