import { ShieldCheck, Search } from "lucide-react";
import { adminGetAuditLogs } from "@/app/dashboard/billing/actions";

export const instant = false;

export default async function AdminAuditPage() {
  const logs = await adminGetAuditLogs(200);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0B1220]">Audit Log da Plataforma</h2>
          <p className="mt-1 text-sm text-slate-500">
            Registro imutável de todas as operações administrativas · {logs.length} eventos
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#E4E9F2] bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E4E9F2] bg-slate-50">
              <th className="px-4 py-3 text-left font-semibold text-[#0B1220]">Data/Hora</th>
              <th className="px-4 py-3 text-left font-semibold text-[#0B1220]">Usuário</th>
              <th className="px-4 py-3 text-left font-semibold text-[#0B1220]">Ação</th>
              <th className="px-4 py-3 text-left font-semibold text-[#0B1220]">Recurso</th>
              <th className="px-4 py-3 text-left font-semibold text-[#0B1220]">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                  <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                  Nenhum evento de auditoria registrado.
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const profile = log.profiles as Record<string, unknown> | null;
                const userName = (profile?.full_name as string) ?? (profile?.email as string) ?? log.actor_user_id.slice(0, 8);
                const metadata = log.metadata as Record<string, unknown>;
                const metaStr = metadata && Object.keys(metadata).length > 0
                  ? JSON.stringify(metadata, null, 0).slice(0, 80)
                  : "—";

                return (
                  <tr key={log.id} className="border-b border-[#E4E9F2] last:border-0 hover:bg-slate-50/50">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {new Date(log.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 font-medium text-[#0B1220]">{userName}</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-[#3563F5]/10 px-2 py-0.5 text-xs font-semibold text-[#3563F5]">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="text-xs text-slate-400">{log.resource_type}</span>
                      {log.resource_id && (
                        <span className="ml-1 font-mono text-xs text-slate-500">
                          {log.resource_id.slice(0, 8)}…
                        </span>
                      )}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 font-mono text-xs text-slate-400" title={metaStr}>
                      {metaStr}
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