import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft, Settings, Shield, AlertTriangle, Save } from "lucide-react";
import { getAiSettings, getAiUsageStats, updateAiSettings } from "../actions";

export default async function AiConfiguracoesPage() {
  await headers();

  const [settings, usage] = await Promise.all([
    getAiSettings().catch(() => null),
    getAiUsageStats().catch(() => null),
  ]);

  const isAdmin = settings !== null;

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/intelligence"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-nexora-text-secondary transition-colors hover:text-nexora-blue"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <Shield className="mx-auto h-12 w-12 text-red-600" />
          <h2 className="mt-4 font-display text-lg font-semibold text-red-900">Acesso negado</h2>
          <p className="mt-2 text-sm text-red-800">
            Apenas proprietários e administradores podem acessar as configurações do Nexora Intelligence.
          </p>
        </div>
      </div>
    );
  }

  async function handleUpdate(formData: FormData) {
    "use server";
    const enabled = formData.get("enabled") === "on";
    const dailyLimit = Number(formData.get("daily_limit")) || 50;
    const maxTokens = Number(formData.get("max_tokens_per_message")) || 4096;
    const roles = formData.getAll("allowed_roles") as string[];
    const instructions = (formData.get("custom_instructions") as string) || "";

    await updateAiSettings({
      is_enabled: enabled,
      daily_limit: dailyLimit,
      max_tokens_per_request: maxTokens,
      max_tokens_per_message: maxTokens,
      allowed_roles: roles.length > 0 ? roles : ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"],
      custom_instructions: instructions || undefined,
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/intelligence"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-nexora-text-secondary transition-colors hover:text-nexora-blue"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-nexora-bg-secondary">
            <Settings className="h-3.5 w-3.5 text-nexora-text-secondary" />
          </div>
          <h1 className="font-display text-lg font-bold text-nexora-dark">Configurações da IA</h1>
        </div>
      </div>

      {/* Usage Stats */}
      {usage && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-nexora-border bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-nexora-text-secondary">Uso hoje</p>
            <p className="mt-1 font-display text-2xl font-bold text-nexora-dark">
              {usage.today_count ?? usage.today_requests}{" "}
              <span className="text-sm font-normal text-nexora-text-secondary">consultas</span>
            </p>
          </div>
          <div className="rounded-xl border border-nexora-border bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-nexora-text-secondary">Limite diário</p>
            <p className="mt-1 font-display text-2xl font-bold text-nexora-dark">
              {settings.daily_limit}{" "}
              <span className="text-sm font-normal text-nexora-text-secondary">consultas</span>
            </p>
          </div>
          <div className="rounded-xl border border-nexora-border bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-nexora-text-secondary">Total histórico</p>
            <p className="mt-1 font-display text-2xl font-bold text-nexora-dark">
              {usage.total_count ?? usage.month_requests}{" "}
              <span className="text-sm font-normal text-nexora-text-secondary">consultas</span>
            </p>
          </div>
        </div>
      )}

      {/* Settings Form */}
      <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-nexora-dark">Configurações gerais</h2>
        <p className="mt-1 text-xs text-nexora-text-secondary">
          Controle o comportamento e os limites do assistente de IA para toda a organização.
        </p>

        <form action={handleUpdate} className="mt-6 space-y-5">
          {/* Enable/Disable */}
          <div className="flex items-start justify-between rounded-lg border border-nexora-border p-4">
            <div>
              <label htmlFor="enabled" className="text-sm font-medium text-nexora-dark">
                Nexora Intelligence ativo
              </label>
              <p className="mt-0.5 text-xs text-nexora-text-secondary">
                Quando desativado, nenhum membro poderá usar o assistente de IA.
              </p>
            </div>
            <input
              type="checkbox"
              id="enabled"
              name="enabled"
              defaultChecked={settings.is_enabled}
              className="mt-1 h-5 w-5 rounded border-nexora-border text-nexora-blue focus:ring-nexora-blue"
            />
          </div>

          {/* Daily Limit */}
          <div>
            <label htmlFor="daily_limit" className="block text-sm font-medium text-nexora-dark">
              Limite diário de consultas por usuário
            </label>
            <p className="mt-0.5 text-xs text-nexora-text-secondary">
              Número máximo de mensagens que cada usuário pode enviar por dia.
            </p>
            <input
              type="number"
              id="daily_limit"
              name="daily_limit"
              defaultValue={settings.daily_limit}
              min={1}
              max={1000}
              className="mt-2 block w-40 rounded-lg border border-nexora-border px-3 py-2 text-sm text-nexora-dark focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            />
          </div>

          {/* Max Tokens */}
          <div>
            <label htmlFor="max_tokens_per_message" className="block text-sm font-medium text-nexora-dark">
              Tokens máximos por resposta
            </label>
            <p className="mt-0.5 text-xs text-nexora-text-secondary">
              Limite de tokens na resposta da IA. Valores maiores permitem respostas mais longas.
            </p>
            <input
              type="number"
              id="max_tokens_per_message"
              name="max_tokens_per_message"
              defaultValue={settings.max_tokens_per_message ?? settings.max_tokens_per_request}
              min={256}
              max={16384}
              step={256}
              className="mt-2 block w-40 rounded-lg border border-nexora-border px-3 py-2 text-sm text-nexora-dark focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            />
          </div>

          {/* Allowed Roles */}
          <fieldset>
            <legend className="text-sm font-medium text-nexora-dark">Papéis com acesso à IA</legend>
            <p className="mt-0.5 text-xs text-nexora-text-secondary">
              Selecione quais papéis podem utilizar o assistente.
            </p>
            <div className="mt-3 flex flex-wrap gap-4">
              {["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"].map((role) => (
                <label key={role} className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="allowed_roles"
                    value={role}
                    defaultChecked={(settings.allowed_roles ?? ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"]).includes(role)}
                    className="h-4 w-4 rounded border-nexora-border text-nexora-blue focus:ring-nexora-blue"
                  />
                  <span className="text-sm text-nexora-dark">{role}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Custom Instructions */}
          <div>
            <label htmlFor="custom_instructions" className="block text-sm font-medium text-nexora-dark">
              Instruções personalizadas
            </label>
            <p className="mt-0.5 text-xs text-nexora-text-secondary">
              Contexto adicional sobre a empresa para melhorar as respostas da IA.
            </p>
            <textarea
              id="custom_instructions"
              name="custom_instructions"
              defaultValue={settings.custom_instructions ?? ""}
              rows={3}
              placeholder="Ex: Somos uma distribuidora de alimentos orgânicos com foco em varejo..."
              className="mt-2 block w-full rounded-lg border border-nexora-border px-3 py-2 text-sm text-nexora-dark placeholder:text-nexora-text-secondary/50 focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-nexora-blue px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <Save className="h-4 w-4" />
              Salvar configurações
            </button>
          </div>
        </form>
      </div>

      {/* Security Notice */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <h3 className="text-sm font-semibold text-amber-900">Segurança e privacidade</h3>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-amber-800">
              <li>A IA consulta apenas dados que o usuário tem permissão para acessar.</li>
              <li>Ferramentas de escrita (criar tarefas, etc.) retornam propostas — nada é criado automaticamente.</li>
              <li>Todas as conversas são registradas e auditáveis pela organização.</li>
              <li>O limite diário previne uso excessivo e custos inesperados.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}