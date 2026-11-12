import { Clock } from "lucide-react";
import type { OrderStatusHistoryEntry, OrderStatus } from "@/types/sales";

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDateTime(iso: string): string {
  try {
    return dateTimeFormatter.format(new Date(iso));
  } catch {
    return iso;
  }
}

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  confirmed: "Confirmado",
  preparing: "Em preparo",
  completed: "Concluído",
  cancelled: "Cancelado",
};

function getStatusLabel(status: string | null): string {
  if (!status) return "—";
  return statusLabels[status] ?? status;
}

export function StatusTimeline({
  history,
}: {
  history: OrderStatusHistoryEntry[];
}) {
  if (history.length === 0) {
    return (
      <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-nexora-dark">
          Histórico de status
        </h2>
        <p className="mt-4 text-sm text-nexora-text-secondary">
          Nenhuma alteração registrada.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
      <h2 className="font-display text-lg font-semibold text-nexora-dark">
        Histórico de status
      </h2>
      <div className="mt-4 space-y-0">
        {history.map((entry, index) => {
          const isLast = index === history.length - 1;
          return (
            <div key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
              {/* Timeline connector */}
              {!isLast && (
                <div className="absolute left-[15px] top-8 h-full w-px bg-nexora-border" />
              )}
              {/* Dot */}
              <div className="relative mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-nexora-border bg-nexora-bg-secondary">
                <Clock className="h-3.5 w-3.5 text-nexora-text-secondary" />
              </div>
              {/* Content */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-nexora-dark">
                  <span className="text-nexora-text-secondary">
                    {getStatusLabel(entry.from_status)}
                  </span>
                  {" → "}
                  <span>{getStatusLabel(entry.to_status)}</span>
                </p>
                <p className="mt-0.5 text-xs text-nexora-text-secondary">
                  {formatDateTime(entry.created_at)}
                </p>
                {entry.reason && (
                  <p className="mt-1 text-sm text-nexora-text">{entry.reason}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}