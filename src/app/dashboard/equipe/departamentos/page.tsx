import { headers } from "next/headers";
import Link from "next/link";
import { Building2, Plus, Archive, Users } from "lucide-react";
import { getDepartments } from "../actions";

export default async function DepartamentosPage() {
  await headers();
  const departments = await getDepartments();

  const active = departments.filter((d) => d.is_active);
  const archived = departments.filter((d) => !d.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-nexora-dark">Departamentos</h1>
          <p className="mt-1 text-sm text-nexora-text-secondary">
            Organize sua equipe em departamentos para melhor gestão
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-nexora-blue px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Novo departamento
        </button>
      </div>

      {/* Active Departments Grid */}
      {active.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-nexora-border bg-white py-16">
          <Building2 className="mb-4 h-12 w-12 text-nexora-text-secondary/40" />
          <p className="text-lg font-medium text-nexora-dark">Nenhum departamento ativo</p>
          <p className="text-sm text-nexora-text-secondary">Crie departamentos para organizar sua equipe.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {active.map((dept) => (
            <div
              key={dept.id}
              className="group relative rounded-xl border border-nexora-border bg-white p-5 shadow-sm transition-all hover:border-nexora-blue/30 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-nexora-blue/10">
                  <Building2 className="h-5 w-5 text-nexora-blue" />
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-nexora-bg-secondary px-2.5 py-0.5 text-xs font-medium text-nexora-text-secondary">
                  <Users className="h-3 w-3" />
                  {dept.member_count} {dept.member_count === 1 ? "membro" : "membros"}
                </span>
              </div>
              <h3 className="mt-3 font-display text-lg font-semibold text-nexora-dark">{dept.name}</h3>
              {dept.description && (
                <p className="mt-1 line-clamp-2 text-sm text-nexora-text-secondary">{dept.description}</p>
              )}
              {!dept.description && (
                <p className="mt-1 text-sm italic text-nexora-text-secondary/60">Sem descrição</p>
              )}
              <div className="mt-4 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  className="rounded-lg border border-nexora-border px-3 py-1.5 text-xs font-medium text-nexora-text hover:bg-nexora-bg-secondary"
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Arquivar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Archived Section */}
      {archived.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-nexora-text-secondary">Arquivados</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {archived.map((dept) => (
              <div
                key={dept.id}
                className="rounded-xl border border-nexora-border/50 bg-nexora-bg-secondary/50 p-4 opacity-70"
              >
                <div className="flex items-center gap-2">
                  <Archive className="h-4 w-4 text-nexora-text-secondary" />
                  <span className="font-medium text-nexora-text-secondary">{dept.name}</span>
                </div>
                {dept.description && (
                  <p className="mt-1 truncate text-xs text-nexora-text-secondary/60">{dept.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}