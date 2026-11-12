import { headers } from "next/headers";
import Link from "next/link";
import {
  Sparkles,
  MessageSquarePlus,
  Settings,
  AlertTriangle,
  TrendingUp,
  Package,
  DollarSign,
  Users,
  CheckSquare,
  ShoppingCart,
} from "lucide-react";
import { getAiStatus, getConversations, getInsights } from "./actions";

const SUGGESTED_QUESTIONS = [
  { icon: TrendingUp, text: "Como estão as vendas da empresa?", color: "text-green-600 bg-green-50" },
  { icon: Package, text: "Quais produtos precisam de reposição?", color: "text-orange-600 bg-orange-50" },
  { icon: DollarSign, text: "Quais são nossas despesas deste mês?", color: "text-red-600 bg-red-50" },
  { icon: Users, text: "Quais clientes precisam de acompanhamento?", color: "text-blue-600 bg-blue-50" },
  { icon: CheckSquare, text: "Existem contas vencidas?", color: "text-amber-600 bg-amber-50" },
  { icon: ShoppingCart, text: "Quais são os pedidos em andamento?", color: "text-purple-600 bg-purple-50" },
];

export default async function IntelligencePage() {
  await headers();

  const [status, conversations, insights] = await Promise.all([
    getAiStatus(),
    getConversations().catch(() => []),
    getInsights("active").catch(() => []),
  ]);

  if (status.needs_setup) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-nexora-dark">Nexora Intelligence</h1>
          <p className="mt-1 text-sm text-nexora-text-secondary">
            Assistente empresarial com inteligência artificial integrado à plataforma.
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-600" />
          <h2 className="mt-4 font-display text-lg font-semibold text-amber-900">
            Configuração pendente
          </h2>
          <p className="mt-2 text-sm text-amber-800">
            {!status.is_configured
              ? "A variável de ambiente ANTHROPIC_API_KEY não está configurada no servidor. Configure-a para ativar o Nexora Intelligence."
              : "O Nexora Intelligence está desativado para esta organização. Ative-o nas configurações."}
          </p>
          {["OWNER", "ADMIN"].includes(status.role ?? "") && (
            <Link
              href="/dashboard/intelligence/configuracoes"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700"
            >
              <Settings className="h-4 w-4" />
              Ir para configurações
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-nexora-blue to-nexora-cyan shadow-md">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-nexora-dark">Nexora Intelligence</h1>
            <p className="text-xs text-nexora-text-secondary">
              Assistente empresarial · {conversations.length} conversa{conversations.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/intelligence/configuracoes"
            className="inline-flex items-center gap-1.5 rounded-lg border border-nexora-border bg-white px-4 py-2 text-sm font-medium text-nexora-dark transition-colors hover:bg-nexora-bg-secondary"
          >
            <Settings className="h-4 w-4" />
            Configurações
          </Link>
          <Link
            href="/dashboard/intelligence/novo"
            className="inline-flex items-center gap-1.5 rounded-lg bg-nexora-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <MessageSquarePlus className="h-4 w-4" />
            Nova conversa
          </Link>
        </div>
      </div>

      {/* Insights Section */}
      {insights.length > 0 && (
        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-nexora-dark">Insights recentes</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {insights.slice(0, 6).map((insight) => (
              <div
                key={insight.id}
                className="rounded-lg border border-nexora-border bg-nexora-bg-secondary/30 p-4 transition-colors hover:bg-nexora-bg-secondary/60"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="rounded-full bg-nexora-blue/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-nexora-blue">
                    {insight.insight_type.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] text-nexora-text-secondary">
                    {new Date(insight.generated_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <h3 className="mt-2 text-sm font-medium text-nexora-dark">{insight.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-nexora-text-secondary">{insight.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Questions */}
      <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-nexora-dark">Perguntas sugeridas</h2>
        <p className="mt-1 text-xs text-nexora-text-secondary">
          Clique em uma pergunta para iniciar uma conversa com o Nexora Intelligence.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SUGGESTED_QUESTIONS.map((q) => {
            const Icon = q.icon;
            return (
              <Link
                key={q.text}
                href={`/dashboard/intelligence/novo?q=${encodeURIComponent(q.text)}`}
                className={`group flex items-center gap-3 rounded-lg border border-nexora-border p-4 transition-all hover:border-nexora-blue/30 hover:shadow-sm ${q.color}`}
              >
                <Icon className="h-5 w-5 shrink-0 opacity-70" />
                <span className="text-sm font-medium text-nexora-dark group-hover:text-nexora-blue">
                  {q.text}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Conversations */}
      {conversations.length > 0 && (
        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-nexora-dark">Conversas recentes</h2>
          <div className="mt-4 space-y-2">
            {conversations.slice(0, 10).map((conv) => (
              <Link
                key={conv.id}
                href={`/dashboard/intelligence/${conv.id}`}
                className="flex items-center justify-between rounded-lg border border-nexora-border p-4 transition-colors hover:bg-nexora-bg-secondary/30"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-nexora-dark">{conv.title}</p>
                  <p className="text-xs text-nexora-text-secondary">
                    {new Date(conv.updated_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <MessageSquarePlus className="h-4 w-4 shrink-0 text-nexora-text-secondary" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}