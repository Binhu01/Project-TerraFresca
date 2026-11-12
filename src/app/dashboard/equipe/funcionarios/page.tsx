import { headers } from "next/headers";
import Link from "next/link";
import { Search, Users, MoreHorizontal, ShieldAlert, UserX, UserCheck } from "lucide-react";
import { getMembers, getDepartments } from "../actions";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const roleLabels: Record<string, string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  EMPLOYEE: "Colaborador",
};

const roleColors: Record<string, string> = {
  OWNER: "bg-nexora-blue/10 text-nexora-blue",
  ADMIN: "bg-purple-50 text-purple-700",
  MANAGER: "bg-amber-50 text-amber-700",
  EMPLOYEE: "bg-gray-100 text-gray-700",
};

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: "Ativo", className: "bg-green-50 text-green-700" },
  suspended: { label: "Suspenso", className: "bg-red-50 text-red-700" },
};

interface PageProps {
  searchParams: Promise<{
    search?: string;
    role?: string;
    department_id?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function FuncionariosPage({ searchParams }: PageProps) {
  await headers();
  const params = await searchParams;
  const search = params.search || "";
  const role = params.role || "";
  const departmentId = params.department_id || "";
  const status = params.status || "";
  const page = parseInt(params.page || "1", 10);

  const [{ members, total }, departments] = await Promise.all([
    getMembers({
      search: search || undefined,
      role: role || undefined,
      department_id: departmentId || undefined,
      status: status || undefined,
      page,
      perPage: 20,
    }),
    getDepartments(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / 20));

  function buildFilterUrl(overrides: Record<string, string>) {
    const p = new URLSearchParams();
    const merged = { search, role, department_id: departmentId, status, page: String(page), ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== "all" && v !== "1") p.set(k, v);
    }
    return `/dashboard/equipe/funcionarios?${p.toString()}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-nexora-dark">Funcionários</h1>
        <Link
          href="/dashboard/equipe/convites"
          className="inline-flex items-center gap-2 rounded-lg bg-nexora-blue px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Convidar membro
        </Link>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-nexora-border bg-white p-4">
        <form method="GET" action="/dashboard/equipe/funcionarios" className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-nexora-text-secondary">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-nexora-text-secondary" />
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Nome ou e-mail..."
                className="w-full rounded-lg border border-nexora-border py-2 pl-9 pr-3 text-sm focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-nexora-text-secondary">Papel</label>
            <select
              name="role"
              defaultValue={role}
              className="w-full rounded-lg border border-nexora-border px-3 py-2 text-sm focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            >
              <option value="">Todos os papéis</option>
              <option value="OWNER">Proprietário</option>
              <option value="ADMIN">Administrador</option>
              <option value="MANAGER">Gerente</option>
              <option value="EMPLOYEE">Colaborador</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-nexora-text-secondary">Departamento</label>
            <select
              name="department_id"
              defaultValue={departmentId}
              className="w-full rounded-lg border border-nexora-border px-3 py-2 text-sm focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            >
              <option value="">Todos os departamentos</option>
              {departments.filter((d) => d.is_active).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-nexora-text-secondary">Status</label>
            <select
              name="status"
              defaultValue={status}
              className="w-full rounded-lg border border-nexora-border px-3 py-2 text-sm focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            >
              <option value="">Todos</option>
              <option value="active">Ativos</option>
              <option value="suspended">Suspensos</option>
            </select>
          </div>
          <div className="md:col-span-4 flex items-center gap-2">
            <button type="submit" className="rounded-lg bg-nexora-blue px-4 py-2 text-sm font-medium text-white hover:opacity-90">
              Filtrar
            </button>
            {(search || role || departmentId || status) && (
              <Link href="/dashboard/equipe/funcionarios" className="rounded-lg border border-nexora-border px-4 py-2 text-sm font-medium text-nexora-text hover:bg-nexora-bg-secondary">
                Limpar
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* Members Table */}
      <div className="overflow-hidden rounded-xl border border-nexora-border bg-white shadow-sm">
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Users className="mb-4 h-12 w-12 text-nexora-text-secondary/40" />
            <p className="text-lg font-medium text-nexora-dark">Nenhum membro encontrado</p>
            <p className="text-sm text-nexora-text-secondary">
              {search || role || departmentId || status
                ? "Tente ajustar os filtros de busca."
                : "Convide membros para começar a construir sua equipe."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-nexora-border bg-nexora-bg">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">Membro</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">Cargo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">Departamento</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">Papel</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">Entrada</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexora-border">
                {members.map((m) => (
                  <tr key={m.membership_id} className="transition-colors hover:bg-nexora-bg-secondary">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-nexora-blue/10 text-sm font-semibold text-nexora-blue">
                          {m.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                          ) : (
                            (m.full_name?.[0] ?? m.email[0]).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-nexora-dark">{m.full_name ?? "Sem nome"}</p>
                          <p className="truncate text-xs text-nexora-text-secondary">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-nexora-text">{m.job_title ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-nexora-text">{m.department_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColors[m.role] ?? "bg-gray-100 text-gray-700"}`}>
                        {roleLabels[m.role] ?? m.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig[m.status]?.className ?? "bg-gray-100 text-gray-700"}`}>
                        {statusConfig[m.status]?.label ?? m.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-nexora-text">
                      {new Date(m.joined_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/equipe/funcionarios/${m.membership_id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-nexora-border px-3 py-1.5 text-xs font-medium text-nexora-text transition-colors hover:bg-nexora-bg-secondary"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                        Detalhes
                      </Link>
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
            Mostrando página {page} de {totalPages} ({total} membros)
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={buildFilterUrl({ page: String(page - 1) })} className="rounded-lg border border-nexora-border px-3 py-1.5 text-sm font-medium text-nexora-text hover:bg-nexora-bg-secondary">
                Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link href={buildFilterUrl({ page: String(page + 1) })} className="rounded-lg border border-nexora-border px-3 py-1.5 text-sm font-medium text-nexora-text hover:bg-nexora-bg-secondary">
                Próxima
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}