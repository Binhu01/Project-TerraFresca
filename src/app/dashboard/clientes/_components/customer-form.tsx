"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { createCustomerSchema, type CreateCustomerInput } from "../schemas";
import type { Customer } from "@/types/crm";

interface CustomerFormProps {
  initialData?: Customer;
  onSubmit: (data: CreateCustomerInput) => Promise<{ error?: string }>;
  submitLabel: string;
}

const SOURCE_OPTIONS = [
  { value: "", label: "Selecione a origem" },
  { value: "Site", label: "Site" },
  { value: "Indicação", label: "Indicação" },
  { value: "WhatsApp", label: "WhatsApp" },
  { value: "Instagram", label: "Instagram" },
  { value: "Telefone", label: "Telefone" },
  { value: "Outro", label: "Outro" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Ativo" },
  { value: "inactive", label: "Inativo" },
];

export default function CustomerForm({
  initialData,
  onSubmit,
  submitLabel,
}: CustomerFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateCustomerInput>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      customer_type: initialData?.customer_type ?? "pf",
      document: initialData?.document ?? "",
      email: initialData?.email ?? "",
      phone: initialData?.phone ?? "",
      whatsapp: initialData?.whatsapp ?? "",
      primary_contact_name: initialData?.primary_contact_name ?? "",
      source: initialData?.source ?? "",
      category: initialData?.category ?? "",
      status: initialData?.status ?? "active",
      notes: initialData?.notes ?? "",
    },
  });

  const customerType = watch("customer_type");

  const handleFormSubmit = async (data: CreateCustomerInput) => {
    setSubmitError(null);
    setIsSubmitting(true);

    const result = await onSubmit(data);

    setIsSubmitting(false);

    if (result.error) {
      setSubmitError(result.error);
    } else {
      router.push("/dashboard/clientes");
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

      {/* Section: Dados Principais */}
      <section className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-nexora-text-secondary">
          Dados Principais
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
              placeholder="Nome completo ou razão social"
              {...register("name")}
              className="mt-1 w-full rounded-lg border border-nexora-border px-3 py-2 text-sm text-nexora-dark placeholder:text-nexora-text-secondary focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Customer Type */}
          <div>
            <label className="block text-sm font-medium text-nexora-dark">
              Tipo de Cliente
            </label>
            <div className="mt-2 flex gap-6">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  value="pf"
                  {...register("customer_type")}
                  className="h-4 w-4 border-nexora-border text-nexora-blue focus:ring-nexora-blue"
                />
                <span className="text-sm text-nexora-dark">Pessoa Física</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  value="pj"
                  {...register("customer_type")}
                  className="h-4 w-4 border-nexora-border text-nexora-blue focus:ring-nexora-blue"
                />
                <span className="text-sm text-nexora-dark">
                  Pessoa Jurídica
                </span>
              </label>
            </div>
          </div>

          {/* Document (conditional) */}
          <div>
            <label
              htmlFor="document"
              className="block text-sm font-medium text-nexora-dark"
            >
              {customerType === "pj" ? "CNPJ" : "CPF"}
            </label>
            <input
              id="document"
              type="text"
              placeholder={
                customerType === "pj"
                  ? "00.000.000/0000-00"
                  : "000.000.000-00"
              }
              {...register("document")}
              className="mt-1 w-full rounded-lg border border-nexora-border px-3 py-2 text-sm text-nexora-dark placeholder:text-nexora-text-secondary focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue sm:w-64"
            />
            <p className="mt-1 text-xs text-nexora-text-secondary">
              {customerType === "pj"
                ? "Digite apenas números (14 dígitos)"
                : "Digite apenas números (11 dígitos)"}
            </p>
            {errors.document && (
              <p className="mt-1 text-xs text-red-600">
                {errors.document.message}
              </p>
            )}
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
              placeholder="cliente@exemplo.com"
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

          {/* Primary Contact Name */}
          <div>
            <label
              htmlFor="primary_contact_name"
              className="block text-sm font-medium text-nexora-dark"
            >
              Contato Principal
            </label>
            <input
              id="primary_contact_name"
              type="text"
              placeholder="Nome do responsável"
              {...register("primary_contact_name")}
              className="mt-1 w-full rounded-lg border border-nexora-border px-3 py-2 text-sm text-nexora-dark placeholder:text-nexora-text-secondary focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            />
          </div>
        </div>
      </section>

      {/* Section: Classificação */}
      <section className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-nexora-text-secondary">
          Classificação
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
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

          {/* Category */}
          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-nexora-dark"
            >
              Categoria
            </label>
            <input
              id="category"
              type="text"
              placeholder="Ex: Varejo, Serviços..."
              {...register("category")}
              className="mt-1 w-full rounded-lg border border-nexora-border px-3 py-2 text-sm text-nexora-dark placeholder:text-nexora-text-secondary focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            />
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-nexora-dark"
            >
              Status
            </label>
            <select
              id="status"
              {...register("status")}
              className="mt-1 w-full rounded-lg border border-nexora-border px-3 py-2 text-sm text-nexora-dark focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Section: Observações */}
      <section className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-nexora-text-secondary">
          Observações
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
            placeholder="Informações adicionais sobre o cliente..."
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