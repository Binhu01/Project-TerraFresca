"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertTriangle, Loader2, UserPlus, X } from "lucide-react";
import {
  convertLeadToCustomer,
  checkLeadDuplicates,
} from "@/lib/crm/conversion";
import type { Customer } from "@/types/crm";

interface ConvertLeadButtonProps {
  leadId: string;
  leadName: string;
  leadEmail: string | null;
  leadPhone: string | null;
}

type ModalState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "duplicates"; duplicates: Customer[] }
  | { kind: "confirm" }
  | { kind: "converting" }
  | { kind: "error"; message: string };

export default function ConvertLeadButton({
  leadId,
  leadName,
  leadEmail,
  leadPhone,
}: ConvertLeadButtonProps) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalState>({ kind: "idle" });

  async function handleClick() {
    setModal({ kind: "checking" });

    try {
      // Check for duplicate customers first without converting.
      const { duplicates } = await checkLeadDuplicates({
        email: leadEmail,
        phone: leadPhone,
      });

      if (duplicates.length > 0) {
        setModal({ kind: "duplicates", duplicates });
        return;
      }

      // No duplicates — show confirmation modal with pre-filled data.
      setModal({ kind: "confirm" });
    } catch (err) {
      setModal({
        kind: "error",
        message: err instanceof Error ? err.message : "Erro inesperado",
      });
    }
  }

  async function handleForceConvert() {
    setModal({ kind: "converting" });

    try {
      const result = await convertLeadToCustomer(leadId, undefined, true);

      if ("success" in result && result.success) {
        router.push(`/dashboard/clientes/${result.customer.id}`);
        router.refresh();
        return;
      }

      if ("error" in result) {
        setModal({ kind: "error", message: result.error });
      }
    } catch (err) {
      setModal({
        kind: "error",
        message: err instanceof Error ? err.message : "Erro inesperado",
      });
    }
  }

  async function handleConfirmConvert() {
    setModal({ kind: "converting" });

    try {
      const result = await convertLeadToCustomer(leadId);

      if ("success" in result && result.success) {
        router.push(`/dashboard/clientes/${result.customer.id}`);
        router.refresh();
        return;
      }

      if ("error" in result) {
        setModal({ kind: "error", message: result.error });
      }
    } catch (err) {
      setModal({
        kind: "error",
        message: err instanceof Error ? err.message : "Erro inesperado",
      });
    }
  }

  function closeModal() {
    setModal({ kind: "idle" });
  }

  const isOpen = modal.kind !== "idle";
  const isLoading =
    modal.kind === "checking" || modal.kind === "converting";

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="h-4 w-4" />
        )}
        Converter em Cliente
      </button>

      {/* Modal overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-nexora-border bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-nexora-border px-5 py-4">
              <h3 className="text-base font-semibold text-nexora-dark">
                {modal.kind === "checking" && "Verificando duplicados..."}
                {modal.kind === "duplicates" && "Clientes duplicados encontrados"}
                {modal.kind === "confirm" && "Confirmar conversão"}
                {modal.kind === "converting" && "Convertendo lead..."}
                {modal.kind === "error" && "Erro na conversão"}
              </h3>
              {!isLoading && (
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-nexora-text-secondary hover:text-nexora-dark"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Body */}
            <div className="px-5 py-4">
              {modal.kind === "checking" && (
                <div className="flex flex-col items-center gap-3 py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                  <p className="text-sm text-nexora-text-secondary">
                    Verificando se já existem clientes com os mesmos dados...
                  </p>
                </div>
              )}

              {modal.kind === "duplicates" && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <p className="text-sm text-amber-800">
                      Foram encontrados clientes com e-mail ou telefone
                      semelhantes. Deseja continuar mesmo assim?
                    </p>
                  </div>
                  <ul className="max-h-48 space-y-2 overflow-y-auto">
                    {modal.duplicates.map((dup) => (
                      <li
                        key={dup.id}
                        className="rounded-lg border border-nexora-border px-3 py-2 text-sm"
                      >
                        <p className="font-medium text-nexora-dark">
                          {dup.name}
                        </p>
                        <div className="mt-0.5 text-xs text-nexora-text-secondary">
                          {dup.email && <span>{dup.email}</span>}
                          {dup.email && dup.phone && <span> &middot; </span>}
                          {dup.phone && <span>{dup.phone}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {modal.kind === "confirm" && (
                <div className="space-y-3">
                  <p className="text-sm text-nexora-text">
                    O lead{" "}
                    <strong className="text-nexora-dark">{leadName}</strong>{" "}
                    será convertido em um novo cliente com os seguintes dados:
                  </p>
                  <dl className="rounded-lg border border-nexora-border bg-nexora-bg-secondary px-3 py-2.5 text-sm">
                    <div className="flex justify-between py-1">
                      <dt className="text-nexora-text-secondary">Nome</dt>
                      <dd className="font-medium text-nexora-dark">
                        {leadName}
                      </dd>
                    </div>
                    {leadEmail && (
                      <div className="flex justify-between py-1">
                        <dt className="text-nexora-text-secondary">E-mail</dt>
                        <dd className="text-nexora-text">{leadEmail}</dd>
                      </div>
                    )}
                    {leadPhone && (
                      <div className="flex justify-between py-1">
                        <dt className="text-nexora-text-secondary">Telefone</dt>
                        <dd className="text-nexora-text">{leadPhone}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {modal.kind === "converting" && (
                <div className="flex flex-col items-center gap-3 py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                  <p className="text-sm text-nexora-text-secondary">
                    Criando cliente e vinculando ao lead...
                  </p>
                </div>
              )}

              {modal.kind === "error" && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <p className="text-sm text-red-800">{modal.message}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {!isLoading && (
              <div className="flex items-center justify-end gap-2 border-t border-nexora-border px-5 py-3">
                {modal.kind === "duplicates" && (
                  <>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="rounded-lg border border-nexora-border bg-white px-3 py-2 text-sm font-medium text-nexora-text transition-colors hover:bg-nexora-bg-secondary"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleForceConvert}
                      className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
                    >
                      Continuar mesmo assim
                    </button>
                  </>
                )}
                {modal.kind === "confirm" && (
                  <>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="rounded-lg border border-nexora-border bg-white px-3 py-2 text-sm font-medium text-nexora-text transition-colors hover:bg-nexora-bg-secondary"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmConvert}
                      className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
                    >
                      Confirmar conversão
                    </button>
                  </>
                )}
                {modal.kind === "error" && (
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-lg border border-nexora-border bg-white px-3 py-2 text-sm font-medium text-nexora-text transition-colors hover:bg-nexora-bg-secondary"
                  >
                    Fechar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}