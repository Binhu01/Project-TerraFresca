import Link from "next/link";
import { ShieldX, ArrowLeft } from "lucide-react";

export default function AcessoNegadoPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
        <ShieldX className="h-10 w-10 text-red-500" />
      </div>
      <h1 className="mt-6 font-display text-2xl font-bold text-nexora-dark">
        Acesso negado
      </h1>
      <p className="mt-2 max-w-md text-sm text-nexora-text-secondary">
        Você não tem permissão para acessar esta página. Entre em contato com um
        administrador da sua organização caso acredite que isso seja um erro.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-nexora-blue px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao Dashboard
      </Link>
    </div>
  );
}