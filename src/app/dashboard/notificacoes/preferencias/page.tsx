import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft, Bell, Mail, Smartphone } from "lucide-react";
import { getNotificationPreferences } from "../../tarefas/actions";

const CATEGORY_LABELS: Record<string, string> = {
  tasks: "Tarefas",
  calendar: "Agenda",
  orders: "Pedidos",
  financial: "Financeiro",
  inventory: "Estoque",
  team: "Equipe",
  system: "Sistema",
};

const CHANNEL_LABELS: Record<string, string> = {
  in_app: "No aplicativo",
  email: "E-mail",
  push: "Push (navegador)",
};

const CHANNEL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  in_app: Bell,
  email: Mail,
  push: Smartphone,
};

export default async function PreferenciasNotificacoesPage() {
  await headers();
  const prefs = await getNotificationPreferences();

  // Group by category
  const categories = Object.keys(CATEGORY_LABELS);
  const channels = ["in_app", "email", "push"] as const;

  // Build matrix: category → channel → enabled
  const matrix: Record<string, Record<string, boolean>> = {};
  for (const cat of categories) {
    matrix[cat] = { in_app: true, email: false, push: false };
  }
  for (const pref of prefs) {
    if (matrix[pref.category]) {
      matrix[pref.category][pref.channel] = pref.enabled;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/notificacoes"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-nexora-text-secondary transition-colors hover:text-nexora-blue"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        <h1 className="font-display text-2xl font-bold text-nexora-dark">Preferências de notificação</h1>
      </div>

      <p className="text-sm text-nexora-text-secondary">
        Configure como e quando deseja receber notificações por categoria e canal.
      </p>

      {/* Preferences Matrix */}
      <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-nexora-border bg-nexora-bg-secondary/50">
              <tr>
                <th className="px-4 py-3 font-semibold text-nexora-dark">Categoria</th>
                {channels.map((ch) => {
                  const Icon = CHANNEL_ICONS[ch];
                  return (
                    <th key={ch} className="px-4 py-3 text-center font-semibold text-nexora-dark">
                      <div className="flex flex-col items-center gap-1">
                        {Icon && <Icon className="h-4 w-4 text-nexora-blue" />}
                        <span className="text-xs">{CHANNEL_LABELS[ch]}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-nexora-border">
              {categories.map((cat) => (
                <tr key={cat} className="transition-colors hover:bg-nexora-bg-secondary/30">
                  <td className="px-4 py-3 font-medium text-nexora-dark">
                    {CATEGORY_LABELS[cat] ?? cat}
                  </td>
                  {channels.map((ch) => {
                    const enabled = matrix[cat]?.[ch] ?? false;
                    return (
                      <td key={ch} className="px-4 py-3 text-center">
                        <div className={`mx-auto inline-flex h-5 w-9 items-center rounded-full ${enabled ? "bg-nexora-blue" : "bg-gray-200"} relative cursor-default`}>
                          <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-nexora-text-secondary">
          As alterações nas preferências são salvas automaticamente. Ajustes individuais podem ser feitos via API ou server actions.
        </p>
      </div>
    </div>
  );
}