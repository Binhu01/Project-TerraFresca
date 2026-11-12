import Link from "next/link";
import { ArrowRight, BarChart3, ShieldCheck, Users } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-nexora-border bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-nexora-blue font-display text-sm font-bold text-white">
              N
            </div>
            <span className="font-display text-xl font-bold text-nexora-dark">
              Nexora
            </span>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/login"
              className="text-sm font-medium text-nexora-text-secondary transition-colors hover:text-nexora-blue"
            >
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="rounded-lg bg-nexora-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
            >
              Criar conta
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="max-w-3xl font-display text-5xl font-bold leading-tight tracking-tight text-nexora-dark sm:text-6xl">
          Gestão que{" "}
          <span className="text-nexora-blue">impulsiona</span>.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-nexora-text-secondary">
          A plataforma completa para gerenciar clientes, vendas, financeiro e
          operações da sua empresa em um só lugar. Simples, segura e escalável.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/cadastro"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-nexora-blue px-6 py-3 text-base font-medium text-white transition-colors hover:bg-blue-600"
          >
            Começar agora
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg border border-nexora-border bg-white px-6 py-3 text-base font-medium text-nexora-text transition-colors hover:bg-nexora-bg-secondary"
          >
            Já tenho conta
          </Link>
        </div>

        {/* Features */}
        <div className="mt-24 grid max-w-5xl gap-8 sm:grid-cols-3">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-nexora-bg-secondary text-nexora-blue">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="font-display text-lg font-semibold text-nexora-dark">
              Gestão de Clientes
            </h3>
            <p className="text-sm text-nexora-text-secondary">
              Organize leads, contatos e histórico de relacionamento.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-nexora-bg-secondary text-nexora-blue">
              <BarChart3 className="h-6 w-6" />
            </div>
            <h3 className="font-display text-lg font-semibold text-nexora-dark">
              Relatórios Inteligentes
            </h3>
            <p className="text-sm text-nexora-text-secondary">
              Indicadores em tempo real para decisões mais assertivas.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-nexora-bg-secondary text-nexora-blue">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="font-display text-lg font-semibold text-nexora-dark">
              Segurança Total
            </h3>
            <p className="text-sm text-nexora-text-secondary">
              Dados protegidos com criptografia e controle de acesso.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-nexora-border bg-white py-8">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-nexora-text-secondary">
          © 2026 Nexora. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}