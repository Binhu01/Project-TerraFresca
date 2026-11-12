"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Edit,
  Archive,
  FolderTree,
  ChevronRight,
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  getCategories,
  createCategory,
  updateCategory,
  archiveCategory,
} from "../actions";
import {
  createCategorySchema,
  updateCategorySchema,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from "../schemas";
import type { ProductCategory } from "@/types/inventory";

// --- Skeleton ---

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-6">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="h-4 w-32 animate-pulse rounded bg-nexora-border" />
          <div className="h-4 w-48 animate-pulse rounded bg-nexora-border" />
          <div className="h-4 w-16 animate-pulse rounded bg-nexora-border" />
          <div className="h-4 w-20 animate-pulse rounded bg-nexora-border" />
          <div className="ml-auto h-4 w-24 animate-pulse rounded bg-nexora-border" />
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
            {loading ? "Arquivando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Inline Create Form ---

function InlineCreateForm({
  categories,
  onSave,
  onCancel,
  saving,
}: {
  categories: ProductCategory[];
  onSave: (data: CreateCategoryInput) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const form = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: "",
      description: "",
      parent_id: null,
    },
  });

  return (
    <form
      onSubmit={form.handleSubmit(onSave)}
      className="mb-6 rounded-xl border border-nexora-border bg-nexora-bg-secondary p-5"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-1">
          <label className="mb-1 block text-xs font-medium text-nexora-text-secondary">
            Nome *
          </label>
          <input
            {...form.register("name")}
            placeholder="Ex: Hortifruti"
            className="w-full rounded-lg border border-nexora-border bg-white px-3 py-2 text-sm text-nexora-dark outline-none focus:border-nexora-primary focus:ring-1 focus:ring-nexora-primary"
          />
          {form.formState.errors.name && (
            <p className="mt-1 text-xs text-red-500">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>

        <div className="sm:col-span-1">
          <label className="mb-1 block text-xs font-medium text-nexora-text-secondary">
            Descrição
          </label>
          <input
            {...form.register("description")}
            placeholder="Descrição opcional"
            className="w-full rounded-lg border border-nexora-border bg-white px-3 py-2 text-sm text-nexora-dark outline-none focus:border-nexora-primary focus:ring-1 focus:ring-nexora-primary"
          />
        </div>

        <div className="sm:col-span-1">
          <label className="mb-1 block text-xs font-medium text-nexora-text-secondary">
            Categoria Pai
          </label>
          <select
            {...form.register("parent_id")}
            className="w-full rounded-lg border border-nexora-border bg-white px-3 py-2 text-sm text-nexora-dark outline-none focus:border-nexora-primary focus:ring-1 focus:ring-nexora-primary"
          >
            <option value="">Nenhuma (raiz)</option>
            {categories
              .filter((c) => c.is_active)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </div>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-nexora-primary px-4 py-2 text-sm font-medium text-white hover:bg-nexora-primary/90 disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg border border-nexora-border px-4 py-2 text-sm font-medium text-nexora-text hover:bg-nexora-bg-secondary disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </form>
  );
}

// --- Inline Edit Row ---

function InlineEditRow({
  category,
  allCategories,
  onSave,
  onCancel,
  saving,
}: {
  category: ProductCategory;
  allCategories: ProductCategory[];
  onSave: (id: string, data: UpdateCategoryInput) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const form = useForm<UpdateCategoryInput>({
    resolver: zodResolver(updateCategorySchema),
    defaultValues: {
      name: category.name,
      description: category.description ?? "",
      parent_id: category.parent_id ?? null,
      is_active: category.is_active,
    },
  });

  return (
    <tr className="border-b border-nexora-border bg-nexora-bg-secondary/50">
      <td className="px-4 py-3">
        <input
          {...form.register("name")}
          className="w-full rounded border border-nexora-border bg-white px-2 py-1 text-sm text-nexora-dark outline-none focus:border-nexora-primary"
        />
        {form.formState.errors.name && (
          <p className="mt-0.5 text-xs text-red-500">
            {form.formState.errors.name.message}
          </p>
        )}
      </td>
      <td className="px-4 py-3">
        <input
          {...form.register("description")}
          className="w-full rounded border border-nexora-border bg-white px-2 py-1 text-sm text-nexora-dark outline-none focus:border-nexora-primary"
        />
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-nexora-text-secondary">—</span>
      </td>
      <td className="px-4 py-3">
        <select
          {...form.register("parent_id")}
          className="w-full rounded border border-nexora-border bg-white px-2 py-1 text-sm text-nexora-dark outline-none focus:border-nexora-primary"
        >
          <option value="">Nenhuma (raiz)</option>
          {allCategories
            .filter((c) => c.id !== category.id && c.is_active)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <label className="inline-flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            {...form.register("is_active")}
            className="rounded border-nexora-border text-nexora-primary focus:ring-nexora-primary"
          />
          <span className="text-xs text-nexora-text-secondary">Ativa</span>
        </label>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => form.handleSubmit((data) => onSave(category.id, data))()}
            disabled={saving}
            className="rounded p-1.5 text-xs font-medium text-nexora-primary hover:bg-nexora-primary/10 disabled:opacity-50"
          >
            {saving ? "..." : "Salvar"}
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            className="rounded p-1.5 text-xs font-medium text-nexora-text-secondary hover:bg-nexora-bg-secondary disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </td>
    </tr>
  );
}

// --- Main Page Component ---

export default function CategoriasPage() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Archive confirmation state
  const [archiveTarget, setArchiveTarget] = useState<ProductCategory | null>(
    null
  );
  const [archiving, setArchiving] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      console.error("Erro ao carregar categorias:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load — use a ref guard to avoid setState-in-effect lint error
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      void fetchCategories();
    }
  }, [fetchCategories]);

  // --- Handlers ---

  async function handleCreate(data: CreateCategoryInput) {
    setSaving(true);
    try {
      await createCategory(data);
      setShowCreateForm(false);
      await fetchCategories();
    } catch (err) {
      console.error("Erro ao criar categoria:", err);
      alert(
        err instanceof Error
          ? err.message
          : "Erro desconhecido ao criar categoria."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string, data: UpdateCategoryInput) {
    setSaving(true);
    try {
      await updateCategory(id, data);
      setEditingId(null);
      await fetchCategories();
    } catch (err) {
      console.error("Erro ao atualizar categoria:", err);
      alert(
        err instanceof Error
          ? err.message
          : "Erro desconhecido ao atualizar categoria."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await archiveCategory(archiveTarget.id);
      setArchiveTarget(null);
      await fetchCategories();
    } catch (err) {
      console.error("Erro ao arquivar categoria:", err);
      alert(
        err instanceof Error
          ? err.message
          : "Erro desconhecido ao arquivar categoria."
      );
    } finally {
      setArchiving(false);
    }
  }

  // --- Render helpers ---

  function getParentName(parentId: string | null): string {
    if (!parentId) return "—";
    const parent = categories.find((c) => c.id === parentId);
    return parent?.name ?? "—";
  }

  // --- Render ---

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-nexora-dark">
            Categorias
          </h1>
          <p className="mt-1 text-sm text-nexora-text-secondary">
            Gerencie as categorias de produtos da sua organização.
          </p>
        </div>
        {!showCreateForm && (
          <button
            onClick={() => {
              setEditingId(null);
              setShowCreateForm(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-nexora-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-nexora-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nova Categoria
          </button>
        )}
      </div>

      {/* Inline Create Form */}
      {showCreateForm && (
        <InlineCreateForm
          categories={categories}
          onSave={handleCreate}
          onCancel={() => setShowCreateForm(false)}
          saving={saving}
        />
      )}

      {/* Categories Table */}
      <div className="overflow-hidden rounded-xl border border-nexora-border bg-white shadow-sm">
        {loading ? (
          <TableSkeleton />
        ) : categories.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-nexora-bg-secondary">
              <FolderTree className="h-7 w-7 text-nexora-text-secondary" />
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold text-nexora-dark">
              Nenhuma categoria cadastrada
            </h3>
            <p className="mt-1 max-w-xs text-sm text-nexora-text-secondary">
              Crie categorias para organizar seus produtos e facilitar a gestão
              do catálogo.
            </p>
            {!showCreateForm && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-nexora-primary px-4 py-2 text-sm font-medium text-white hover:bg-nexora-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Criar primeira categoria
              </button>
            )}
          </div>
        ) : (
          /* Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-nexora-border bg-nexora-bg-secondary/60">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">
                    Nome
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">
                    Descrição
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">
                    Produtos Ativos
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">
                    Categoria Pai
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-nexora-text-secondary">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexora-border">
                {categories.map((category) =>
                  editingId === category.id ? (
                    <InlineEditRow
                      key={category.id}
                      category={category}
                      allCategories={categories}
                      onSave={handleUpdate}
                      onCancel={() => setEditingId(null)}
                      saving={saving}
                    />
                  ) : (
                    <tr
                      key={category.id}
                      className="group transition-colors hover:bg-nexora-bg-secondary/40"
                    >
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-nexora-dark">
                          {category.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-nexora-text-secondary">
                          {category.description || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-nexora-bg-secondary px-2.5 py-0.5 text-xs font-medium text-nexora-text-secondary">
                          —
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-nexora-text-secondary">
                          {getParentName(category.parent_id)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {category.is_active ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Ativa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-nexora-bg-secondary px-2.5 py-0.5 text-xs font-medium text-nexora-text-secondary">
                            <span className="h-1.5 w-1.5 rounded-full bg-nexora-text-secondary" />
                            Arquivada
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => {
                              setShowCreateForm(false);
                              setEditingId(category.id);
                            }}
                            title="Editar"
                            className="rounded p-1.5 text-nexora-text-secondary hover:bg-nexora-bg-secondary hover:text-nexora-primary"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {category.is_active && (
                            <button
                              onClick={() => setArchiveTarget(category)}
                              title="Arquivar"
                              className="rounded p-1.5 text-nexora-text-secondary hover:bg-red-50 hover:text-red-600"
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        open={!!archiveTarget}
        title="Arquivar categoria"
        message={`Tem certeza que deseja arquivar a categoria "${archiveTarget?.name}"? Ela não poderá ser usada em novos produtos até ser reativada.`}
        onConfirm={handleArchive}
        onCancel={() => setArchiveTarget(null)}
        loading={archiving}
      />
    </div>
  );
}