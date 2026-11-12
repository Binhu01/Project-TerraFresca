import Link from "next/link";
import { ArrowLeftRight, Filter, Download } from "lucide-react";
import { getInventoryMovements, getWarehouses } from "../actions";
import { getProducts } from "@/app/dashboard/produtos/actions";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    product_id?: string;
    warehouse_id?: string;
    movement_type?: string;
  }>;
}

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  purchase_in: "Entrada (Compra)",
  sale_out: "Saída (Venda)",
  transfer_in: "Transferência (Entrada)",
  transfer_out: "Transferência (Saída)",
  adjustment_in: "Ajuste (Entrada)",
  adjustment_out: "Ajuste (Saída)",
  return_in: "Devolução (Entrada)",
  return_out: "Devolução (Saída)",
  manual_in: "Entrada Manual",
  manual_out: "Saída Manual",
};

function getMovementBadge(type: string) {
  const label = MOVEMENT_TYPE_LABELS[type] || type;

  if (type.endsWith("_in") || type === "purchase_in" || type === "manual_in" || type === "return_in") {
    return { label, className: "bg-green-100 text-green-800" };
  }
  if (type.endsWith("_out") || type === "sale_out" || type === "manual_out" || type === "return_out") {
    return { label, className: "bg-red-100 text-red-800" };
  }
  if (type.startsWith("transfer")) {
    return { label, className: "bg-blue-100 text-blue-800" };
  }
  if (type.startsWith("adjustment")) {
    return { label, className: "bg-orange-100 text-orange-800" };
  }

  return { label, className: "bg-gray-100 text-gray-700" };
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function MovimentacoesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const product_id = params.product_id || "";
  const warehouse_id = params.warehouse_id || "";
  const movement_type = params.movement_type || "";

  const [movementsData, productsData, warehouses] = await Promise.all([
    getInventoryMovements({
      page,
      perPage: 20,
      product_id: product_id || undefined,
      warehouse_id: warehouse_id || undefined,
      movement_type: movement_type || undefined,
    }),
    getProducts({ perPage: 200 }),
    getWarehouses(),
  ]);

  const { movements, total } = movementsData;
  const perPage = 20;
  const totalPages = Math.ceil(total / perPage);

  function buildFilterUrl(updates: Record<string, string>) {
    const newParams = new URLSearchParams();
    const current = {
      product_id,
      warehouse_id,
      movement_type,
      page: String(page),
    };
    const merged = { ...current, ...updates };

    Object.entries(merged).forEach(([key, value]) => {
      if (value && (value !== "1" || key === "page")) {
        newParams.set(key, value);
      }
    });

    if (!updates.page) {
      newParams.delete("page");
    }

    return `/dashboard/estoque/movimentacoes?${newParams.toString()}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-nexora-dark">
          Movimentações
        </h1>
        <button
          type="button"
          className="inline-flex items-center gap-2 border border-nexora-border text-nexora-text rounded-lg px-4 py-2 hover:bg-nexora-bg-secondary transition-colors"
        >
          <Download className="w-4 h-4" />
          Exportar
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-nexora-border p-4">
        <form className="flex flex-wrap gap-3 items-end">
          <div className="min-w-[180px]">
            <label className="block text-sm font-medium text-nexora-text mb-1">
              Produto
            </label>
            <select
              name="product_id"
              defaultValue={product_id}
              className="w-full px-3 py-2 border border-nexora-border rounded-lg bg-nexora-bg text-nexora-text focus:outline-none focus:ring-2 focus:ring-nexora-blue/20 focus:border-nexora-blue"
            >
              <option value="">Todos</option>
              {productsData.products.map((p: { id: string; name: string }) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[180px]">
            <label className="block text-sm font-medium text-nexora-text mb-1">
              Depósito
            </label>
            <select
              name="warehouse_id"
              defaultValue={warehouse_id}
              className="w-full px-3 py-2 border border-nexora-border rounded-lg bg-nexora-bg text-nexora-text focus:outline-none focus:ring-2 focus:ring-nexora-blue/20 focus:border-nexora-blue"
            >
              <option value="">Todos</option>
              {warehouses.map((w: { id: string; name: string }) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[180px]">
            <label className="block text-sm font-medium text-nexora-text mb-1">
              Tipo de Movimentação
            </label>
            <select
              name="movement_type"
              defaultValue={movement_type}
              className="w-full px-3 py-2 border border-nexora-border rounded-lg bg-nexora-bg text-nexora-text focus:outline-none focus:ring-2 focus:ring-nexora-blue/20 focus:border-nexora-blue"
            >
              <option value="">Todos</option>
              {Object.entries(MOVEMENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2 bg-nexora-blue text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <Filter className="w-4 h-4" />
            Filtrar
          </button>

          {(product_id || warehouse_id || movement_type) && (
            <Link
              href="/dashboard/estoque/movimentacoes"
              className="inline-flex items-center px-4 py-2 border border-nexora-border text-nexora-text rounded-lg hover:bg-nexora-bg-secondary transition-colors"
            >
              Limpar
            </Link>
          )}
        </form>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-xl border border-nexora-border overflow-hidden">
        {movements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-nexora-bg-secondary flex items-center justify-center mb-4">
              <ArrowLeftRight className="w-8 h-8 text-nexora-text-secondary" />
            </div>
            <h3 className="text-lg font-semibold text-nexora-dark mb-1">
              Nenhuma movimentação encontrada
            </h3>
            <p className="text-sm text-nexora-text-secondary text-center max-w-sm">
              {product_id || warehouse_id || movement_type
                ? "Tente ajustar os filtros ou limpar a busca."
                : "As movimentações de estoque aparecerão aqui quando entradas, saídas ou ajustes forem registrados."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-nexora-bg border-b border-nexora-border">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-nexora-text-secondary uppercase tracking-wider">
                    Data
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-nexora-text-secondary uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-nexora-text-secondary uppercase tracking-wider">
                    Produto
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-nexora-text-secondary uppercase tracking-wider">
                    Variante
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-nexora-text-secondary uppercase tracking-wider">
                    Quantidade
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-nexora-text-secondary uppercase tracking-wider">
                    Depósito
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-nexora-text-secondary uppercase tracking-wider">
                    Motivo
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-nexora-text-secondary uppercase tracking-wider">
                    Usuário
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexora-border">
                {movements.map((mov) => {
                  const badge = getMovementBadge(mov.movement_type);
                  const qty = Number(mov.quantity_delta);
                  const isPositive = qty > 0;
                  const qtyFormatted = `${isPositive ? "+" : ""}${qty}`;

                  return (
                    <tr
                      key={mov.id}
                      className="hover:bg-nexora-bg-secondary transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-nexora-text whitespace-nowrap">
                        {dateFormatter.format(new Date(mov.created_at))}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-nexora-text">
                        {mov.product?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-nexora-text">
                        {mov.variant?.name || "—"}
                      </td>
                      <td
                        className={`px-4 py-3 text-sm font-mono text-right font-semibold ${
                          isPositive
                            ? "text-green-700"
                            : qty < 0
                            ? "text-red-700"
                            : "text-nexora-text"
                        }`}
                      >
                        {qtyFormatted}
                      </td>
                      <td className="px-4 py-3 text-sm text-nexora-text">
                        {mov.warehouse?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-nexora-text max-w-[200px] truncate" title={mov.reason || ""}>
                        {mov.reason || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-nexora-text">
                        {mov.creator?.full_name || "—"}
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
            Mostrando página {page} de {totalPages} ({total} movimentações)
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