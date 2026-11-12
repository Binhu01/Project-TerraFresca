"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginForm) {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (signInError) {
      setError(signInError.message);
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
            Entrar no Nexora
          </h1>
          <p className="mt-2 text-sm text-nexora-text-secondary">
            Acesse sua conta para continuar
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-nexora-error">
                {errors.password.message}
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
            Entrar
          </button>
        </form>

        <p className="text-center text-sm text-nexora-text-secondary">
          Não tem conta?{" "}
          <Link
            href="/cadastro"
            className="font-medium text-nexora-blue hover:underline"
          >
            Criar conta grátis
          </Link>
        </p>
      </div>
    </div>
  );
}