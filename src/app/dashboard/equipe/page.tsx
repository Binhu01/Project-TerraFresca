import { headers } from "next/headers";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Building2,
  ShieldCheck,
  ScrollText,
  MailPlus,
  Activity,
} from "lucide-react";
import { getTeamDashboard } from "./actions";

const roleLabels: Record<string, string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  EMPLOYEE: "Colaborador",
};

export default async function EquipePage() {
  await headers();
  const stats = await getTeamDashboard();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-nexora-dark">Equipe</h1>
        <Link
          href="/dashboard/equipe/convites"
          className="inline-flex items-center gap-2 rounded-lg bg-nexora-blue px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <UserPlus className="h-4 w-4" />
          Convidar membro
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-nexora-border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-nexora-blue/10">
              <Users className="h-5 w-5 text-nexora-blue" />
            </div>
            <div>
              <p className="text-sm text-nexora-text-secondary">Membros ativos</p>
              <p className="text-2xl font-bold text-nexora-dark">{stats.total_active_members}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-nexora-border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-nexora-cyan/10">
              <MailPlus className="h-5 w-5 text-nexora-cyan" />
            </div>
            <div>
              <p className="text-sm text-nexora-text-secondary">Convites pendentes</p>
              <p className="text-2xl font-bold text-nexora-dark">{stats.pending_invitations}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-nexora-border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <ShieldCheck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-nexora-text-secondary">Departamentos</p>
              <p className="text-2xl font-bold text-nexora-dark">{stats.department_count}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-nexora-border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Activity className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-nexora-text-secondary">Atividades recentes</p>
              <p className="text-2xl font-bold text-nexora-dark">{stats.recent_activities.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Role Breakdown */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          { label: "Proprietários", count: stats.owner_count, color: "text-nexora-blue" },
          { label: "Administradores", count: stats.admin_count, color: "text-purple-600" },
          { label: "Gerentes", count: stats.manager_count, color: "text-amber-600" },
          { label: "Colaboradores", count: stats.employee_count, color: "text-nexora-text-secondary" },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-nexora-border bg-white p-4 text-center shadow-sm">
            <p className={`text-3xl font-bold ${item.color}`}>{item.count}</p>
            <p className="text-sm text-nexora-text-secondary">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-nexora-dark">Ações rápidas</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link
              href="/dashboard/equipe/convites"
              className="flex items-center gap-3 rounded-lg border border-nexora-border p-4 transition-colors hover:bg-nexora-bg-secondary"
            >
              <UserPlus className="h-5 w-5 text-nexora-blue" />
              <span className="text-sm font-medium text-nexora-dark">Convidar funcionário</span>
            </Link>
            <Link
              href="/dashboard/equipe/departamentos"
              className="flex items-center gap-3 rounded-lg border border-nexora-border p-4 transition-colors hover:bg-nexora-bg-secondary"
            >
              <Building2 className="h-5 w-5 text-nexora-blue" />
              <span className="text-sm font-medium text-nexora-dark">Departamentos</span>
            </Link>
            <Link
              href="/dashboard/equipe/cargos"
              className="flex items-center gap-3 rounded-lg border border-nexora-border p-4 transition-colors hover:bg-nexora-bg-secondary"
            >
              <ShieldCheck className="h-5 w-5 text-nexora-blue" />
              <span className="text-sm font-medium text-nexora-dark">Permissões</span>
            </Link>
            <Link
              href="/dashboard/equipe/auditoria"
              className="flex items-center gap-3 rounded-lg border border-nexora-border p-4 transition-colors hover:bg-nexora-bg-secondary"
            >
              <ScrollText className="h-5 w-5 text-nexora-blue" />
              <span className="text-sm font-medium text-nexora-dark">Auditoria</span>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-nexora-dark">Atividades recentes</h2>
            <Link href="/dashboard/equipe/auditoria" className="text-sm font-medium text-nexora-blue hover:underline">
              Ver tudo
            </Link>
          </div>
          {stats.recent_activities.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center text-center">
              <Activity className="mb-3 h-10 w-10 text-nexora-text-secondary/40" />
              <p className="text-sm text-nexora-text-secondary">Nenhuma atividade registrada</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {stats.recent_activities.map((log) => (
                <div key={log.id} className="flex items-start gap-3 rounded-lg border border-nexora-border/50 p-3">
                  <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-nexora-blue" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-nexora-dark">{log.action.replace(/_/g, " ")}</p>
                    <p className="text-xs text-nexora-text-secondary">
                      {log.module} · {new Date(log.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}