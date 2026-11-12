import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSuppliers } from "../../actions";
import { PurchaseOrderForm } from "../_components/purchase-order-form";

export default async function NovaOrdemPage(props: {
  searchParams: Promise<{ supplier_id?: string }>;
}) {
  await headers();
  const params = await props.searchParams;
  const preselectedSupplierId = params.supplier_id ?? undefined;

  // Fetch active suppliers for the form dropdown
  const { suppliers } = await getSuppliers({ status: "active", page: 1, perPage: 200 });

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/compras/ordens"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-nexora-text-secondary transition-colors hover:text-nexora-blue"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para ordens
      </Link>

      <div>
        <h1 className="font-display text-2xl font-bold text-nexora-dark">Nova ordem de compra</h1>
        <p className="mt-1 text-sm text-nexora-text-secondary">
          Crie uma ordem de compra vinculada a um fornecedor e adicione os itens desejados.
        </p>
      </div>

      <PurchaseOrderForm
        suppliers={suppliers}
        preselectedSupplierId={preselectedSupplierId}
      />
    </div>
  );
}