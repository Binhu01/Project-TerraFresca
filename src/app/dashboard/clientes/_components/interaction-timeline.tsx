"use client";

import { useState } from "react";
import {
  Phone,
  MessageCircle,
  Mail,
  Calendar,
  FileText,
  MoreHorizontal,
  Plus,
  X,
} from "lucide-react";
import { createInteraction } from "@/lib/crm/interactions";
import type { InteractionType } from "@/types/crm";

interface InteractionEntry {
  id: string;
  type: string;
  description: string;
  occurred_at: string;
  creator_name: string;
}

interface InteractionTimelineProps {
  interactions: InteractionEntry[];
  targetType: "customer" | "lead";
  targetId: string;
}

const typeIcons: Record<string, React.ElementType> = {
  call: Phone,
  message: MessageCircle,
  email: Mail,
  meeting: Calendar,
  note: FileText,
  other: MoreHorizontal,
};

const typeLabels: Record<string, string> = {
  call: "Ligação",
  message: "Mensagem",
  email: "E-mail",
  meeting: "Reunião",
  note: "Nota",
  other: "Outro",
};

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function InteractionTimeline({
  interactions,
  targetType,
  targetId,
}: InteractionTimelineProps) {
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<InteractionType>("note");
  const [formDescription, setFormDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localInteractions, setLocalInteractions] = useState(interactions);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formDescription.trim()) return;

    setSubmitting(true);

    const payload = {
      type: formType,
      description: formDescription.trim(),
      ...(targetType === "customer"
        ? { customerId: targetId }
        : { leadId: targetId }),
    };

    const result = await createInteraction(payload);

    if ("interaction" in result && result.interaction) {
      const newEntry: InteractionEntry = {
        id: (result.interaction as { id: string }).id,
        type: formType,
        description: formDescription.trim(),
        occurred_at: new Date().toISOString(),
        creator_name: "Você",
      };
      setLocalInteractions([newEntry, ...localInteractions]);
      setFormDescription("");
      setShowForm(false);
    }

    setSubmitting(false);
  }

  return (
    <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-nexora-text-secondary" />
          <h2 className="text-base font-semibold text-nexora-dark">
            Histórico de Interações
          </h2>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-nexora-border bg-white px-3 py-1.5 text-sm font-medium text-nexora-text transition-colors hover:bg-nexora-bg-secondary hover:text-nexora-dark"
          >
            <Plus className="h-4 w-4" />
            Nova interação
          </button>
        )}
      </div>

      {/* New interaction form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-lg border border-nexora-border bg-nexora-bg-secondary p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-nexora-dark">
              Registrar interação
            </span>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-nexora-text-secondary hover:text-nexora-dark"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-nexora-text-secondary">
                Tipo
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as InteractionType)}
                className="w-full rounded-lg border border-nexora-border bg-white px-3 py-2 text-sm text-nexora-text focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="note">Nota</option>
                <option value="call">Ligação</option>
                <option value="message">Mensagem</option>
                <option value="email">E-mail</option>
                <option value="meeting">Reunião</option>
                <option value="other">Outro</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-nexora-text-secondary">
                Descrição
              </label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Descreva a interação..."
                rows={3}
                required
                className="w-full rounded-lg border border-nexora-border bg-white px-3 py-2 text-sm text-nexora-text placeholder:text-nexora-text-secondary/60 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !formDescription.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
              >
                {submitting ? "Salvando..." : "Salvar interação"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Timeline entries */}
      {localInteractions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-nexora-bg-secondary">
            <Calendar className="h-6 w-6 text-nexora-text-secondary" />
          </div>
          <p className="text-sm font-medium text-nexora-text">
            Nenhuma interação registrada
          </p>
          <p className="mt-1 text-xs text-nexora-text-secondary">
            Registre ligações, e-mails, reuniões e notas para acompanhar o
            relacionamento com este cliente.
          </p>
        </div>
      ) : (
        <div className="relative space-y-0">
          {/* Vertical line */}
          <div className="absolute left-[19px] top-2 bottom-2 w-px bg-nexora-border" />

          {localInteractions.map((entry, idx) => {
            const Icon = typeIcons[entry.type] ?? MoreHorizontal;
            const label = typeLabels[entry.type] ?? entry.type;
            const isLast = idx === localInteractions.length - 1;

            return (
              <div key={entry.id} className={`relative flex gap-4 ${isLast ? "" : "pb-6"}`}>
                {/* Icon node */}
                <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-nexora-border bg-white">
                  <Icon className="h-4 w-4 text-teal-600" />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1 pt-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-flex items-center rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
                        {label}
                      </span>
                      <p className="mt-1.5 text-sm text-nexora-text">
                        {entry.description}
                      </p>
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-nexora-text-secondary">
                    <span>{formatDateTime(entry.occurred_at)}</span>
                    <span className="text-nexora-border">|</span>
                    <span>{entry.creator_name}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}