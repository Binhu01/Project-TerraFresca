import { headers } from "next/headers";
import Link from "next/link";
import { MailPlus, Clock, CheckCircle2, XCircle, Copy, UserPlus } from "lucide-react";
import { getInvitations, getDepartments } from "../actions";

const statusConfig: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: "Pendente", icon: Clock, className: "bg-amber-50 text-amber-700" },
  accepted: { label: "Aceito", icon: CheckCircle2, className: "bg-green-50 text-green-700" },
  revoked: { label: "Revogado", icon: XCircle, className: "bg-red-50 text-red-700" },
  expired: { label: "Expirado", icon: XCircle, className: "bg-gray-100 text-gray-600" },
};

export default async function ConvitesPage() {
  await headers();
  const [invitations, departments] = await Promise.all([getInvitations(), getDepartments()]);

  const pending = invitations.filter((i) => !i.accepted_at && !i.revoked_at);
  const past = invitations.filter((i) => i.accepted_at || i.revoked_at);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-nexora-dark">Convites</h1>
          <p className="mt-1 text-sm text-nexora-text-secondary">
            Convide novos membros para sua organização
          </p>
        </div>
      </div>

      {/* Create Invitation Form */}
      <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-nexora-blue/10">
            <UserPlus className="h-5 w-5 text-nexora-blue" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-nexora-dark">Novo convite</h2>
            <p className="text-xs text-nexora-text-secondary">
              O link de convite será exibido uma única vez após a criação
            </p>
          </div>
        </div>
        <form className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <label className="mb-1 block text-xs font-medium text-nexora-text-secondary">E-mail</label>
            <input
              type="email"
              name="email"
              required
              placeholder="nome@empresa.com"
              className="w-full rounded-lg border border-nexora-border px-3 py-2 text-sm focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-nexora-text-secondary">Papel</label>
            <select
              name="role"
              className="w-full rounded-lg border border-nexora-border px-3 py-2 text-sm focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            >
              <option value="EMPLOYEE">Colaborador</option>
              <option value="MANAGER">Gerente</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-nexora-text-secondary">Departamento</label>
            <select
              name="department_id"
              className="w-full rounded-lg border border-nexora-border px-3 py-2 text-sm focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            >
              <option value="">Sem departamento</option>
              {departments.filter((d) => d.is_active).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-lg bg-nexora-blue px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Gerar convite
            </button>
          </div>
        </form>
      </div>

      {/* Pending Invitations */}
      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-nexora-dark">
          Convites pendentes ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-nexora-border bg-white py-12">
            <MailPlus className="mb-4 h-10 w-10 text-nexora-text-secondary/40" />
            <p className="text-base font-medium text-nexora-dark">Nenhum convite pendente</p>
            <p className="text-sm text-nexora-text-secondary">
              Use o formulário acima para convidar novos membros.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-nexora-border bg-white shadow-sm">
            <table className="w-full">
              <thead className="border-b border-nexora-border bg-nexora-bg">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">E-mail</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">Papel</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">Departamento</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">Expira em</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexora-border">
                {pending.map((inv) => (
                  <tr key={inv.id} className="transition-colors hover:bg-nexora-bg-secondary">
                    <td className="px-4 py-3 text-sm font-medium text-nexora-dark">{inv.email}</td>
                    <td className="px-4 py-3 text-sm text-nexora-text">{inv.role_name ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-nexora-text">{inv.department_name ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-nexora-text">
                      {new Date(inv.expires_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Revogar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Past Invitations */}
      {past.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-nexora-text-secondary">Histórico</h2>
          <div className="overflow-hidden rounded-xl border border-nexora-border bg-white shadow-sm opacity-80">
            <table className="w-full">
              <thead className="border-b border-nexora-border bg-nexora-bg">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">E-mail</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexora-border">
                {past.slice(0, 20).map((inv) => {
                  const invStatus = inv.accepted_at ? "accepted" : inv.revoked_at ? "revoked" : "expired";
                  const config = statusConfig[invStatus] ?? statusConfig.pending;
                  const Icon = config.icon;
                  return (
                    <tr key={inv.id}>
                      <td className="px-4 py-3 text-sm text-nexora-text">{inv.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-nexora-text-secondary">
                        {new Date(inv.created_at).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}