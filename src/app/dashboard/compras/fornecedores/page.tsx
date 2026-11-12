import { headers } from "next/headers";
import Link from "next/link";
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  Archive,
  Mail,
  Phone,
  MapPin,
  Package,
} from "lucide-react";
import { getSuppliers } from "../actions";
import type { SupplierStatus, SupplierType } from "@/types/purchases";

const STATUS_BADGE: Record<SupplierStatus, { label: string; color: string }> = {
  active: { label: "Ativo", color: "bg-green-100 text-green-700" },
  inactive: { label: "Inativo", color: "bg-gray-100 text-gray-600" },
};

const TYPE_LABEL: Record<SupplierType, string> = {
  company: "Pessoa jurídica",
  individual: "Pessoa física",
};

export default async function FornecedoresPage(props: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await headers();
  const params = await props.searchParams;
  const search = params.q ?? "";
  const statusFilter = (params.status as SupplierStatus | undefined) ?? undefined;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const perPage = 20;
  const result = await getSuppliers({ search, status: statusFilter, page, perPage });
  const totalPages = Math.max(1, Math.ceil(result.total / perPage));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-nexora-dark">Fornecedores</h1>
          <p className="mt-1 text-sm text-nexora-text-secondary">
            Gerencie fornecedores, contatos e endereços · {result.total} registros
          </p>
        </div>
        <Link
          href="/dashboard/compras/fornecedores/novo"
          className="inline-flex items-center gap-2 rounded-lg bg-nexora-blue px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-nexora-blue/90"
        >
          <Plus className="h-4 w-4" />
          Novo fornecedor
        </Link>
      </div>

      {/* Filters */}
      <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-nexora-text-secondary" />
          <input
            name="q"
            defaultValue={search}
            placeholder="Buscar por nome, email ou documento…"
            className="w-full rounded-lg border border-nexora-border bg-white py-2.5 pl-10 pr-4 text-sm text-nexora-dark placeholder:text-nexora-text-secondary/60 focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
          />
        </div>
        <select
          name="status"
          defaultValue={statusFilter ?? ""}
          className="rounded-lg border border-nexora-border bg-white px-3 py-2.5 text-sm text-nexora-dark focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
        >
          <option value="">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
        <button
          type="submit"
          className="rounded-lg border border-nexora-border bg-white px-4 py-2.5 text-sm font-medium text-nexora-dark transition-colors hover:bg-nexora-bg-secondary"
        >
          Filtrar
        </button>
      </form>

      {/* Table */}
      {result.suppliers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-nexora-border bg-white py-16 text-center">
          <Users className="mb-4 h-12 w-12 text-nexora-text-secondary/30" />
          <p className="text-base font-medium text-nexora-dark">Nenhum fornecedor encontrado</p>
          <p className="mt-1 text-sm text-nexora-text-secondary">
            {search || statusFilter
              ? "Tente ajustar os filtros de busca."
              : "Cadastre seu primeiro fornecedor para começar."}
          </p>
          {!search && !statusFilter && (
            <Link
              href="/dashboard/compras/fornecedores/novo"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-nexora-blue px-4 py-2 text-sm font-semibold text-white hover:bg-nexora-blue/90"
            >
              <Plus className="h-4 w-4" />
              Cadastrar fornecedor
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-nexora-border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-nexora-border bg-nexora-bg-secondary/50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-nexora-dark">Fornecedor</th>
                  <th className="px-4 py-3 font-semibold text-nexora-dark">Contato</th>
                  <th className="px-4 py-3 font-semibold text-nexora-dark">Categoria</th>
                  <th className="px-4 py-3 font-semibold text-nexora-dark">Tipo</th>
                  <th className="px-4 py-3 font-semibold text-nexora-dark">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-nexora-dark">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexora-border">
                {result.suppliers.map((supplier) => {
                  const badge = STATUS_BADGE[supplier.status];
                  return (
                    <tr key={supplier.id} className="transition-colors hover:bg-nexora-bg-secondary/30">
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/compras/fornecedores/${supplier.id}`}
                          className="block font-medium text-nexora-dark hover:text-nexora-blue"
                        >
                          {supplier.trade_name || supplier.legal_name}
                        </Link>
                        {supplier.trade_name && (
                          <p className="text-xs text-nexora-text-secondary">{supplier.legal_name}</p>
                        )}
                        {supplier.document && (
                          <p className="text-xs text-nexora-text-secondary">{supplier.document}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5 text-xs text-nexora-text-secondary">
                          {supplier.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {supplier.email}
                            </span>
                          )}
                          {supplier.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {supplier.phone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-nexora-text-secondary">
                        {supplier.category ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-nexora-text-secondary">
                        {TYPE_LABEL[supplier.supplier_type]}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/dashboard/compras/fornecedores/${supplier.id}`}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-nexora-blue hover:bg-nexora-blue/10"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                          Detalhes
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-nexora-border px-4 py-3">
              <p className="text-xs text-nexora-text-secondary">
                Página {result.page} de {totalPages} · {result.total} fornecedores
              </p>
              <div className="flex gap-2">
                {result.page > 1 && (
                  <Link
                    href={{ query: { ...params, page: String(result.page - 1) } }}
                    className="rounded-md border border-nexora-border px-3 py-1.5 text-xs font-medium text-nexora-dark hover:bg-nexora-bg-secondary"
                  >
                    Anterior
                  </Link>
                )}
                {result.page < totalPages && (
                  <Link
                    href={{ query: { ...params, page: String(result.page + 1) } }}
                    className="rounded-md border border-nexora-border px-3 py-1.5 text-xs font-medium text-nexora-dark hover:bg-nexora-bg-secondary"
                  >
                    Próxima
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}