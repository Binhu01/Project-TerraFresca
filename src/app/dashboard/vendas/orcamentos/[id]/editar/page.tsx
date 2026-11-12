import { notFound } from "next/navigation";
import { getQuoteById, updateQuote } from "../../../actions";
import QuoteForm from "../../_components/quote-form";
import type { CreateQuoteInput } from "../../../schemas";

interface EditQuotePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditQuotePage({ params }: EditQuotePageProps) {
  const { id } = await params;
  const quote = await getQuoteById(id);

  if (!quote) {
    notFound();
  }

  async function handleSubmit(data: CreateQuoteInput) {
    "use server";
    try {
      const res = await updateQuote(id, data);
      if (res.success) return { id };
      return { error: "Erro ao atualizar orçamento" };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Erro desconhecido" };
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-nexora-dark">
          Editar Orçamento
        </h1>
        <p className="mt-1 text-sm text-nexora-text-secondary">
          Orçamento {quote.document_number} — atualize os dados abaixo.
        </p>
      </div>

      <QuoteForm
        initialData={quote}
        submitLabel="Salvar alterações"
        onSubmit={handleSubmit}
      />
    </div>
  );
}