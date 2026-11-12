import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import ProductForm from "../_components/product-form";
import { createProduct } from "../actions";
import type { CreateProductInput } from "../schemas";

export default function NovoProdutoPage() {
  async function handleSubmit(data: CreateProductInput) {
    "use server";
    return createProduct(data);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/produtos"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-nexora-border text-nexora-text-secondary transition-colors hover:bg-nexora-bg-secondary hover:text-nexora-dark"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-nexora-dark">
            Novo Produto
          </h1>
          <p className="mt-0.5 text-sm text-nexora-text-secondary">
            Preencha os dados para cadastrar um novo produto
          </p>
        </div>
      </div>

      {/* Form */}
      <ProductForm onSubmit={handleSubmit} />
    </div>
  );
}