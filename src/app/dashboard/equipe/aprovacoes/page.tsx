import { headers } from "next/headers";
import { ShieldAlert, CheckCircle2, XCircle, Clock, Ban, Users } from "lucide-react";
import { getApprovalRequests } from "../actions";

const statusConfig: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: "Pendente", icon: Clock, className: "bg-amber-50 text-amber-700" },
  approved: { label: "Aprovado", icon: CheckCircle2, className: "bg-green-50 text-green-700" },
  rejected: { label: "Rejeitado", icon: XCircle, className: "bg-red-50 text-red-700" },
  cancelled: { label: "Cancelado", icon: Ban, className: "bg-gray-100 text-gray-600" },
  expired: { label: "Expirado", icon: Ban, className: "bg-gray-100 text-gray-600" },
};

const typeLabels: Record<string, string> = {
  promote_to_owner: "Promover a Proprietário",
  demote_owner: "Rebaixar Proprietário",
  remove_owner: "Remover Proprietário",
  transfer_ownership: "Transferir Propriedade",
};

export default async function AprovacoesPage() {
  await headers();
  const requests = await getApprovalRequests();

  const pending = requests.filter((r) => r.status === "pending");
  const resolved = requests.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-nexora-dark">Aprovações</h1>
        <p className="mt-1 text-sm text-nexora-text-secondary">
          Solicitações de operações críticas que requerem aprovação unânime dos proprietários
        </p>
      </div>

      {/* Pending Requests */}
      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-nexora-dark">
          Pendentes ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-nexora-border bg-white py-12">
            <ShieldAlert className="mb-4 h-10 w-10 text-nexora-text-secondary/40" />
            <p className="text-base font-medium text-nexora-dark">Nenhuma aprovação pendente</p>
            <p className="text-sm text-nexora-text-secondary">
              Operações críticas como promoção ou remoção de proprietários aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((req) => (
              <div
                key={req.id}
                className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50">
                      <ShieldAlert className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-semibold text-nexora-dark">
                        {typeLabels[req.request_type] ?? req.request_type}
                      </h3>
                      <p className="mt-1 text-sm text-nexora-text-secondary">
                        Solicitado por{" "}
                        <span className="font-medium text-nexora-dark">
                          {req.requester_name ?? req.requested_by.slice(0, 8)}
                        </span>{" "}
                        · Alvo:{" "}
                        <span className="font-medium text-nexora-dark">
                          {req.target_member_name ?? req.target_membership_id.slice(0, 8)}
                        </span>
                      </p>
                      <p className="mt-2 text-sm text-nexora-text">{req.description}</p>
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                    <Clock className="h-3 w-3" />
                    Pendente
                  </span>
                </div>

                {/* Votes Summary */}
                <div className="mt-4 rounded-lg bg-nexora-bg-secondary p-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-nexora-text-secondary">
                    <Users className="h-3.5 w-3.5" />
                    Votos registrados: {req.votes?.length ?? 0}
                  </div>
                  {req.votes && req.votes.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {req.votes.map((vote, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-xs text-nexora-text"
                        >
                          {vote.decision === "approve" ? (
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-600" />
                          )}
                          <span className="font-medium">
                            {vote.voter_name ?? "Votador"}
                          </span>
                          <span className="text-nexora-text-secondary">
                            — {vote.decision === "approve" ? "Aprovou" : "Rejeitou"}
                          </span>
                          {vote.note && (
                            <span className="truncate text-nexora-text-secondary/70">
                              · {vote.note}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                  >
                    Aprovar
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    Rejeitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolved Requests */}
      {resolved.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-nexora-text-secondary">
            Histórico
          </h2>
          <div className="overflow-hidden rounded-xl border border-nexora-border bg-white shadow-sm opacity-80">
            <table className="w-full">
              <thead className="border-b border-nexora-border bg-nexora-bg">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">
                    Solicitante
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">
                    Data
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexora-border">
                {resolved.slice(0, 20).map((req) => {
                  const config = statusConfig[req.status] ?? statusConfig.pending;
                  const Icon = config.icon;
                  return (
                    <tr key={req.id}>
                      <td className="px-4 py-3 text-sm font-medium text-nexora-dark">
                        {typeLabels[req.request_type] ?? req.request_type}
                      </td>
                      <td className="px-4 py-3 text-sm text-nexora-text">
                        {req.requester_name ?? req.requested_by.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
                        >
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-nexora-text-secondary">
                        {new Date(req.created_at).toLocaleDateString("pt-BR")}
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