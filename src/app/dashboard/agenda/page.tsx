import { headers } from "next/headers";
import Link from "next/link";
import { Plus, CalendarDays, Clock, MapPin, User } from "lucide-react";
import { getCalendarEvents } from "../tarefas/actions";

export default async function AgendaPage() {
  await headers();

  // Default to current month view
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const events = await getCalendarEvents({ start_date: startDate, end_date: endDate });

  const monthName = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-nexora-dark">Agenda</h1>
          <p className="mt-1 text-sm text-nexora-text-secondary">{monthName}</p>
        </div>
        <Link
          href="/dashboard/agenda/novo"
          className="inline-flex items-center gap-1.5 rounded-lg bg-nexora-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Novo evento
        </Link>
      </div>

      {/* Events List (simplified monthly view) */}
      {events.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-nexora-border p-12 text-center">
          <CalendarDays className="mx-auto h-12 w-12 text-nexora-border" />
          <p className="mt-4 text-sm font-medium text-nexora-dark">Nenhum evento neste mês</p>
          <p className="mt-1 text-xs text-nexora-text-secondary">Crie um evento para começar a organizar sua agenda.</p>
          <Link
            href="/dashboard/agenda/novo"
            className="mt-4 inline-block rounded-lg bg-nexora-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Criar evento
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const start = new Date(event.start_at);
            const isAllDay = event.all_day;
            const colorMap: Record<string, string> = {
              blue: "border-l-blue-500 bg-blue-50/30",
              green: "border-l-green-500 bg-green-50/30",
              red: "border-l-red-500 bg-red-50/30",
              amber: "border-l-amber-500 bg-amber-50/30",
              purple: "border-l-purple-500 bg-purple-50/30",
              cyan: "border-l-cyan-500 bg-cyan-50/30",
            };
            const colorClass = colorMap[event.color] ?? colorMap.blue;

            return (
              <Link
                key={event.id}
                href={`/dashboard/agenda/${event.id}`}
                className={`group flex flex-col gap-3 rounded-xl border border-nexora-border border-l-4 bg-white p-4 shadow-sm transition-all hover:shadow-md sm:flex-row sm:items-center ${colorClass}`}
              >
                {/* Date/Time */}
                <div className="min-w-[100px] text-center sm:text-left">
                  <p className="text-lg font-bold text-nexora-dark">{start.getDate()}</p>
                  <p className="text-xs uppercase text-nexora-text-secondary">
                    {start.toLocaleDateString("pt-BR", { weekday: "short" })}
                  </p>
                  {!isAllDay && (
                    <p className="mt-1 flex items-center justify-center gap-1 text-xs text-nexora-text-secondary sm:justify-start">
                      <Clock className="h-3 w-3" />
                      {start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                  {isAllDay && (
                    <span className="mt-1 inline-block rounded bg-nexora-bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-nexora-text-secondary">
                      Dia inteiro
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1">
                  <h3 className="font-medium text-nexora-dark group-hover:text-nexora-blue">{event.title}</h3>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-nexora-text-secondary">
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {event.creator_name}
                    </span>
                    {event.attendee_count > 0 && (
                      <span>{event.attendee_count} participante{event.attendee_count > 1 ? "s" : ""}</span>
                    )}
                    {event.recurrence_rule && (
                      <span className="rounded bg-nexora-bg-secondary px-1.5 py-0.5 font-medium">Recorrente</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}