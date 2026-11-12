import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SupplierForm } from "../_components/supplier-form";

export default async function NovoFornecedorPage() {
  await headers();

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/compras/fornecedores"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-nexora-text-secondary transition-colors hover:text-nexora-blue"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para fornecedores
      </Link>

      <div>
        <h1 className="font-display text-2xl font-bold text-nexora-dark">Novo fornecedor</h1>
        <p className="mt-1 text-sm text-nexora-text-secondary">
          Cadastre um novo fornecedor para vincular a ordens de compra.
        </p>
      </div>

      <SupplierForm />
    </div>
  );
}