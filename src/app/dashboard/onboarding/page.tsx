"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Building2 } from "lucide-react";
import { createOrganization, type CreateOrgInput } from "./actions";

const onboardingSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  slug: z
    .string()
    .min(2, "Identificador deve ter pelo menos 2 caracteres")
    .max(50)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use apenas letras minúsculas, números e hífens"
    ),
});

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export default function OnboardingPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateOrgInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { name: "", slug: "" },
  });

  const slugValue = watch("slug");

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value;
    if (!slugEdited) {
      setValue("slug", generateSlug(name), { shouldValidate: true });
    }
  }

  async function onSubmit(data: CreateOrgInput) {
    setLoading(true);
    setError(null);

    const result = await createOrganization(data);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // Redirect to dashboard after successful creation
    window.location.href = "/dashboard";
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-nexora-bg px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-nexora-border bg-white p-8 shadow-sm">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-nexora-blue/10 text-nexora-blue">
            <Building2 className="h-7 w-7" />
          </div>
          <h1 className="font-display text-2xl font-bold text-nexora-dark">
            Crie sua empresa
          </h1>
          <p className="mt-2 text-sm text-nexora-text-secondary">
            Configure o ambiente da sua organização para começar a usar o Nexora.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label
              htmlFor="name"
              className="mb-1 block text-sm font-medium text-nexora-text"
            >
              Nome da empresa
            </label>
            <input
              id="name"
              type="text"
              {...register("name")}
              onChange={(e) => {
                register("name").onChange(e);
                handleNameChange(e);
              }}
              className="w-full rounded-lg border border-nexora-border px-3 py-2.5 text-sm outline-none transition-colors focus:border-nexora-blue focus:ring-1 focus:ring-nexora-blue"
              placeholder="Ex: Minha Empresa Ltda"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-nexora-error">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="slug"
              className="mb-1 block text-sm font-medium text-nexora-text"
            >
              Identificador
            </label>
            <div className="flex items-center gap-2">
              <span className="shrink-0 rounded-lg border border-nexora-border bg-nexora-bg-secondary px-3 py-2.5 text-sm text-nexora-text-secondary">
                nexora.com/
              </span>
              <input
                id="slug"
                type="text"
                {...register("slug")}
                onFocus={() => setSlugEdited(true)}
                className="w-full rounded-lg border border-nexora-border px-3 py-2.5 text-sm outline-none transition-colors focus:border-nexora-blue focus:ring-1 focus:ring-nexora-blue"
                placeholder="minha-empresa"
              />
            </div>
            {errors.slug ? (
              <p className="mt-1 text-xs text-nexora-error">
                {errors.slug.message}
              </p>
            ) : (
              <p className="mt-1 text-xs text-nexora-text-secondary">
                Usado na URL da sua organização. Pode ser editado.
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-nexora-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !slugValue}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-nexora-blue py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar organização
          </button>
        </form>
      </div>
    </div>
  );
}