import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import CustomerForm from "../_components/customer-form";
import { createCustomer } from "../actions";
import type { CreateCustomerInput } from "../schemas";

export default function NovoClientePage() {
  async function handleSubmit(data: CreateCustomerInput) {
    "use server";
    const result = await createCustomer(data);
    if (result.error) {
      return { error: result.error };
    }
    return {};
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/clientes"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-nexora-border text-nexora-text-secondary transition-colors hover:bg-nexora-bg-secondary hover:text-nexora-dark"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-nexora-dark">
            Novo Cliente
          </h1>
          <p className="mt-0.5 text-sm text-nexora-text-secondary">
            Preencha os dados para cadastrar um novo cliente
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl">
        <CustomerForm
          onSubmit={handleSubmit}
          submitLabel="Criar cliente"
        />
      </div>
    </div>
  );
}