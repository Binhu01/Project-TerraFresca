"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCalendarEvent } from "../../tarefas/actions";

interface Member {
 membership_id: string;
 name: string;
 email: string;
}

interface EventFormProps {
 members: Member[];
}

export function EventForm({ members }: EventFormProps) {
 const router = useRouter();
 const [submitting, setSubmitting] = useState(false);
 const [error, setError] = useState<string | null>(null);

 async function handleSubmit(formData: FormData) {
 setSubmitting(true);
 setError(null);

 try {
 const startAt = formData.get("start_at") as string;
 const endAt = formData.get("end_at") as string;

 if (!startAt || !endAt) {
 throw new Error("Data de início e fim são obrigatórias");
 }

 if (new Date(endAt) <= new Date(startAt)) {
 throw new Error("A data de fim deve ser posterior à data de início");
 }

 const attendeeIds = formData.getAll("attendee_ids") as string[];

 await createCalendarEvent({
 title: formData.get("title") as string,
 description: (formData.get("description") as string) || null,
 start_at: new Date(startAt).toISOString(),
 end_at: new Date(endAt).toISOString(),
 all_day: formData.get("all_day") === "on",
 location: (formData.get("location") as string) || null,
 color: (formData.get("color") as string) || "blue",
 attendee_ids: attendeeIds.length > 0 ? attendeeIds : undefined,
 reminders: [{ reminder_type: "notification", minutes_before: 15 }],
 });

 router.push("/dashboard/agenda");
 router.refresh();
 } catch (err) {
 setError(err instanceof Error ? err.message : "Erro ao criar evento");
 } finally {
 setSubmitting(false);
 }
 }

 return (
 <form action={handleSubmit} className="space-y-6">
 {error && (
 <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
 {error}
 </div>
 )}

 <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
 <div className="grid gap-6 sm:grid-cols-2">
 {/* Title */}
 <div className="sm:col-span-2">
 <label htmlFor="title" className="block text-sm font-medium text-nexora-dark">
 Título *
 </label>
 <input
 id="title"
 name="title"
 type="text"
 required
 maxLength={300}
 className="mt-1 w-full rounded-lg border border-nexora-border px-3 py-2 text-sm text-nexora-dark placeholder:text-nexora-text-secondary/50 focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
 placeholder="Ex: Reunião semanal de vendas"
 />
 </div>

 {/* Start */}
 <div>
 <label htmlFor="start_at" className="block text-sm font-medium text-nexora-dark">
 Início *
 </label>
 <input
 id="start_at"
 name="start_at"
 type="datetime-local"
 required
 className="mt-1 w-full rounded-lg border border-nexora-border px-3 py-2 text-sm text-nexora-dark focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
 />
 </div>

 {/* End */}
 <div>
 <label htmlFor="end_at" className="block text-sm font-medium text-nexora-dark">
 Fim *
 </label>
 <input
 id="end_at"
 name="end_at"
 type="datetime-local"
 required
 className="mt-1 w-full rounded-lg border border-nexora-border px-3 py-2 text-sm text-nexora-dark focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
 />
 </div>

 {/* All Day */}
 <div className="flex items-center gap-2">
 <input
 id="all_day"
 name="all_day"
 type="checkbox"
 className="h-4 w-4 rounded border-nexora-border text-nexora-blue focus:ring-nexora-blue"
 />
 <label htmlFor="all_day" className="text-sm font-medium text-nexora-dark">
 Evento de dia inteiro
 </label>
 </div>

 {/* Color */}
 <div>
 <label htmlFor="color" className="block text-sm font-medium text-nexora-dark">
 Cor
 </label>
 <select
 id="color"
 name="color"
 defaultValue="blue"
 className="mt-1 w-full rounded-lg border border-nexora-border px-3 py-2 text-sm text-nexora-dark focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
 >
 <option value="blue">Azul</option>
 <option value="green">Verde</option>
 <option value="red">Vermelho</option>
 <option value="amber">Amarelo</option>
 <option value="purple">Roxo</option>
 <option value="cyan">Ciano</option>
 </select>
 </div>

 {/* Location */}
 <div className="sm:col-span-2">
 <label htmlFor="location" className="block text-sm font-medium text-nexora-dark">
 Local
 </label>
 <input
 id="location"
 name="location"
 type="text"
 maxLength={500}
 className="mt-1 w-full rounded-lg border border-nexora-border px-3 py-2 text-sm text-nexora-dark placeholder:text-nexora-text-secondary/50 focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
 placeholder="Ex: Sala de reuniões 3 / Google Meet"
 />
 </div>

 {/* Attendees */}
 <div className="sm:col-span-2">
 <label className="block text-sm font-medium text-nexora-dark">Participantes</label>
 <div className="mt-2 grid max-h-48 gap-2 overflow-y-auto rounded-lg border border-nexora-border p-3">
 {members.map((m) => (
 <label key={m.membership_id} className="flex items-center gap-2 text-sm text-nexora-dark">
 <input
 type="checkbox"
 name="attendee_ids"
 value={m.membership_id}
 className="h-4 w-4 rounded border-nexora-border text-nexora-blue focus:ring-nexora-blue"
 />
 {m.name}
 </label>
 ))}
 {members.length === 0 && (
 <p className="text-xs text-nexora-text-secondary">Nenhum membro ativo encontrado.</p>
 )}
 </div>
 </div>

 {/* Description */}
 <div className="sm:col-span-2">
 <label htmlFor="description" className="block text-sm font-medium text-nexora-dark">
 Descrição
 </label>
 <textarea
 id="description"
 name="description"
 rows={3}
 maxLength={5000}
 className="mt-1 w-full rounded-lg border border-nexora-border px-3 py-2 text-sm text-nexora-dark placeholder:text-nexora-text-secondary/50 focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
 placeholder="Detalhes adicionais sobre o evento..."
 />
 </div>
 </div>
 </div>

 {/* Actions */}
 <div className="flex items-center gap-3">
 <button
 type="submit"
 disabled={submitting}
 className="inline-flex items-center gap-1.5 rounded-lg bg-nexora-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
 >
 {submitting ? "Salvando..." : "Criar evento"}
 </button>
 <a
 href="/dashboard/agenda"
 className="inline-flex items-center gap-1.5 rounded-lg border border-nexora-border bg-white px-6 py-2.5 text-sm font-medium text-nexora-dark transition-colors hover:bg-nexora-bg-secondary"
 >
 Cancelar
 </a>
 </div>
 </form>
 );
}