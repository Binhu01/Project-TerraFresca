"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Store,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import {
  getSalesChannels,
  createChannel,
  updateChannel,
  deleteChannel,
} from "../actions";
import type { SalesChannel } from "@/types/sales";

// --- Confirm Dialog ---

function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl border border-nexora-border bg-white p-6 shadow-lg">
        <h3 className="font-display text-lg font-semibold text-nexora-dark">
          {title}
        </h3>
        <p className="mt-2 text-sm text-nexora-text-secondary">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-nexora-border px-4 py-2 text-sm font-medium text-nexora-text hover:bg-nexora-bg-secondary disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Excluindo..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Main Page ---

export default function CanaisPage() {
  const [channels, setChannels] = useState<SalesChannel[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSalesChannels();
      setChannels(data);
    } catch {
      // Error handled by server action
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Standard async data-fetching pattern
    fetchChannels();
  }, [fetchChannels]);

  // --- Handlers ---

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createChannel({
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        is_active: true,
      });
      setNewName("");
      setNewDescription("");
      await fetchChannels();
    } catch {
      // Error handled by server action
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (channel: SalesChannel) => {
    setEditingId(channel.id);
    setEditName(channel.name);
    setEditDescription(channel.description ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditDescription("");
  };

  const handleSave = async () => {
    if (!editingId || !editName.trim()) return;
    setSaving(true);
    try {
      const channel = channels.find((c) => c.id === editingId);
      await updateChannel(editingId, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        is_active: channel?.is_active ?? true,
      });
      cancelEdit();
      await fetchChannels();
    } catch {
      // Error handled by server action
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (channel: SalesChannel) => {
    try {
      await updateChannel(channel.id, {
        name: channel.name,
        description: channel.description ?? undefined,
        is_active: !channel.is_active,
      });
      await fetchChannels();
    } catch {
      // Error handled by server action
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteChannel(deleteTarget);
      setDeleteTarget(null);
      await fetchChannels();
    } catch {
      // Error handled by server action
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-nexora-dark">
          Canais de Venda
        </h1>
        <p className="mt-1 text-sm text-nexora-text-secondary">
          Gerencie os canais por onde suas vendas são realizadas
        </p>
      </div>

      {/* Inline Create Form */}
      <div className="rounded-xl border border-nexora-border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-nexora-text-secondary">
              Nome do canal
            </label>
            <input
              type="text"
              placeholder="Ex: Loja Online, WhatsApp, Balcão..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="w-full rounded-lg border border-nexora-border bg-nexora-bg-secondary px-3 py-2 text-sm text-nexora-dark placeholder:text-nexora-text-secondary focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            />
          </div>
          <div className="flex-[2]">
            <label className="mb-1 block text-xs font-medium text-nexora-text-secondary">
              Descrição (opcional)
            </label>
            <input
              type="text"
              placeholder="Descrição breve do canal..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="w-full rounded-lg border border-nexora-border bg-nexora-bg-secondary px-3 py-2 text-sm text-nexora-dark placeholder:text-nexora-text-secondary focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={!newName.trim() || creating}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-nexora-blue px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-nexora-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {creating ? "Adicionando..." : "Adicionar"}
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="overflow-hidden rounded-xl border border-nexora-border bg-white shadow-sm">
        {loading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-4 w-32 animate-pulse rounded bg-nexora-border" />
                <div className="h-4 w-48 animate-pulse rounded bg-nexora-border" />
                <div className="h-4 w-16 animate-pulse rounded bg-nexora-border" />
                <div className="ml-auto h-4 w-24 animate-pulse rounded bg-nexora-border" />
              </div>
            ))}
          </div>
        ) : channels.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-nexora-bg-secondary text-nexora-text-secondary">
              <Store className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold text-nexora-dark">
              Nenhum canal cadastrado
            </h3>
            <p className="mt-1 max-w-xs text-sm text-nexora-text-secondary">
              Adicione seu primeiro canal de venda usando o formulário acima.
            </p>
          </div>
        ) : (
          /* Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-nexora-border bg-nexora-bg-secondary">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-nexora-text-secondary">
                    Nome
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-nexora-text-secondary">
                    Descrição
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-nexora-text-secondary">
                    Status
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-nexora-text-secondary">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexora-border">
                {channels.map((channel) => {
                  const isEditing = editingId === channel.id;

                  if (isEditing) {
                    return (
                      <tr key={channel.id} className="bg-nexora-bg-secondary/30">
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full rounded-md border border-nexora-border bg-white px-2 py-1.5 text-sm text-nexora-dark focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
                            autoFocus
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="w-full rounded-md border border-nexora-border bg-white px-2 py-1.5 text-sm text-nexora-dark focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              channel.is_active
                                ? "bg-green-50 text-green-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {channel.is_active ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={handleSave}
                              disabled={saving || !editName.trim()}
                              className="rounded-md p-1.5 text-nexora-text-secondary transition-colors hover:bg-nexora-bg-secondary hover:text-nexora-success disabled:opacity-50"
                              title="Salvar"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={saving}
                              className="rounded-md p-1.5 text-nexora-text-secondary transition-colors hover:bg-nexora-bg-secondary hover:text-nexora-error"
                              title="Cancelar"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={channel.id}
                      className="transition-colors hover:bg-nexora-bg-secondary/50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-nexora-dark">
                        {channel.name}
                      </td>
                      <td className="px-4 py-3 text-nexora-text">
                        {channel.description || (
                          <span className="text-nexora-text-secondary">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(channel)}
                          className="group inline-flex items-center gap-1.5"
                          title={
                            channel.is_active
                              ? "Clique para desativar"
                              : "Clique para ativar"
                          }
                        >
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                              channel.is_active
                                ? "bg-green-50 text-green-700 group-hover:bg-green-100"
                                : "bg-red-50 text-red-700 group-hover:bg-red-100"
                            }`}
                          >
                            {channel.is_active ? "Ativo" : "Inativo"}
                          </span>
                          {channel.is_active ? (
                            <ToggleRight className="h-3.5 w-3.5 text-green-600 opacity-0 transition-opacity group-hover:opacity-100" />
                          ) : (
                            <ToggleLeft className="h-3.5 w-3.5 text-red-600 opacity-0 transition-opacity group-hover:opacity-100" />
                          )}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => startEdit(channel)}
                            className="rounded-md p-1.5 text-nexora-text-secondary transition-colors hover:bg-nexora-bg-secondary hover:text-nexora-blue"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(channel.id)}
                            className="rounded-md p-1.5 text-nexora-text-secondary transition-colors hover:bg-nexora-bg-secondary hover:text-red-600"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir canal"
        message="Tem certeza que deseja excluir este canal? Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}