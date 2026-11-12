import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Bell,
  Repeat,
} from "lucide-react";
import { getCalendarEventById, getEventAttendees, getEventReminders } from "../../tarefas/actions";

export default async function EventoDetailPage(props: { params: Promise<{ id: string }> }) {
  await headers();
  const { id } = await props.params;
  const event = await getCalendarEventById(id);

  if (!event) {
    notFound();
  }

  const [attendees, reminders] = await Promise.all([
    getEventAttendees(id),
    getEventReminders(id),
  ]);

  const start = new Date(event.start_at);
  const end = new Date(event.end_at);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/dashboard/agenda"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-nexora-text-secondary transition-colors hover:text-nexora-blue"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para agenda
      </Link>

      {/* Header Card */}
      <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-bold text-nexora-dark">{event.title}</h1>
              {event.all_day && (
                <span className="rounded-full bg-nexora-bg-secondary px-2.5 py-0.5 text-xs font-bold text-nexora-text-secondary">
                  Dia inteiro
                </span>
              )}
              {event.recurrence_rule && (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-700">
                  <Repeat className="h-3 w-3" />
                  Recorrente
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-nexora-text-secondary">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-nexora-blue" />
                {start.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </span>
              {!event.all_day && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-nexora-blue" />
                  {start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} — {end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              {event.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-nexora-blue" />
                  {event.location}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-nexora-blue" />
                Criado por: {event.creator_name}
              </span>
            </div>
          </div>
        </div>

        {event.description && (
          <div className="mt-6 rounded-lg bg-nexora-bg-secondary/50 p-4">
            <p className="whitespace-pre-line text-sm text-nexora-text-secondary">{event.description}</p>
          </div>
        )}
      </div>

      {/* Attendees */}
      <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-nexora-dark">
          Participantes ({attendees.length})
        </h2>
        {attendees.length === 0 ? (
          <p className="mt-4 text-sm text-nexora-text-secondary">Nenhum participante convidado.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {attendees.map((att) => {
              const rsvpColors: Record<string, string> = {
                accepted: "bg-green-100 text-green-700",
                declined: "bg-red-100 text-red-700",
                tentative: "bg-amber-100 text-amber-700",
                pending: "bg-gray-100 text-gray-700",
              };
              const rsvpLabels: Record<string, string> = {
                accepted: "Confirmado",
                declined: "Recusado",
                tentative: "Talvez",
                pending: "Pendente",
              };
              return (
                <div key={att.id} className="flex items-center justify-between rounded-lg border border-nexora-border p-3">
                  <div>
                    <p className="text-sm font-medium text-nexora-dark">{att.member_name}</p>
                    <p className="text-xs text-nexora-text-secondary">{att.member_email}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${rsvpColors[att.rsvp_status] ?? rsvpColors.pending}`}>
                    {rsvpLabels[att.rsvp_status] ?? att.rsvp_status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reminders */}
      {reminders.length > 0 && (
        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-nexora-dark">
            Lembretes ({reminders.length})
          </h2>
          <div className="mt-4 space-y-2">
            {reminders.map((rem) => (
              <div key={rem.id} className="flex items-center gap-3 rounded-lg border border-nexora-border p-3">
                <Bell className="h-4 w-4 text-nexora-blue" />
                <span className="text-sm text-nexora-dark">
                  {rem.minutes_before < 60
                    ? `${rem.minutes_before} minutos antes`
                    : `${Math.round(rem.minutes_before / 60)} hora${Math.round(rem.minutes_before / 60) > 1 ? "s" : ""} antes`}
                </span>
                <span className="rounded bg-nexora-bg-secondary px-2 py-0.5 text-xs text-nexora-text-secondary">
                  {rem.reminder_type === "notification" ? "No app" : rem.reminder_type === "email" ? "E-mail" : "Push"}
                </span>
                {rem.sent_at && (
                  <span className="text-xs text-green-600">Enviado</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}