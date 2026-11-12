import {
  ArrowLeft,
  Edit,
  Archive,
  Mail,
  Phone,
  MessageCircle,
  Building2,
  Calendar,
  User,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomerById } from "../actions";
import { getInteractions } from "@/lib/crm/interactions";
import InteractionTimeline from "../_components/interaction-timeline";

interface ClienteDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClienteDetailPage({
  params,
}: ClienteDetailPageProps) {
  const { id } = await params;
  const customer = await getCustomerById(id);

  if (!customer) {
    notFound();
  }

  const interactionsResult = await getInteractions({ customerId: id });
  const interactions =
    "interactions" in interactionsResult
      ? (interactionsResult.interactions ?? [])
      : [];

  const formattedInteractions = interactions.map((i: Record<string, unknown>) => ({
    id: i.id as string,
    type: i.type as string,
    description: i.description as string,
    occurred_at: i.occurred_at as string,
    creator_name:
      (i.profiles as { full_name?: string } | null)?.full_name ?? "Desconhecido",
  }));

  const statusLabel = customer.status === "active" ? "Ativo" : "Inativo";
  const statusClasses =
    customer.status === "active"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-gray-100 text-gray-600 border-gray-200";

  const typeLabel = customer.customer_type === "pf" ? "Pessoa Física" : "Pessoa Jurídica";

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/clientes"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-nexora-border text-nexora-text-secondary transition-colors hover:bg-nexora-bg-secondary hover:text-nexora-dark"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-nexora-dark">
              {customer.name}
            </h1>
            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border-blue-200">
              {typeLabel}
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusClasses}`}
            >
              {statusLabel}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-nexora-text-secondary">
            Detalhes do cliente
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/clientes/${id}/editar`}
            className="inline-flex items-center gap-2 rounded-lg border border-nexora-border bg-white px-3 py-2 text-sm font-medium text-nexora-text transition-colors hover:bg-nexora-bg-secondary hover:text-nexora-dark"
          >
            <Edit className="h-4 w-4" />
            Editar
          </Link>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <Archive className="h-4 w-4" />
            Arquivar
          </button>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Dados Cadastrais */}
        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-nexora-text-secondary" />
            <h2 className="text-base font-semibold text-nexora-dark">
              Dados Cadastrais
            </h2>
          </div>
          <dl className="space-y-4">
            <div>
              <dt className="text-xs text-nexora-text-secondary">Tipo</dt>
              <dd className="text-sm font-medium text-nexora-text">{typeLabel}</dd>
            </div>
            <div>
              <dt className="text-xs text-nexora-text-secondary">Documento</dt>
              <dd className="text-sm font-medium text-nexora-text">
                {customer.document || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-nexora-text-secondary">Origem</dt>
              <dd className="text-sm font-medium text-nexora-text">
                {customer.source || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-nexora-text-secondary">Categoria</dt>
              <dd className="text-sm font-medium text-nexora-text">
                {customer.category || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-nexora-text-secondary">Criado em</dt>
              <dd className="text-sm font-medium text-nexora-text">
                {formatDate(customer.created_at)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-nexora-text-secondary">Atualizado em</dt>
              <dd className="text-sm font-medium text-nexora-text">
                {formatDate(customer.updated_at)}
              </dd>
            </div>
          </dl>
        </div>

        {/* Contato */}
        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-nexora-text-secondary" />
            <h2 className="text-base font-semibold text-nexora-dark">Contato</h2>
          </div>
          <dl className="space-y-4">
            <div>
              <dt className="text-xs text-nexora-text-secondary">E-mail</dt>
              <dd className="text-sm font-medium text-nexora-text">
                {customer.email ? (
                  <a
                    href={`mailto:${customer.email}`}
                    className="inline-flex items-center gap-1.5 text-teal-600 hover:underline"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {customer.email}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-nexora-text-secondary">Telefone</dt>
              <dd className="text-sm font-medium text-nexora-text">
                {customer.phone ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-nexora-text-secondary" />
                    {customer.phone}
                  </span>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-nexora-text-secondary">WhatsApp</dt>
              <dd className="text-sm font-medium text-nexora-text">
                {customer.whatsapp ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MessageCircle className="h-3.5 w-3.5 text-nexora-text-secondary" />
                    {customer.whatsapp}
                  </span>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-nexora-text-secondary">
                Contato Principal
              </dt>
              <dd className="text-sm font-medium text-nexora-text">
                {customer.primary_contact_name ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-nexora-text-secondary" />
                    {customer.primary_contact_name}
                  </span>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Notes */}
      {customer.notes && (
        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5 text-nexora-text-secondary" />
            <h2 className="text-base font-semibold text-nexora-dark">
              Observações
            </h2>
          </div>
          <p className="whitespace-pre-wrap text-sm text-nexora-text">
            {customer.notes}
          </p>
        </div>
      )}

      {/* Interactions Timeline */}
      <InteractionTimeline
        interactions={formattedInteractions}
        targetType="customer"
        targetId={id}
      />
    </div>
  );
}