import { headers } from "next/headers";
import { ShieldCheck, Users, Lock, Plus } from "lucide-react";
import { getRoles, getPermissionsCatalog } from "../actions";

const roleLabels: Record<string, string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  EMPLOYEE: "Colaborador",
};

const roleDescriptions: Record<string, string> = {
  OWNER: "Acesso total incluindo gestão de proprietários e aprovações",
  ADMIN: "Acesso administrativo completo exceto remoção de proprietários",
  MANAGER: "Gestão operacional de clientes, vendas, produtos e financeiro básico",
  EMPLOYEE: "Acesso básico de visualização e operações simples",
};

export default async function CargosPage() {
  await headers();
  const [roles, catalog] = await Promise.all([getRoles(), getPermissionsCatalog()]);

  const systemRoles = roles.filter((r) => r.is_system_role);
  const customRoles = roles.filter((r) => !r.is_system_role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-nexora-dark">Cargos e Permissões</h1>
          <p className="mt-1 text-sm text-nexora-text-secondary">
            Gerencie papéis e configure permissões granulares por módulo
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-nexora-blue px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Novo cargo personalizado
        </button>
      </div>

      {/* System Roles */}
      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-nexora-dark">Papéis do sistema</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {systemRoles.map((role) => (
            <div
              key={role.id}
              className="rounded-xl border border-nexora-border bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-nexora-blue/10">
                    <ShieldCheck className="h-5 w-5 text-nexora-blue" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-semibold text-nexora-dark">
                      {roleLabels[role.name] ?? role.name}
                    </h3>
                    <p className="text-xs text-nexora-text-secondary">
                      {role.member_count} {role.member_count === 1 ? "membro" : "membros"}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-nexora-bg-secondary px-2.5 py-0.5 text-xs font-medium text-nexora-text-secondary">
                  <Lock className="h-3 w-3" />
                  Sistema
                </span>
              </div>
              <p className="mt-3 text-sm text-nexora-text-secondary">
                {role.description ?? roleDescriptions[role.name] ?? "Papel do sistema"}
              </p>
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-nexora-border px-3 py-1.5 text-xs font-medium text-nexora-text hover:bg-nexora-bg-secondary"
                >
                  Ver permissões
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Roles */}
      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-nexora-dark">Cargos personalizados</h2>
        {customRoles.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-nexora-border bg-white py-12">
            <Users className="mb-4 h-10 w-10 text-nexora-text-secondary/40" />
            <p className="text-base font-medium text-nexora-dark">Nenhum cargo personalizado</p>
            <p className="text-sm text-nexora-text-secondary">
              Crie cargos customizados para atender necessidades específicas da sua organização.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {customRoles.map((role) => (
              <div
                key={role.id}
                className="group rounded-xl border border-nexora-border bg-white p-5 shadow-sm transition-all hover:border-nexora-blue/30 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-nexora-cyan/10">
                      <Users className="h-5 w-5 text-nexora-cyan" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-semibold text-nexora-dark">{role.name}</h3>
                      <p className="text-xs text-nexora-text-secondary">
                        {role.member_count} {role.member_count === 1 ? "membro" : "membros"}
                      </p>
                    </div>
                  </div>
                </div>
                {role.description && (
                  <p className="mt-3 line-clamp-2 text-sm text-nexora-text-secondary">{role.description}</p>
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
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Permission Catalog Reference */}
      <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-nexora-dark">Catálogo de permissões</h2>
        <p className="mt-1 text-sm text-nexora-text-secondary">
          {Object.keys(catalog).length} módulos com permissões granulares disponíveis para configuração
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(catalog).map(([module, permissions]) => (
            <div key={module} className="rounded-lg border border-nexora-border/50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-nexora-blue">{module}</p>
              <div className="mt-2 space-y-1">
                {permissions.map((p: { key: string; label: string }) => (
                  <p key={p.key} className="text-xs text-nexora-text-secondary">
                    {p.label}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}