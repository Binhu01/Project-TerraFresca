"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const cadastroSchema = z
  .object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    email: z.string().email("E-mail inválido"),
    password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type CadastroForm = z.infer<typeof cadastroSchema>;

export default function CadastroPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CadastroForm>({
    resolver: zodResolver(cadastroSchema),
  });

  async function onSubmit(data: CadastroForm) {
    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.name,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-nexora-bg px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-nexora-border bg-white p-8 shadow-sm">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-nexora-blue font-display text-lg font-bold text-white">
            N
          </div>
          <h1 className="font-display text-2xl font-bold text-nexora-dark">
            Criar conta
          </h1>
          <p className="mt-2 text-sm text-nexora-text-secondary">
            Comece a usar o Nexora gratuitamente
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="mb-1 block text-sm font-medium text-nexora-text"
            >
              Nome completo
            </label>
            <input
              id="name"
              type="text"
              {...register("name")}
              className="w-full rounded-lg border border-nexora-border px-3 py-2 text-sm outline-none transition-colors focus:border-nexora-blue focus:ring-1 focus:ring-nexora-blue"
              placeholder="Seu nome"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-nexora-error">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-nexora-text"
            >
              E-mail
            </label>
            <input
              id="email"
              type="email"
              {...register("email")}
              className="w-full rounded-lg border border-nexora-border px-3 py-2 text-sm outline-none transition-colors focus:border-nexora-blue focus:ring-1 focus:ring-nexora-blue"
              placeholder="seu@email.com"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-nexora-error">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-nexora-text"
            >
              Senha
            </label>
            <input
              id="password"
              type="password"
              {...register("password")}
              className="w-full rounded-lg border border-nexora-border px-3 py-2 text-sm outline-none transition-colors focus:border-nexora-blue focus:ring-1 focus:ring-nexora-blue"
              placeholder="Mínimo 6 caracteres"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-nexora-error">
                {errors.password.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1 block text-sm font-medium text-nexora-text"
            >
              Confirmar senha
            </label>
            <input
              id="confirmPassword"
              type="password"
              {...register("confirmPassword")}
              className="w-full rounded-lg border border-nexora-border px-3 py-2 text-sm outline-none transition-colors focus:border-nexora-blue focus:ring-1 focus:ring-nexora-blue"
              placeholder="Repita a senha"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-nexora-error">
                {errors.confirmPassword.message}
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
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-nexora-blue py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar conta
          </button>
        </form>

        <p className="text-center text-sm text-nexora-text-secondary">
          Já tem conta?{" "}
          <Link
            href="/login"
            className="font-medium text-nexora-blue hover:underline"
          >
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}