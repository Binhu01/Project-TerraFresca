import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, Shield, Calendar, Phone, FileText } from "lucide-react";
import { getMemberById, getDepartments, getRoles } from "../../actions";

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

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getMemberById(id);

  if (!member) {
    notFound();
  }

  const [departments, roles] = await Promise.all([getDepartments(), getRoles()]);

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/dashboard/equipe/funcionarios"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-nexora-text-secondary transition-colors hover:text-nexora-dark"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para funcionários
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-nexora-blue/10 text-xl font-bold text-nexora-blue">
          {member.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={member.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            (member.full_name?.[0] ?? member.email[0]).toUpperCase()
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-nexora-dark">
              {member.full_name ?? "Sem nome"}
            </h1>
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColors[member.role] ?? "bg-gray-100 text-gray-700"}`}>
              {roleLabels[member.role] ?? member.role}
            </span>
            {member.status === "suspended" && (
              <span className="inline-flex rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                Suspenso
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-nexora-text-secondary">{member.email}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Professional Info */}
        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-nexora-dark">Informações profissionais</h2>
          <dl className="mt-4 space-y-4">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-nexora-text-secondary" />
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-nexora-text-secondary">Cargo</dt>
                <dd className="mt-1 text-sm font-medium text-nexora-dark">{member.job_title ?? "Não definido"}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-nexora-text-secondary" />
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-nexora-text-secondary">Departamento</dt>
                <dd className="mt-1 text-sm font-medium text-nexora-dark">{member.department_name ?? "Não atribuído"}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 h-5 w-5 shrink-0 text-nexora-text-secondary" />
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-nexora-text-secondary">Telefone profissional</dt>
                <dd className="mt-1 text-sm font-medium text-nexora-dark">{member.professional_phone ?? "Não informado"}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-nexora-text-secondary" />
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-nexora-text-secondary">Data de entrada</dt>
                <dd className="mt-1 text-sm font-medium text-nexora-dark">
                  {member.start_date
                    ? new Date(member.start_date + "T00:00:00").toLocaleDateString("pt-BR")
                    : new Date(member.joined_at).toLocaleDateString("pt-BR")}
                </dd>
              </div>
            </div>
            {member.notes && (
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-nexora-text-secondary" />
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wider text-nexora-text-secondary">Observações</dt>
                  <dd className="mt-1 whitespace-pre-line text-sm text-nexora-dark">{member.notes}</dd>
                </div>
              </div>
            )}
          </dl>
        </div>

        {/* Role & Permissions Summary */}
        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-nexora-dark">Papel e permissões</h2>
            <Link
              href="/dashboard/equipe/cargos"
              className="text-sm font-medium text-nexora-blue hover:underline"
            >
              Gerenciar permissões
            </Link>
          </div>
          <div className="mt-4">
            <p className="text-sm text-nexora-text-secondary">Papel atual</p>
            <p className="mt-1 text-lg font-semibold text-nexora-dark">
              {roleLabels[member.role] ?? member.role}
            </p>
            <p className="mt-3 text-sm text-nexora-text-secondary">
              As permissões deste membro são herdadas do papel{" "}
              <span className="font-medium text-nexora-dark">{roleLabels[member.role] ?? member.role}</span>.
              Para conceder ou restringir permissões individuais, acesse a área de Cargos e Permissões.
            </p>
          </div>
        </div>
      </div>

      {/* Available Departments & Roles Reference */}
      <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-nexora-dark">Referência rápida</h2>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-nexora-text-secondary">Departamentos disponíveis</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {departments.filter((d: { id: string; name: string; is_active: boolean }) => d.is_active).map((d: { id: string; name: string; is_active: boolean }) => (
                <span
                  key={d.id}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    d.id === member.department_id
                      ? "bg-nexora-blue text-white"
                      : "bg-nexora-bg-secondary text-nexora-text-secondary"
                  }`}
                >
                  {d.name}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-nexora-text-secondary">Papéis do sistema</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {roles.filter((r: { id: string; name: string; is_system_role: boolean; member_count: number }) => r.is_system_role).map((r: { id: string; name: string; is_system_role: boolean; member_count: number }) => (
                <span
                  key={r.id}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    r.name === member.role
                      ? "bg-nexora-blue text-white"
                      : "bg-nexora-bg-secondary text-nexora-text-secondary"
                  }`}
                >
                  {roleLabels[r.name] ?? r.name} ({r.member_count})
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}