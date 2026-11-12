import Link from "next/link";
import { Plus, Search, Package, Archive, AlertTriangle, Filter } from "lucide-react";
import { getProducts, getProductStats, getCategories } from "./actions";
import { getActiveOrganization } from "@/lib/organizations";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    category_id?: string;
    product_type?: string;
    status?: string;
    page?: string;
  }>;
}

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function ProdutosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.search || "";
  const category_id = params.category_id || "";
  const product_type = params.product_type || "";
  const status = params.status || "";
  const page = parseInt(params.page || "1", 10);

  const [organization, productsData, categories] = await Promise.all([
    getActiveOrganization(),
    getProducts({
      search: search || undefined,
      category_id: category_id || undefined,
      product_type: product_type || undefined,
      is_active: status === "active" ? true : status === "inactive" ? false : undefined,
      page,
    }),
    getCategories(),
  ]);

  const orgId = organization?.org?.id;
  const stats = orgId ? await getProductStats(orgId) : null;

  const { products, total } = productsData;
  const perPage = 20;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  function buildFilterUrl(updates: Record<string, string>) {
    const newParams = new URLSearchParams();
    const current = { search, category_id, product_type, status, page: String(page) };
    const merged = { ...current, ...updates };

    Object.entries(merged).forEach(([key, value]) => {
      if (value && value !== "1" || key === "search" && value) {
        newParams.set(key, value);
      }
    });

    // Reset page to 1 when filters change (unless we're explicitly changing page)
    if (!updates.page) {
      newParams.delete("page");
    }

    return `/dashboard/produtos?${newParams.toString()}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-nexora-dark">
          Produtos
        </h1>
        <Link
          href="/dashboard/produtos/novo"
          className="inline-flex items-center gap-2 bg-nexora-blue text-white rounded-lg px-4 py-2 hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Novo Produto
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-nexora-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-nexora-bg-secondary flex items-center justify-center">
              <Package className="w-5 h-5 text-nexora-text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-nexora-dark">{stats?.total_products ?? 0}</p>
              <p className="text-sm text-nexora-text-secondary">Total de Produtos</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-nexora-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <Package className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-nexora-dark">{stats?.active_products ?? 0}</p>
              <p className="text-sm text-nexora-text-secondary">Produtos Ativos</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-nexora-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-nexora-dark">{stats?.low_stock_count ?? 0}</p>
              <p className="text-sm text-nexora-text-secondary">Estoque Baixo</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-nexora-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <Archive className="w-5 h-5 text-nexora-error" />
            </div>
            <div>
              <p className="text-2xl font-bold text-nexora-dark">{stats?.out_of_stock_count ?? 0}</p>
              <p className="text-sm text-nexora-text-secondary">Sem Estoque</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-nexora-border p-4">
        <form className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-nexora-text mb-1">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nexora-text-secondary" />
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Nome ou SKU..."
                className="w-full pl-9 pr-3 py-2 border border-nexora-border rounded-lg bg-nexora-bg text-nexora-text placeholder:text-nexora-text-secondary focus:outline-none focus:ring-2 focus:ring-nexora-blue/20 focus:border-nexora-blue"
              />
            </div>
          </div>

          <div className="min-w-[160px]">
            <label className="block text-sm font-medium text-nexora-text mb-1">
              Categoria
            </label>
            <select
              name="category_id"
              defaultValue={category_id}
              className="w-full px-3 py-2 border border-nexora-border rounded-lg bg-nexora-bg text-nexora-text focus:outline-none focus:ring-2 focus:ring-nexora-blue/20 focus:border-nexora-blue"
            >
              <option value="">Todas</option>
              {categories.map((cat: { id: string; name: string }) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[160px]">
            <label className="block text-sm font-medium text-nexora-text mb-1">
              Tipo
            </label>
            <select
              name="product_type"
              defaultValue={product_type}
              className="w-full px-3 py-2 border border-nexora-border rounded-lg bg-nexora-bg text-nexora-text focus:outline-none focus:ring-2 focus:ring-nexora-blue/20 focus:border-nexora-blue"
            >
              <option value="">Todos</option>
              <option value="physical">Físico</option>
                            <option value="service">Serviço</option>
            </select>
          </div>

          <div className="min-w-[160px]">
            <label className="block text-sm font-medium text-nexora-text mb-1">
              Status
            </label>
            <select
              name="status"
              defaultValue={status}
              className="w-full px-3 py-2 border border-nexora-border rounded-lg bg-nexora-bg text-nexora-text focus:outline-none focus:ring-2 focus:ring-nexora-blue/20 focus:border-nexora-blue"
            >
              <option value="">Todos</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2 bg-nexora-blue text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <Filter className="w-4 h-4" />
            Filtrar
          </button>

          {(search || category_id || product_type || status) && (
            <Link
              href="/dashboard/produtos"
              className="inline-flex items-center px-4 py-2 border border-nexora-border text-nexora-text rounded-lg hover:bg-nexora-bg-secondary transition-colors"
            >
              Limpar
            </Link>
          )}
        </form>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-nexora-border overflow-hidden">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-nexora-bg-secondary flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-nexora-text-secondary" />
            </div>
            <h3 className="text-lg font-semibold text-nexora-dark mb-1">
              Nenhum produto encontrado
            </h3>
            <p className="text-sm text-nexora-text-secondary text-center max-w-sm">
              {search || category_id || product_type || status
                ? "Tente ajustar os filtros ou limpar a busca."
                : "Comece adicionando seu primeiro produto ao catálogo."}
            </p>
            {!search && !category_id && !product_type && !status && (
              <Link
                href="/dashboard/produtos/novo"
                className="mt-4 inline-flex items-center gap-2 bg-nexora-blue text-white rounded-lg px-4 py-2 hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                Adicionar Produto
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-nexora-bg border-b border-nexora-border">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-nexora-text-secondary uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-nexora-text-secondary uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-nexora-text-secondary uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-nexora-text-secondary uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-nexora-text-secondary uppercase tracking-wider">
                    Preço
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-nexora-text-secondary uppercase tracking-wider">
                    Estoque
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-nexora-text-secondary uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexora-border">
                {products.map((product) => {
                  const categoryName = (product.category as { name: string } | null)?.name ?? null;
                  return (
                  <tr
                    key={product.id}
                    className="hover:bg-nexora-bg-secondary transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/produtos/${product.id}`}
                        className="font-medium text-nexora-dark hover:text-nexora-blue transition-colors"
                      >
                        {product.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-nexora-text">
                      {product.sku || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-nexora-text">
                      {categoryName || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-nexora-text capitalize">
                      {product.product_type === "physical"
                        ? "Físico"
                        : product.product_type === "service"
                        ? "Serviço"
                        : product.product_type}
                    </td>
                    <td className="px-4 py-3 text-sm text-nexora-text text-right font-mono">
                      {brlFormatter.format(Number(product.sale_price))}
                    </td>
                    <td className="px-4 py-3 text-sm text-nexora-text text-right">
                      <span className={product.track_inventory ? "" : "text-nexora-text-secondary italic"}>
                        {product.track_inventory ? "—" : "N/A"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          product.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {product.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-nexora-text-secondary">
            Mostrando página {page} de {totalPages} ({total} produtos)
          </p>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link
                href={buildFilterUrl({ page: String(page - 1) })}
                className="px-4 py-2 border border-nexora-border rounded-lg text-sm text-nexora-text hover:bg-nexora-bg-secondary transition-colors"
              >
                Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={buildFilterUrl({ page: String(page + 1) })}
                className="px-4 py-2 border border-nexora-border rounded-lg text-sm text-nexora-text hover:bg-nexora-bg-secondary transition-colors"
              >
                Próxima
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}