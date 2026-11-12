import { Search } from "lucide-react";
import { adminGetOrganizations } from "@/app/dashboard/billing/actions";

export const instant = false;

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  trialing: "bg-blue-100 text-blue-700",
  past_due: "bg-amber-100 text-amber-700",
  canceled: "bg-red-100 text-red-700",
  paused: "bg-slate-100 text-slate-600",
};

export default async function AdminOrganizacoesPage() {
  const orgs = await adminGetOrganizations();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#0B1220]">Organizações</h2>
        <span className="text-sm text-slate-500">{orgs.length} registros</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#E4E9F2] bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E4E9F2] bg-slate-50">
              <th className="px-4 py-3 text-left font-semibold text-[#0B1220]">Nome</th>
              <th className="px-4 py-3 text-left font-semibold text-[#0B1220]">Slug</th>
              <th className="px-4 py-3 text-left font-semibold text-[#0B1220]">Plano</th>
              <th className="px-4 py-3 text-left font-semibold text-[#0B1220]">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-[#0B1220]">Criada em</th>
            </tr>
          </thead>
          <tbody>
            {orgs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  Nenhuma organização encontrada.
                </td>
              </tr>
            ) : (
              orgs.map((org) => {
                const sub = Array.isArray(org.subscriptions) ? org.subscriptions[0] : org.subscriptions;
                const subRec = sub as Record<string, unknown> | null;
                const pv = subRec?.subscription_plan_versions as Record<string, unknown> | null;
                const sp = pv?.subscription_plans as Record<string, unknown> | null;
                const planName = typeof sp?.name === "string" ? sp.name : "—";
                const status = typeof subRec?.status === "string" ? subRec.status : undefined;
                const statusColor = status ? STATUS_COLORS[status] ?? "bg-slate-100 text-slate-600" : "bg-slate-100 text-slate-600";

                return (
                  <tr key={org.id} className="border-b border-[#E4E9F2] last:border-0">
                    <td className="px-4 py-3 font-medium text-[#0B1220]">{org.name}</td>
                    <td className="px-4 py-3 text-slate-500">{org.slug}</td>
                    <td className="px-4 py-3 text-[#0B1220]">{planName}</td>
                    <td className="px-4 py-3">
                      {status ? (
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor}`}>
                          {status.replace(/_/g, " ")}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(org.created_at).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}