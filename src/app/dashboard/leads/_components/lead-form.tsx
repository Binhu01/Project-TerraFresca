"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { createLeadSchema, type CreateLeadInput } from "../schemas";
import type { Lead, PipelineStage } from "@/types/crm";

interface LeadFormProps {
  initialData?: Lead;
  stages: PipelineStage[];
  onSubmit: (data: CreateLeadInput) => Promise<{ error?: string }>;
  submitLabel: string;
}

const SOURCE_OPTIONS = [
  { value: "", label: "Selecione a origem" },
  { value: "WhatsApp", label: "WhatsApp" },
  { value: "Instagram", label: "Instagram" },
  { value: "Loja física", label: "Loja física" },
  { value: "Site", label: "Site" },
  { value: "Marketplace", label: "Marketplace" },
  { value: "Telefone", label: "Telefone" },
  { value: "Indicação", label: "Indicação" },
  { value: "Outros", label: "Outros" },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: "Aberto", color: "bg-blue-100 text-blue-800" },
  won: { label: "Ganho", color: "bg-green-100 text-green-800" },
  lost: { label: "Perdido", color: "bg-red-100 text-red-800" },
  archived: { label: "Arquivado", color: "bg-gray-100 text-gray-800" },
};

export default function LeadForm({
  initialData,
  stages,
  onSubmit,
  submitLabel,
}: LeadFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!initialData;
  const isWonOrLost =
    isEditing && (initialData.status === "won" || initialData.status === "lost");

  // Filter stages: exclude won/lost for new leads
  const availableStages = isEditing
    ? stages
    : stages.filter((s) => !s.is_won && !s.is_lost);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateLeadInput>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      company_name: initialData?.company_name ?? "",
      email: initialData?.email ?? "",
      phone: initialData?.phone ?? "",
      whatsapp: initialData?.whatsapp ?? "",
      source: initialData?.source ?? "",
      interest: initialData?.interest ?? "",
      estimated_value: initialData?.estimated_value ?? undefined,
      stage_id: initialData?.stage_id ?? availableStages[0]?.id ?? "",
      assigned_to: initialData?.assigned_to ?? "",
      expected_return_at: initialData?.expected_return_at
        ? initialData.expected_return_at.slice(0, 10)
        : "",
      notes: initialData?.notes ?? "",
    },
  });

  const handleFormSubmit = async (data: CreateLeadInput) => {
    setSubmitError(null);
    setIsSubmitting(true);

    const result = await onSubmit(data);

    setIsSubmitting(false);

    if (result.error) {
      setSubmitError(result.error);
    } else {
      if (isEditing && initialData) {
        router.push(`/dashboard/leads/${initialData.id}`);
      } else {
        router.push("/dashboard/leads");
      }
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      {/* Error Banner */}
      {submitError && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-medium text-red-800">Erro ao salvar</p>
            <p className="mt-1 text-sm text-red-700">{submitError}</p>
          </div>
        </div>
      )}

      {/* Won/Lost Status Badge */}
      {isWonOrLost && (
        <div className="flex items-center gap-3 rounded-lg border border-nexora-border bg-nexora-bg-secondary p-4">
          <span className="text-sm font-medium text-nexora-text-secondary">
            Status:
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_LABELS[initialData!.status]?.color ?? "bg-gray-100 text-gray-800"}`}
          >
            {STATUS_LABELS[initialData!.status]?.label ?? initialData!.status}
          </span>
          <span className="text-xs text-nexora-text-secondary">
            Para alterar o estagio, use a acao de mover no quadro Kanban.
          </span>
        </div>
      )}

      {/* Section: Dados do Lead */}
      <section className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-nexora-text-secondary">
          Dados do Lead
        </h2>
        <div className="mt-4 space-y-4">
          {/* Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-nexora-dark"
            >
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              placeholder="Nome do lead"
              {...register("name")}
              className="mt-1 w-full rounded-lg border border-nexora-border px-3 py-2 text-sm text-nexora-dark placeholder:text-nexora-text-secondary focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Company Name */}
          <div>
            <label
              htmlFor="company_name"
              className="block text-sm font-medium text-nexora-dark"
            >
              Empresa
            </label>
            <input
              id="company_name"
              type="text"
              placeholder="Nome da empresa (opcional)"
              {...register("company_name")}
              className="mt-1 w-full rounded-lg border border-nexora-border px-3 py-2 text-sm text-nexora-dark placeholder:text-nexora-text-secondary focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            />
          </div>

          {/* Source */}
          <div>
            <label
              htmlFor="source"
              className="block text-sm font-medium text-nexora-dark"
            >
              Origem
            </label>
            <select
              id="source"
              {...register("source")}
              className="mt-1 w-full rounded-lg border border-nexora-border px-3 py-2 text-sm text-nexora-dark focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            >
              {SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Section: Contato */}
      <section className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-nexora-text-secondary">
          Contato
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-nexora-dark"
            >
              E-mail
            </label>
            <input
              id="email"
              type="email"
              placeholder="lead@exemplo.com"
              {...register("email")}
              className="mt-1 w-full rounded-lg border border-nexora-border px-3 py-2 text-sm text-nexora-dark placeholder:text-nexora-text-secondary focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-nexora-dark"
            >
              Telefone
            </label>
            <input
              id="phone"
              type="tel"
              placeholder="(00) 0000-0000"
              {...register("phone")}
              className="mt-1 w-full rounded-lg border border-nexora-border px-3 py-2 text-sm text-nexora-dark placeholder:text-nexora-text-secondary focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            />
          </div>

          {/* WhatsApp */}
          <div>
            <label
              htmlFor="whatsapp"
              className="block text-sm font-medium text-nexora-dark"
            >
              WhatsApp
            </label>
            <input
              id="whatsapp"
              type="tel"
              placeholder="(00) 00000-0000"
              {...register("whatsapp")}
              className="mt-1 w-full rounded-lg border border-nexora-border px-3 py-2 text-sm text-nexora-dark placeholder:text-nexora-text-secondary focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            />
          </div>
        </div>
      </section>

      {/* Section: Oportunidade */}
      <section className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-nexora-text-secondary">
          Oportunidade
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {/* Interest */}
          <div className="sm:col-span-2">
            <label
              htmlFor="interest"
              className="block text-sm font-medium text-nexora-dark"
            >
              Interesse
            </label>
            <input
              id="interest"
              type="text"
              placeholder="Produto ou servico de interesse"
              {...register("interest")}
              className="mt-1 w-full rounded-lg border border-nexora-border px-3 py-2 text-sm text-nexora-dark placeholder:text-nexora-text-secondary focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            />
          </div>

          {/* Estimated Value */}
          <div>
            <label
              htmlFor="estimated_value"
              className="block text-sm font-medium text-nexora-dark"
            >
              Valor Estimado
            </label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-nexora-text-secondary">
                R$
              </span>
              <input
                id="estimated_value"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                {...register("estimated_value", { valueAsNumber: true })}
                className="w-full rounded-lg border border-nexora-border py-2 pl-9 pr-3 text-sm text-nexora-dark placeholder:text-nexora-text-secondary focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
              />
            </div>
            {errors.estimated_value && (
              <p className="mt-1 text-xs text-red-600">
                {errors.estimated_value.message}
              </p>
            )}
          </div>

          {/* Stage */}
          <div>
            <label
              htmlFor="stage_id"
              className="block text-sm font-medium text-nexora-dark"
            >
              Estagio
            </label>
            {isWonOrLost ? (
              <input
                type="text"
                disabled
                value={
                  stages.find((s) => s.id === initialData?.stage_id)?.name ?? ""
                }
                className="mt-1 w-full cursor-not-allowed rounded-lg border border-nexora-border bg-nexora-bg-secondary px-3 py-2 text-sm text-nexora-text-secondary"
              />
            ) : (
              <select
                id="stage_id"
                {...register("stage_id")}
                className="mt-1 w-full rounded-lg border border-nexora-border px-3 py-2 text-sm text-nexora-dark focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
              >
                {availableStages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            )}
            {errors.stage_id && (
              <p className="mt-1 text-xs text-red-600">
                {errors.stage_id.message}
              </p>
            )}
          </div>

          {/* Assigned To (readonly for now) */}
          <div>
            <label
              htmlFor="assigned_to"
              className="block text-sm font-medium text-nexora-dark"
            >
              Responsavel
            </label>
            <input
              id="assigned_to"
              type="text"
              readOnly
              placeholder="Atribuido automaticamente"
              {...register("assigned_to")}
              className="mt-1 w-full cursor-default rounded-lg border border-nexora-border bg-nexora-bg-secondary px-3 py-2 text-sm text-nexora-text-secondary"
            />
          </div>

          {/* Expected Return Date */}
          <div>
            <label
              htmlFor="expected_return_at"
              className="block text-sm font-medium text-nexora-dark"
            >
              Retorno Esperado
            </label>
            <input
              id="expected_return_at"
              type="date"
              {...register("expected_return_at")}
              className="mt-1 w-full rounded-lg border border-nexora-border px-3 py-2 text-sm text-nexora-dark focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            />
          </div>
        </div>
      </section>

      {/* Section: Observacoes */}
      <section className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-nexora-text-secondary">
          Observacoes
        </h2>
        <div className="mt-4">
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-nexora-dark"
          >
            Notas
          </label>
          <textarea
            id="notes"
            rows={4}
            placeholder="Informacoes adicionais sobre o lead..."
            {...register("notes")}
            className="mt-1 w-full resize-y rounded-lg border border-nexora-border px-3 py-2 text-sm text-nexora-dark placeholder:text-nexora-text-secondary focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
          />
        </div>
      </section>

      {/* Submit Button */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isSubmitting}
          className="rounded-lg border border-nexora-border px-4 py-2.5 text-sm font-medium text-nexora-text hover:bg-nexora-bg-secondary disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg bg-nexora-blue px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-nexora-blue/90 disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Salvando..." : submitLabel}
        </button>
      </div>
    </form>
  );
}