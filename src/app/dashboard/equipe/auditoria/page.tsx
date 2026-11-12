import { headers } from "next/headers";
import Link from "next/link";
import { ScrollText, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { getAuditLogs } from "../actions";

interface PageProps {
  searchParams: Promise<{
    user_id?: string;
    module?: string;
    action?: string;
    date_from?: string;
    date_to?: string;
    page?: string;
  }>;
}

export default async function AuditoriaPage({ searchParams }: PageProps) {
  await headers();
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);

  const { logs, total } = await getAuditLogs({
    user_id: params.user_id || undefined,
    module: params.module || undefined,
    action: params.action || undefined,
    date_from: params.date_from || undefined,
    date_to: params.date_to || undefined,
    page,
    perPage: 25,
  });

  const totalPages = Math.max(1, Math.ceil(total / 25));

  function buildFilterUrl(overrides: Record<string, string>) {
    const p = new URLSearchParams();
    const merged = {
      user_id: params.user_id || "",
      module: params.module || "",
      action: params.action || "",
      date_from: params.date_from || "",
      date_to: params.date_to || "",
      page: String(page),
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== "1") p.set(k, v);
    }
    return `/dashboard/equipe/auditoria?${p.toString()}`;
  }

  // Collect unique modules and actions for filter dropdowns
  const modules = [...new Set(logs.map((l) => l.module).filter(Boolean))].sort();
  const actions = [...new Set(logs.map((l) => l.action).filter(Boolean))].sort();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-nexora-dark">Auditoria</h1>
        <p className="mt-1 text-sm text-nexora-text-secondary">
          Registro imutável de todas as operações realizadas na organização
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-nexora-border bg-white p-4">
        <form method="GET" action="/dashboard/equipe/auditoria" className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-nexora-text-secondary">Módulo</label>
            <select
              name="module"
              defaultValue={params.module || ""}
              className="w-full rounded-lg border border-nexora-border px-3 py-2 text-sm focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            >
              <option value="">Todos os módulos</option>
              {modules.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-nexora-text-secondary">Ação</label>
            <select
              name="action"
              defaultValue={params.action || ""}
              className="w-full rounded-lg border border-nexora-border px-3 py-2 text-sm focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            >
              <option value="">Todas as ações</option>
              {actions.map((a) => (
                <option key={a} value={a}>{a.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-nexora-text-secondary">De</label>
            <input
              type="date"
              name="date_from"
              defaultValue={params.date_from || ""}
              className="w-full rounded-lg border border-nexora-border px-3 py-2 text-sm focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-nexora-text-secondary">Até</label>
            <input
              type="date"
              name="date_to"
              defaultValue={params.date_to || ""}
              className="w-full rounded-lg border border-nexora-border px-3 py-2 text-sm focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            />
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="rounded-lg bg-nexora-blue px-4 py-2 text-sm font-medium text-white hover:opacity-90">
              Filtrar
            </button>
            {(params.module || params.action || params.date_from || params.date_to) && (
              <Link href="/dashboard/equipe/auditoria" className="rounded-lg border border-nexora-border px-4 py-2 text-sm font-medium text-nexora-text hover:bg-nexora-bg-secondary">
                Limpar
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* Audit Table */}
      <div className="overflow-hidden rounded-xl border border-nexora-border bg-white shadow-sm">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <ScrollText className="mb-4 h-12 w-12 text-nexora-text-secondary/40" />
            <p className="text-lg font-medium text-nexora-dark">Nenhum registro encontrado</p>
            <p className="text-sm text-nexora-text-secondary">
              {params.module || params.action || params.date_from || params.date_to
                ? "Tente ajustar os filtros de busca."
                : "As atividades realizadas aparecerão aqui."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-nexora-border bg-nexora-bg">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">Data/Hora</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">Usuário</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">Ação</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">Módulo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">Recurso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexora-border">
                {logs.map((log) => (
                  <tr key={log.id} className="transition-colors hover:bg-nexora-bg-secondary">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-nexora-text">
                      {new Date(log.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-nexora-dark">
                      {log.actor?.email ?? log.actor_user_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-nexora-bg-secondary px-2.5 py-0.5 text-xs font-medium text-nexora-dark">
                        {log.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-nexora-text">{log.module}</td>
                    <td className="px-4 py-3 text-sm text-nexora-text-secondary">
                      {log.resource_type ? `${log.resource_type}${log.resource_id ? ` #${log.resource_id.slice(0, 8)}` : ""}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-nexora-text-secondary">
            Mostrando página {page} de {totalPages} ({total} registros)
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={buildFilterUrl({ page: String(page - 1) })} className="inline-flex items-center gap-1 rounded-lg border border-nexora-border px-3 py-1.5 text-sm font-medium text-nexora-text hover:bg-nexora-bg-secondary">
                <ChevronLeft className="h-3.5 w-3.5" />
                Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link href={buildFilterUrl({ page: String(page + 1) })} className="inline-flex items-center gap-1 rounded-lg border border-nexora-border px-3 py-1.5 text-sm font-medium text-nexora-text hover:bg-nexora-bg-secondary">
                Próxima
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}