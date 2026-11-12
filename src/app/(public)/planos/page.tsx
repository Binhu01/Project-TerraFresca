import type { Metadata } from "next";
import Link from "next/link";
import { Check, X, Sparkles, ArrowRight } from "lucide-react";
import { getActivePlans, getPlanEntitlements } from "@/app/dashboard/billing/actions";

export const instant = false;

export const metadata: Metadata = {
  title: "Planos e Preços — Nexora",
  description:
    "Escolha o plano ideal para sua empresa. Do MEI ao enterprise, a Nexora escala com você.",
};

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// Feature labels for the comparison table
const FEATURE_LABELS: Record<string, string> = {
  "team.users": "Usuários na equipe",
  "team.owners": "Proprietários",
  "crm.customers": "Clientes no CRM",
  "crm.leads": "Leads no funil",
  "sales.orders": "Pedidos por mês",
  "inventory.products": "Produtos cadastrados",
  "inventory.warehouses": "Depósitos / locais",
  "finance.receivables": "Contas a receber",
  "finance.payables": "Contas a pagar",
  "reports.basic": "Relatórios básicos",
  "reports.advanced": "Relatórios avançados",
  "ai.assistant": "Assistente IA",
  "integrations.whatsapp": "Integração WhatsApp",
  "integrations.instagram": "Integração Instagram",
  "automations.rules": "Regras de automação",
};

function formatLimit(value: number | null, unit: string | null): string {
  if (value === null || value === 0) return "Ilimitado";
  if (unit === "users" || unit === "items") return String(value);
  if (unit === "month") return `${value}/mês`;
  return String(value);
}

export default async function PlanosPage() {
  const plans = await getActivePlans();

  // Fetch entitlements for each plan's current version
  const plansWithEntitlements = await Promise.all(
    plans.map(async (plan) => {
      const entitlements = plan.current_version
        ? await getPlanEntitlements(plan.current_version.id)
        : [];
      return { ...plan, entitlements };
    }),
  );

  // Collect all feature keys across plans for comparison
  const allFeatureKeys = Array.from(
    new Set(
      plansWithEntitlements.flatMap((p) =>
        p.entitlements.map((e) => e.feature_key),
      ),
    ),
  ).sort();

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0B1220] via-[#1a2744] to-[#0B1220] py-24 text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-[#3563F5] blur-[128px]" />
          <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-[#20C5C9] blur-[128px]" />
        </div>
        <div className="relative mx-auto max-w-6xl px-6 text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-medium text-[#20C5C9]">
            <Sparkles className="h-4 w-4" />
            Plataforma completa para PMEs brasileiras
          </span>
          <h1 className="mt-6 text-5xl font-bold tracking-tight md:text-6xl">
            O plano certo para cada fase
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-xl text-slate-300">
            Comece grátis e escale conforme sua empresa cresce. Sem surpresas,
            sem contratos longos, cancele quando quiser.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link
              href="/auth/sign-up"
              className="inline-flex items-center gap-2 rounded-lg bg-[#3563F5] px-8 py-3.5 text-base font-semibold text-white transition hover:bg-[#2a52d4]"
            >
              Começar grátis
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contato"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-8 py-3.5 text-base font-semibold text-white transition hover:bg-white/10"
            >
              Falar com vendas
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-8 md:grid-cols-3">
          {plansWithEntitlements.map((plan) => {
            const isFeatured = plan.is_featured;
            const price = plan.current_version?.monthly_price ?? 0;
            const annualPrice = plan.current_version?.annual_price ?? 0;
            const trialDays = plan.current_version?.trial_days ?? 0;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border p-8 ${
                  isFeatured
                    ? "border-[#3563F5] bg-white shadow-xl ring-1 ring-[#3563F5]/30"
                    : "border-[#E4E9F2] bg-white shadow-sm"
                }`}
              >
                {isFeatured && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-[#3563F5] px-4 py-1 text-xs font-bold uppercase tracking-wide text-white">
                    Mais popular
                  </div>
                )}

                <h3 className="text-xl font-bold text-[#0B1220]">
                  {plan.name}
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {plan.description ?? "Para empresas que estão começando."}
                </p>

                <div className="mt-6">
                  <span className="text-4xl font-bold text-[#0B1220]">
                    {price === 0 ? "Grátis" : BRL.format(price)}
                  </span>
                  {price > 0 && (
                    <span className="text-sm text-slate-500">/mês</span>
                  )}
                </div>

                {annualPrice > 0 && (
                  <p className="mt-1 text-xs text-slate-400">
                    ou {BRL.format(annualPrice / 12)}/mês no plano anual
                  </p>
                )}

                {trialDays > 0 && (
                  <p className="mt-2 text-xs font-medium text-[#20C5C9]">
                    {trialDays} dias grátis para testar
                  </p>
                )}

                <ul className="mt-8 flex-1 space-y-3">
                  {plan.entitlements
                    .filter((e) => e.is_enabled)
                    .slice(0, 8)
                    .map((e) => (
                      <li
                        key={e.feature_key}
                        className="flex items-start gap-3 text-sm text-slate-600"
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#20C5C9]" />
                        <span>
                          <span className="font-medium text-[#0B1220]">
                            {formatLimit(e.limit_value, e.limit_unit)}
                          </span>{" "}
                          {FEATURE_LABELS[e.feature_key] ?? e.feature_key}
                        </span>
                      </li>
                    ))}
                </ul>

                <Link
                  href="/auth/sign-up"
                  className={`mt-8 block rounded-lg py-3 text-center text-sm font-semibold transition ${
                    isFeatured
                      ? "bg-[#3563F5] text-white hover:bg-[#2a52d4]"
                      : "border border-[#E4E9F2] bg-white text-[#0B1220] hover:bg-slate-50"
                  }`}
                >
                  {price === 0 ? "Começar grátis" : "Começar teste grátis"}
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* Comparison Table */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <h2 className="mb-10 text-center text-3xl font-bold text-[#0B1220]">
          Compare os planos em detalhe
        </h2>

        <div className="overflow-x-auto rounded-2xl border border-[#E4E9F2] bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-[#E4E9F2] bg-slate-50">
                <th className="px-6 py-4 text-left font-semibold text-[#0B1220]">
                  Recurso
                </th>
                {plansWithEntitlements.map((plan) => (
                  <th
                    key={plan.id}
                    className={`px-6 py-4 text-center font-semibold ${
                      plan.is_featured ? "text-[#3563F5]" : "text-[#0B1220]"
                    }`}
                  >
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allFeatureKeys.map((key, i) => (
                <tr
                  key={key}
                  className={
                    i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                  }
                >
                  <td className="px-6 py-3 font-medium text-[#0B1220]">
                    {FEATURE_LABELS[key] ?? key}
                  </td>
                  {plansWithEntitlements.map((plan) => {
                    const ent = plan.entitlements.find(
                      (e) => e.feature_key === key,
                    );
                    if (!ent || !ent.is_enabled) {
                      return (
                        <td key={plan.id} className="px-6 py-3 text-center">
                          <X className="mx-auto h-4 w-4 text-slate-300" />
                        </td>
                      );
                    }
                    return (
                      <td
                        key={plan.id}
                        className="px-6 py-3 text-center font-medium text-[#0B1220]"
                      >
                        {formatLimit(ent.limit_value, ent.limit_unit)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ Teaser */}
      <section className="border-t border-[#E4E9F2] bg-white py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-[#0B1220]">
            Ainda tem dúvidas?
          </h2>
          <p className="mt-4 text-slate-500">
            Nossa equipe está pronta para ajudar você a escolher o melhor plano
            para sua realidade.
          </p>
          <Link
            href="/contato"
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-[#E4E9F2] px-6 py-3 text-sm font-semibold text-[#0B1220] transition hover:bg-slate-50"
          >
            Falar com um especialista
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}