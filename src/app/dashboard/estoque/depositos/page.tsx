"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Warehouse,
  MapPin,
  Check,
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  getWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
} from "../actions";
import {
  createWarehouseSchema,
  updateWarehouseSchema,
  type CreateWarehouseInput,
  type UpdateWarehouseInput,
} from "../schemas";
import type { Warehouse as WarehouseType } from "@/types/inventory";

// --- Skeleton ---

function CardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-nexora-border bg-white p-5"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="h-5 w-32 animate-pulse rounded bg-nexora-border" />
              <div className="h-4 w-20 animate-pulse rounded bg-nexora-border" />
            </div>
            <div className="h-6 w-16 animate-pulse rounded-full bg-nexora-border" />
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-nexora-border" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-nexora-border" />
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Confirmation Dialog ---

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
            {loading ? "Excluindo..." : "Excluir"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Create/Edit Modal ---

function WarehouseModal({
  open,
  mode,
  warehouse,
  onSave,
  onCancel,
  saving,
}: {
  open: boolean;
  mode: "create" | "edit";
  warehouse: WarehouseType | null;
  onSave: (data: CreateWarehouseInput | UpdateWarehouseInput) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const isEdit = mode === "edit";

  const form = useForm<CreateWarehouseInput | UpdateWarehouseInput>({
    resolver: zodResolver(
      isEdit ? updateWarehouseSchema : createWarehouseSchema
    ) as never,
    defaultValues:
      isEdit && warehouse
        ? {
            name: warehouse.name,
            code: warehouse.code,
            address: warehouse.address ?? "",
            description: warehouse.description ?? "",
            is_default: warehouse.is_default,
            is_active: warehouse.is_active,
          }
        : {
            name: "",
            code: "",
            address: "",
            description: "",
            is_default: false,
          },
  });

  useEffect(() => {
    if (open) {
      if (isEdit && warehouse) {
        form.reset({
          name: warehouse.name,
          code: warehouse.code,
          address: warehouse.address ?? "",
          description: warehouse.description ?? "",
          is_default: warehouse.is_default,
          is_active: warehouse.is_active,
        });
      } else {
        form.reset({
          name: "",
          code: "",
          address: "",
          description: "",
          is_default: false,
        });
      }
    }
  }, [open, isEdit, warehouse, form]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl border border-nexora-border bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-nexora-dark">
            {isEdit ? "Editar Depósito" : "Novo Depósito"}
          </h3>
          <button
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg p-1.5 text-nexora-text-secondary hover:bg-nexora-bg-secondary disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={form.handleSubmit(onSave)} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-nexora-text-secondary">
                Nome *
              </label>
              <input
                {...form.register("name")}
                placeholder="Ex: Depósito Central"
                className="w-full rounded-lg border border-nexora-border bg-white px-3 py-2 text-sm text-nexora-dark outline-none focus:border-nexora-primary focus:ring-1 focus:ring-nexora-primary"
              />
              {form.formState.errors.name && (
                <p className="mt-1 text-xs text-red-500">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-nexora-text-secondary">
                Código *
              </label>
              <input
                {...form.register("code")}
                placeholder="Ex: DEP-01"
                className="w-full rounded-lg border border-nexora-border bg-white px-3 py-2 text-sm text-nexora-dark outline-none focus:border-nexora-primary focus:ring-1 focus:ring-nexora-primary"
              />
              {form.formState.errors.code && (
                <p className="mt-1 text-xs text-red-500">
                  {form.formState.errors.code.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-nexora-text-secondary">
              Endereço
            </label>
            <input
              {...form.register("address")}
              placeholder="Endereço completo do depósito"
              className="w-full rounded-lg border border-nexora-border bg-white px-3 py-2 text-sm text-nexora-dark outline-none focus:border-nexora-primary focus:ring-1 focus:ring-nexora-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-nexora-text-secondary">
              Descrição
            </label>
            <textarea
              {...form.register("description")}
              rows={3}
              placeholder="Descrição opcional do depósito"
              className="w-full resize-none rounded-lg border border-nexora-border bg-white px-3 py-2 text-sm text-nexora-dark outline-none focus:border-nexora-primary focus:ring-1 focus:ring-nexora-primary"
            />
          </div>

          <div className="flex items-center gap-6">
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                {...form.register("is_default")}
                className="rounded border-nexora-border text-nexora-primary focus:ring-nexora-primary"
              />
              <span className="text-sm text-nexora-text">Depósito padrão</span>
            </label>

            {isEdit && (
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  {...(
                    form as ReturnType<typeof useForm<UpdateWarehouseInput>>
                  ).register("is_active")}
                  className="rounded border-nexora-border text-nexora-primary focus:ring-nexora-primary"
                />
                <span className="text-sm text-nexora-text">Ativo</span>
              </label>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="rounded-lg border border-nexora-border px-4 py-2 text-sm font-medium text-nexora-text hover:bg-nexora-bg-secondary disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-nexora-primary px-4 py-2 text-sm font-medium text-white hover:bg-nexora-primary/90 disabled:opacity-50"
            >
              {saving ? "Salvando..." : isEdit ? "Atualizar" : "Criar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Main Page Component ---

export default function DepositosPage() {
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingWarehouse, setEditingWarehouse] =
    useState<WarehouseType | null>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<WarehouseType | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchWarehouses = useCallback(async () => {
    try {
      const data = await getWarehouses();
      setWarehouses(data);
    } catch (err) {
      console.error("Erro ao carregar depósitos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load — use a ref guard to avoid setState-in-effect lint error
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      void fetchWarehouses();
    }
  }, [fetchWarehouses]);

  // --- Handlers ---

  function openCreateModal() {
    setModalMode("create");
    setEditingWarehouse(null);
    setModalOpen(true);
  }

  function openEditModal(warehouse: WarehouseType) {
    setModalMode("edit");
    setEditingWarehouse(warehouse);
    setModalOpen(true);
  }

  async function handleSave(
    data: CreateWarehouseInput | UpdateWarehouseInput
  ) {
    setSaving(true);
    try {
      if (modalMode === "edit" && editingWarehouse) {
        await updateWarehouse(
          editingWarehouse.id,
          data as UpdateWarehouseInput
        );
      } else {
        await createWarehouse(data as CreateWarehouseInput);
      }
      setModalOpen(false);
      setEditingWarehouse(null);
      await fetchWarehouses();
    } catch (err) {
      console.error("Erro ao salvar depósito:", err);
      alert(
        err instanceof Error
          ? err.message
          : "Erro desconhecido ao salvar depósito."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteWarehouse(deleteTarget.id);
      setDeleteTarget(null);
      await fetchWarehouses();
    } catch (err) {
      console.error("Erro ao excluir depósito:", err);
      alert(
        err instanceof Error
          ? err.message
          : "Erro desconhecido ao excluir depósito."
      );
    } finally {
      setDeleting(false);
    }
  }

  // --- Render ---

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-nexora-dark">
            Depósitos
          </h1>
          <p className="mt-1 text-sm text-nexora-text-secondary">
            Gerencie os depósitos e locais de armazenamento da sua organização.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-nexora-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-nexora-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo Depósito
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <CardSkeleton />
      ) : warehouses.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-xl border border-nexora-border bg-white py-16 text-center shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-nexora-bg-secondary">
            <Warehouse className="h-7 w-7 text-nexora-text-secondary" />
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold text-nexora-dark">
            Nenhum depósito cadastrado
          </h3>
          <p className="mt-1 max-w-xs text-sm text-nexora-text-secondary">
            Crie depósitos para organizar o controle de estoque por local físico
            ou centro de distribuição.
          </p>
          <button
            onClick={openCreateModal}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-nexora-primary px-4 py-2 text-sm font-medium text-white hover:bg-nexora-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Criar primeiro depósito
          </button>
        </div>
      ) : (
        /* Warehouses Grid */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {warehouses.map((warehouse) => (
            <div
              key={warehouse.id}
              className="group relative rounded-xl border border-nexora-border bg-white p-5 shadow-sm transition-colors hover:border-nexora-primary/30 hover:shadow-md"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-display text-base font-semibold text-nexora-dark">
                      {warehouse.name}
                    </h3>
                    {warehouse.is_default && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                        <Check className="h-3 w-3" />
                        Padrão
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs font-medium text-nexora-text-secondary">
                    {warehouse.code}
                  </p>
                </div>

                {/* Status Badge */}
                {warehouse.is_active ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Ativo
                  </span>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-nexora-bg-secondary px-2.5 py-0.5 text-xs font-medium text-nexora-text-secondary">
                    <span className="h-1.5 w-1.5 rounded-full bg-nexora-text-secondary" />
                    Inativo
                  </span>
                )}
              </div>

              {/* Address */}
              {warehouse.address && (
                <div className="mt-3 flex items-start gap-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-nexora-text-secondary" />
                  <p className="text-sm text-nexora-text-secondary line-clamp-2">
                    {warehouse.address}
                  </p>
                </div>
              )}

              {/* Description */}
              {warehouse.description && (
                <p className="mt-2 text-sm text-nexora-text-secondary line-clamp-2">
                  {warehouse.description}
                </p>
              )}

              {/* Actions */}
              <div className="mt-4 flex items-center justify-end gap-1 border-t border-nexora-border pt-3 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => openEditModal(warehouse)}
                  title="Editar"
                  className="rounded-lg p-1.5 text-nexora-text-secondary hover:bg-nexora-bg-secondary hover:text-nexora-primary"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(warehouse)}
                  title="Excluir"
                  className="rounded-lg p-1.5 text-nexora-text-secondary hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <WarehouseModal
        open={modalOpen}
        mode={modalMode}
        warehouse={editingWarehouse}
        onSave={handleSave}
        onCancel={() => {
          setModalOpen(false);
          setEditingWarehouse(null);
        }}
        saving={saving}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir depósito"
        message={`Tem certeza que deseja excluir o depósito "${deleteTarget?.name}"? Esta ação não pode ser desfeita. Depósitos com saldo ou movimentações não podem ser excluídos.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}