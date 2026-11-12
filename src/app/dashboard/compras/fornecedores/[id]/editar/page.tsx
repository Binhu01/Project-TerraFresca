import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSupplierById } from "../../../actions";
import { SupplierForm } from "../../_components/supplier-form";

export default async function EditarFornecedorPage(props: { params: Promise<{ id: string }> }) {
  await headers();
  const { id } = await props.params;
  const supplier = await getSupplierById(id);

  if (!supplier) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/compras/fornecedores/${id}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-nexora-text-secondary transition-colors hover:text-nexora-blue"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para detalhes
      </Link>

      <div>
        <h1 className="font-display text-2xl font-bold text-nexora-dark">Editar fornecedor</h1>
        <p className="mt-1 text-sm text-nexora-text-secondary">
          {supplier.trade_name || supplier.legal_name}
        </p>
      </div>

      <SupplierForm supplier={supplier} />
    </div>
  );
}