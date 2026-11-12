"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Archive,
  Edit,
  UserX,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { getCustomers, getCustomerStats, archiveCustomer } from "./actions";
import type { Customer } from "@/types/crm";

// --- Date Formatter ---

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatDate(iso: string): string {
  try {
    return dateFormatter.format(new Date(iso));
  } catch {
    return iso;
  }
}

// --- Skeleton ---

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-6">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="h-4 w-32 animate-pulse rounded bg-nexora-border" />
          <div className="h-4 w-16 animate-pulse rounded bg-nexora-border" />
          <div className="h-4 w-40 animate-pulse rounded bg-nexora-border" />
          <div className="h-4 w-28 animate-pulse rounded bg-nexora-border" />
          <div className="h-4 w-20 animate-pulse rounded bg-nexora-border" />
          <div className="h-4 w-16 animate-pulse rounded bg-nexora-border" />
          <div className="h-4 w-24 animate-pulse rounded bg-nexora-border" />
          <div className="ml-auto h-4 w-16 animate-pulse rounded bg-nexora-border" />
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

// --- Main Page Component ---

export default function ClientesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Filter state synced with URL
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [typeFilter, setTypeFilter] = useState(searchParams.get("type") ?? "");
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") ?? ""
  );
  const [categoryFilter, setCategoryFilter] = useState(
    searchParams.get("category") ?? ""
  );
  const [currentPage, setCurrentPage] = useState(
    Number(searchParams.get("page")) || 1
  );

  // Data state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ active: 0, inactive: 0, total: 0 });

  // Archive dialog state
  const [archiveTarget, setArchiveTarget] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (typeFilter) params.set("type", typeFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    if (currentPage > 1) params.set("page", String(currentPage));

    const qs = params.toString();
    router.replace(`/dashboard/clientes${qs ? `?${qs}` : ""}`, {
      scroll: false,
    });
  }, [debouncedSearch, typeFilter, statusFilter, categoryFilter, currentPage, router]);

  // Fetch customers when filters change
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const result = await getCustomers({
      search: debouncedSearch || undefined,
      type: typeFilter || undefined,
      status: statusFilter || undefined,
      category: categoryFilter || undefined,
      page: currentPage,
      pageSize,
    });

    setCustomers(result.customers);
    setTotal(result.total);
    setPageSize(result.pageSize);
    setLoading(false);
  }, [debouncedSearch, typeFilter, statusFilter, categoryFilter, currentPage, pageSize]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Standard async data-fetching pattern
    fetchCustomers();
  }, [fetchCustomers]);

  // Fetch stats on mount
  useEffect(() => {
    // We need orgId for stats — but getCustomerStats requires it.
    // Since we can't easily get orgId in a client component without another action,
    // we'll derive stats from the first fetch or skip if not available.
    // For now, use total from the main query as an approximation.
  }, []);

  // Update stats from fetched data when no filters are active
  useEffect(() => {
    if (!debouncedSearch && !typeFilter && !statusFilter && !categoryFilter) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing derived stats from fetched data
      setStats((prev) => ({ ...prev, total }));
    }
  }, [total, debouncedSearch, typeFilter, statusFilter, categoryFilter]);

  // Reset page when filters change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Resetting pagination on filter change is a standard pattern
    setCurrentPage(1);
  }, [debouncedSearch, typeFilter, statusFilter, categoryFilter]);

  // Clear all filters
  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setTypeFilter("");
    setStatusFilter("");
    setCategoryFilter("");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    debouncedSearch || typeFilter || statusFilter || categoryFilter;

  // Archive handler
  const handleArchive = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    const result = await archiveCustomer(archiveTarget);
    setArchiving(false);
    setArchiveTarget(null);
    if ("success" in result) {
      fetchCustomers();
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-nexora-dark">
            Clientes
          </h1>
          <p className="mt-1 text-sm text-nexora-text-secondary">
            {stats.total > 0
              ? `${stats.total} clientes cadastrados`
              : "Gerencie seus clientes"}
          </p>
        </div>
        <Link
          href="/dashboard/clientes/novo"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-nexora-blue px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-nexora-blue/90"
        >
          <Plus className="h-4 w-4" />
          Novo cliente
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="rounded-xl border border-nexora-border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-nexora-text-secondary" />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-nexora-border bg-nexora-bg-secondary py-2 pl-9 pr-3 text-sm text-nexora-dark placeholder:text-nexora-text-secondary focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-nexora-border bg-nexora-bg-secondary px-3 py-2 text-sm text-nexora-dark focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
          >
            <option value="">Todos os tipos</option>
            <option value="pf">Pessoa Física</option>
            <option value="pj">Pessoa Jurídica</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-nexora-border bg-nexora-bg-secondary px-3 py-2 text-sm text-nexora-dark focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
          >
            <option value="">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>

          {/* Category Filter */}
          <input
            type="text"
            placeholder="Categoria..."
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full rounded-lg border border-nexora-border bg-nexora-bg-secondary px-3 py-2 text-sm text-nexora-dark placeholder:text-nexora-text-secondary focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue lg:w-40"
          />

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 rounded-lg border border-nexora-border px-3 py-2 text-sm font-medium text-nexora-text-secondary hover:bg-nexora-bg-secondary hover:text-nexora-dark"
            >
              <Filter className="h-3.5 w-3.5" />
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Table Card */}
      <div className="overflow-hidden rounded-xl border border-nexora-border bg-white shadow-sm">
        {loading ? (
          <TableSkeleton />
        ) : customers.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-nexora-bg-secondary text-nexora-text-secondary">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold text-nexora-dark">
              Nenhum cliente encontrado
            </h3>
            <p className="mt-1 max-w-xs text-sm text-nexora-text-secondary">
              {hasActiveFilters
                ? "Tente ajustar os filtros ou buscar por outro termo."
                : "Comece adicionando seu primeiro cliente."}
            </p>
            {!hasActiveFilters && (
              <Link
                href="/dashboard/clientes/novo"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-nexora-blue px-4 py-2 text-sm font-medium text-white hover:bg-nexora-blue/90"
              >
                <Plus className="h-4 w-4" />
                Novo cliente
              </Link>
            )}
          </div>
        ) : (
          /* Responsive Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-nexora-border bg-nexora-bg-secondary">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-nexora-text-secondary">
                    Nome
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-nexora-text-secondary">
                    Tipo
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-nexora-text-secondary">
                    E-mail
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-nexora-text-secondary">
                    Telefone
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-nexora-text-secondary">
                    Categoria
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-nexora-text-secondary">
                    Status
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-nexora-text-secondary">
                    Cadastrado em
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-nexora-text-secondary">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexora-border">
                {customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="transition-colors hover:bg-nexora-bg-secondary/50"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-nexora-dark">
                      {customer.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          customer.customer_type === "pj"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {customer.customer_type === "pj" ? "PJ" : "PF"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-nexora-text">
                      {customer.email || (
                        <span className="text-nexora-text-secondary">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-nexora-text">
                      {customer.phone || (
                        <span className="text-nexora-text-secondary">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-nexora-text">
                      {customer.category || (
                        <span className="text-nexora-text-secondary">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          customer.status === "active"
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {customer.status === "active" ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-nexora-text">
                      {formatDate(customer.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/dashboard/clientes/${customer.id}/editar`}
                          className="rounded-md p-1.5 text-nexora-text-secondary transition-colors hover:bg-nexora-bg-secondary hover:text-nexora-blue"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => setArchiveTarget(customer.id)}
                          className="rounded-md p-1.5 text-nexora-text-secondary transition-colors hover:bg-nexora-bg-secondary hover:text-red-600"
                          title="Arquivar"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && customers.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-nexora-border px-4 py-3">
            <p className="text-sm text-nexora-text-secondary">
              Mostrando{" "}
              <span className="font-medium text-nexora-dark">
                {(currentPage - 1) * pageSize + 1}
              </span>{" "}
              –{" "}
              <span className="font-medium text-nexora-dark">
                {Math.min(currentPage * pageSize, total)}
              </span>{" "}
              de <span className="font-medium text-nexora-dark">{total}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="rounded-lg border border-nexora-border px-3 py-1.5 text-sm font-medium text-nexora-text hover:bg-nexora-bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-sm text-nexora-text-secondary">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage >= totalPages}
                className="rounded-lg border border-nexora-border px-3 py-1.5 text-sm font-medium text-nexora-text hover:bg-nexora-bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        open={!!archiveTarget}
        title="Arquivar cliente"
        message="Tem certeza que deseja arquivar este cliente? Ele será marcado como inativo e removido da lista principal."
        onConfirm={handleArchive}
        onCancel={() => setArchiveTarget(null)}
        loading={archiving}
      />
    </div>
  );
}