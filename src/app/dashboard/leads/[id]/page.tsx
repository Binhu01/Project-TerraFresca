import {
  ArrowLeft,
  Edit,
  Archive,
  TrendingUp,
  Calendar,
  DollarSign,
  User,
  Building2,
  MessageCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLeadById, getPipelineAndStages } from "../actions";
import { getInteractions } from "@/lib/crm/interactions";
import InteractionTimeline from "../../clientes/_components/interaction-timeline";
import ConvertLeadButton from "../_components/convert-lead-button";

interface LeadDetailPageProps {
  params: Promise<{ id: string }>;
}

const statusConfig: Record<
  string,
  { label: string; classes: string; icon: React.ElementType }
> = {
  open: {
    label: "Aberto",
    classes: "bg-blue-50 text-blue-700 border-blue-200",
    icon: TrendingUp,
  },
  won: {
    label: "Ganho",
    classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  lost: {
    label: "Perdido",
    classes: "bg-red-50 text-red-700 border-red-200",
    icon: XCircle,
  },
  archived: {
    label: "Arquivado",
    classes: "bg-gray-100 text-gray-600 border-gray-200",
    icon: Archive,
  },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = await params;

  const [lead, pipelineData, interactionsResult] = await Promise.all([
    getLeadById(id),
    getPipelineAndStages(),
    getInteractions({ leadId: id }),
  ]);

  if (!lead) {
    notFound();
  }

  const interactions =
    "interactions" in interactionsResult
      ? (interactionsResult.interactions ?? [])
      : [];

  const formattedInteractions = interactions.map(
    (i: Record<string, unknown>) => ({
      id: i.id as string,
      type: i.type as string,
      description: i.description as string,
      occurred_at: i.occurred_at as string,
      creator_name:
        (i.profiles as { full_name?: string } | null)?.full_name ??
        "Desconhecido",
    })
  );

  const status = statusConfig[lead.status] ?? statusConfig.open;
  const StatusIcon = status.icon;

  // Resolve assigned_to user name from pipeline stages query is not available,
  // so we display the raw ID or a placeholder. In production this would join profiles.
  const assignedToName = lead.assigned_to ? "Responsável atribuído" : "Não atribuído";

  const isConverted = Boolean(lead.converted_customer_id);
  const canConvert = lead.status === "won" && !isConverted;

  return (
    <div className="space-y-6">
      {/* Back link + Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/leads"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-nexora-border text-nexora-text-secondary transition-colors hover:bg-nexora-bg-secondary hover:text-nexora-dark"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold text-nexora-dark">
                {lead.name}
              </h1>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${status.classes}`}
              >
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </span>
            </div>
            {lead.company_name && (
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-nexora-text-secondary">
                <Building2 className="h-3.5 w-3.5" />
                {lead.company_name}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/leads/${id}/editar`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-nexora-border bg-white px-3 py-2 text-sm font-medium text-nexora-text transition-colors hover:bg-nexora-bg-secondary hover:text-nexora-dark"
          >
            <Edit className="h-4 w-4" />
            Editar
          </Link>
          {!lead.archived_at && (
            <form action={`/dashboard/leads/${id}/arquivar`} method="post">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg border border-nexora-border bg-white px-3 py-2 text-sm font-medium text-nexora-text transition-colors hover:bg-nexora-bg-secondary hover:text-nexora-dark"
              >
                <Archive className="h-4 w-4" />
                Arquivar
              </button>
            </form>
          )}
          {canConvert && (
            <ConvertLeadButton
              leadId={lead.id}
              leadName={lead.name}
              leadEmail={lead.email}
              leadPhone={lead.phone}
            />
          )}
        </div>
      </div>

      {/* Converted banner */}
      {isConverted && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-sm font-medium text-emerald-800">
            Lead convertido em cliente.{" "}
            <Link
              href={`/dashboard/clientes/${lead.converted_customer_id}`}
              className="underline decoration-emerald-600/40 underline-offset-2 hover:decoration-emerald-600"
            >
              Ver página do cliente
            </Link>
          </p>
        </div>
      )}

      {/* Info grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Oportunidade */}
        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-teal-600" />
            <h2 className="text-base font-semibold text-nexora-dark">
              Oportunidade
            </h2>
          </div>
          <dl className="space-y-4">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-nexora-text-secondary">
                Estágio
              </dt>
              <dd className="mt-1 text-sm font-medium text-nexora-dark">
                {lead.stage?.name ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-nexora-text-secondary">
                Origem
              </dt>
              <dd className="mt-1 text-sm text-nexora-text">
                {lead.source || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-nexora-text-secondary">
                Interesse
              </dt>
              <dd className="mt-1 text-sm text-nexora-text">
                {lead.interest || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-nexora-text-secondary">
                Valor estimado
              </dt>
              <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium text-nexora-dark">
                <DollarSign className="h-4 w-4 text-teal-600" />
                {lead.estimated_value != null
                  ? formatCurrency(lead.estimated_value)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-nexora-text-secondary">
                Retorno esperado
              </dt>
              <dd className="mt-1 flex items-center gap-1.5 text-sm text-nexora-text">
                <Calendar className="h-4 w-4 text-nexora-text-secondary" />
                {lead.expected_return_at
                  ? formatDate(lead.expected_return_at)
                  : "—"}
              </dd>
            </div>
          </dl>
        </div>

        {/* Right: Contato */}
        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-teal-600" />
            <h2 className="text-base font-semibold text-nexora-dark">
              Contato
            </h2>
          </div>
          <dl className="space-y-4">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-nexora-text-secondary">
                E-mail
              </dt>
              <dd className="mt-1 flex items-center gap-1.5 text-sm text-nexora-text">
                <MessageCircle className="h-4 w-4 text-nexora-text-secondary" />
                {lead.email ? (
                  <a
                    href={`mailto:${lead.email}`}
                    className="text-teal-600 hover:underline"
                  >
                    {lead.email}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-nexora-text-secondary">
                Telefone
              </dt>
              <dd className="mt-1 text-sm text-nexora-text">
                {lead.phone || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-nexora-text-secondary">
                WhatsApp
              </dt>
              <dd className="mt-1 text-sm text-nexora-text">
                {lead.whatsapp ? (
                  <a
                    href={`https://wa.me/${lead.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-600 hover:underline"
                  >
                    {lead.whatsapp}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-nexora-text-secondary">
                Responsável
              </dt>
              <dd className="mt-1 flex items-center gap-1.5 text-sm text-nexora-text">
                <User className="h-4 w-4 text-nexora-text-secondary" />
                {assignedToName}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Notes */}
      {lead.notes && (
        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-nexora-dark">
            Observações
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-nexora-text">
            {lead.notes}
          </p>
        </div>
      )}

      {/* Interaction Timeline */}
      <InteractionTimeline
        interactions={formattedInteractions}
        targetType="lead"
        targetId={lead.id}
      />
    </div>
  );
}