import { CreditCard, Check, X } from "lucide-react";
import { getAllPlans } from "@/app/dashboard/billing/actions";

export const instant = false;

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function AdminPlanosPage() {
  const plans = await getAllPlans();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#0B1220]">Catálogo de Planos</h2>
        <span className="text-sm text-slate-500">{plans.length} planos</span>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const version = plan.current_version;
          return (
            <div
              key={plan.id}
              className={`relative rounded-xl border p-6 shadow-sm ${
                plan.is_active
                  ? "border-[#E4E9F2] bg-white"
                  : "border-dashed border-slate-300 bg-slate-50 opacity-70"
              }`}
            >
              {plan.is_featured && (
                <span className="absolute -top-2.5 left-4 rounded-full bg-[#3563F5] px-3 py-0.5 text-xs font-bold text-white">
                  Destaque
                </span>
              )}

              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#0B1220]">{plan.name}</h3>
                  <p className="text-xs text-slate-400">slug: {plan.slug}</p>
                </div>
                <CreditCard className="h-5 w-5 text-[#3563F5]" />
              </div>

              <p className="mt-2 text-sm text-slate-500">
                {plan.description ?? "Sem descrição."}
              </p>

              {version && (
                <div className="mt-4 space-y-2 border-t border-[#E4E9F2] pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Mensal</span>
                    <span className="font-semibold text-[#0B1220]">
                      {version.monthly_price === 0
                        ? "Grátis"
                        : BRL.format(version.monthly_price)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Anual</span>
                    <span className="font-semibold text-[#0B1220]">
                      {version.annual_price === 0
                        ? "—"
                        : BRL.format(version.annual_price)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Trial</span>
                    <span className="font-medium text-[#0B1220]">
                      {version.trial_days > 0 ? `${version.trial_days} dias` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Versão</span>
                    <span className="font-mono text-xs text-slate-500">v{version.version}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">MP Plan ID</span>
                    <span className="max-w-[120px] truncate font-mono text-xs text-slate-400">
                      {version.external_plan_id ?? "—"}
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    plan.is_active
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {plan.is_active ? (
                    <>
                      <Check className="h-3 w-3" /> Ativo
                    </>
                  ) : (
                    <>
                      <X className="h-3 w-3" /> Inativo
                    </>
                  )}
                </span>
                <span className="text-xs text-slate-400">
                  Ordem: {plan.display_order}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {plans.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#E4E9F2] bg-white p-12 text-center">
          <CreditCard className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">
            Nenhum plano cadastrado. Use as server actions para criar o catálogo.
          </p>
        </div>
      )}
    </div>
  );
}