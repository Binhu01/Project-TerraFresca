"use client";

import QuoteForm from "../_components/quote-form";
import { createQuote } from "../../actions";
import type { CreateQuoteInput } from "../../schemas";

export default function NewQuotePage() {
  const handleSubmit = async (data: CreateQuoteInput) => {
    try {
      const result = await createQuote(data);
      if (result.success && result.id) return { id: result.id };
      return { error: "Erro ao criar orçamento" };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Erro desconhecido" };
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-nexora-dark">
          Novo Orçamento
        </h1>
        <p className="mt-1 text-sm text-nexora-text-secondary">
          Preencha os dados abaixo para criar um novo orçamento de venda.
        </p>
      </div>

      <QuoteForm submitLabel="Criar orçamento" onSubmit={handleSubmit} />
    </div>
  );
}