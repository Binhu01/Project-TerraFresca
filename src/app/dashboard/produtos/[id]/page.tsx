import {
  ArrowLeft,
  Edit,
  Archive,
  Package,
  Warehouse,
  Tag,
  DollarSign,
  Hash,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductById, archiveProduct } from "../actions";
import { getInventoryMovements } from "../../estoque/actions";

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

function formatBRL(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  purchase: "Compra",
  sale: "Venda",
  adjustment_in: "Ajuste (+)",
  adjustment_out: "Ajuste (-)",
  transfer_in: "Transferência (Entrada)",
  transfer_out: "Transferência (Saída)",
  return_in: "Devolução (Entrada)",
  return_out: "Devolução (Saída)",
};

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  physical: "Físico",
  service: "Serviço",
  digital: "Digital",
  bundle: "Kit",
};

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  const movementsResult = await getInventoryMovements({
    product_id: id,
    perPage: 10,
  });
  const movements = movementsResult.movements ?? [];

  const typeLabel =
    PRODUCT_TYPE_LABELS[product.product_type] ?? product.product_type;

  const balances =
    (product.balances as Array<{
      quantity_on_hand: number;
      quantity_reserved: number;
      warehouse: { id: string; name: string; code: string };
    }>) ?? [];

  const variants =
    (product.variants as Array<{
      id: string;
      name: string;
      sku: string | null;
      attributes: Record<string, string> | null;
      cost_price_override: number | null;
      sale_price_override: number | null;
      minimum_stock: number;
      is_active: boolean;
    }>) ?? [];

  async function handleArchive() {
    "use server";
    await archiveProduct(id);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/produtos"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-nexora-border text-nexora-text-secondary transition-colors hover:bg-nexora-bg-secondary hover:text-nexora-dark"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-nexora-dark">
              {product.name}
            </h1>
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              {typeLabel}
            </span>
            {!product.is_active && (
              <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                Arquivado
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-nexora-text-secondary">
            Detalhes do produto
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/produtos/${id}/editar`}
            className="inline-flex items-center gap-2 rounded-lg border border-nexora-border bg-white px-3 py-2 text-sm font-medium text-nexora-text transition-colors hover:bg-nexora-bg-secondary hover:text-nexora-dark"
          >
            <Edit className="h-4 w-4" />
            Editar
          </Link>
          {product.is_active && (
            <form action={handleArchive}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                <Archive className="h-4 w-4" />
                Arquivar
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Dados do Produto */}
        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-nexora-text-secondary" />
            <h2 className="text-base font-semibold text-nexora-dark">
              Dados do Produto
            </h2>
          </div>
          <dl className="space-y-4">
            <div>
              <dt className="text-xs text-nexora-text-secondary">Nome</dt>
              <dd className="text-sm font-medium text-nexora-text">
                {product.name}
              </dd>
            </div>
            {product.description && (
              <div>
                <dt className="text-xs text-nexora-text-secondary">Descrição</dt>
                <dd className="whitespace-pre-wrap text-sm text-nexora-text">
                  {product.description}
                </dd>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="flex items-center gap-1 text-xs text-nexora-text-secondary">
                  <Hash className="h-3 w-3" />
                  SKU
                </dt>
                <dd className="text-sm font-medium text-nexora-text">
                  {product.sku || "—"}
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-1 text-xs text-nexora-text-secondary">
                  <Hash className="h-3 w-3" />
                  Código de Barras
                </dt>
                <dd className="text-sm font-medium text-nexora-text">
                  {product.barcode || "—"}
                </dd>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="flex items-center gap-1 text-xs text-nexora-text-secondary">
                  <Tag className="h-3 w-3" />
                  Marca
                </dt>
                <dd className="text-sm font-medium text-nexora-text">
                  {product.brand || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-nexora-text-secondary">Categoria</dt>
                <dd className="text-sm font-medium text-nexora-text">
                  {(product.category as { name: string } | null)?.name || "—"}
                </dd>
              </div>
            </div>
            <div>
              <dt className="text-xs text-nexora-text-secondary">Unidade</dt>
              <dd className="text-sm font-medium text-nexora-text">
                {product.unit}
              </dd>
            </div>
          </dl>
        </div>

        {/* Preços */}
        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-nexora-text-secondary" />
            <h2 className="text-base font-semibold text-nexora-dark">Preços</h2>
          </div>
          <dl className="space-y-4">
            <div>
              <dt className="text-xs text-nexora-text-secondary">Preço de Custo</dt>
              <dd className="text-sm font-medium text-nexora-text">
                {formatBRL(product.cost_price)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-nexora-text-secondary">Preço de Venda</dt>
              <dd className="text-lg font-semibold text-nexora-dark">
                {formatBRL(product.sale_price)}
              </dd>
            </div>
            {product.cost_price != null && product.sale_price != null && (
              <div>
                <dt className="text-xs text-nexora-text-secondary">Margem</dt>
                <dd className="text-sm font-medium text-nexora-text">
                  {Number(product.cost_price) > 0
                    ? `${(((Number(product.sale_price) - Number(product.cost_price)) / Number(product.cost_price)) * 100).toFixed(1)}%`
                    : "—"}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-nexora-text-secondary">Estoque Mínimo</dt>
              <dd className="text-sm font-medium text-nexora-text">
                {product.minimum_stock} {product.unit}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-nexora-text-secondary">Controle de Estoque</dt>
              <dd className="text-sm font-medium text-nexora-text">
                {product.track_inventory ? "Ativado" : "Desativado"}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Inventory Balances */}
      {product.track_inventory && balances.length > 0 && (
        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-nexora-text-secondary" />
            <h2 className="text-base font-semibold text-nexora-dark">
              Saldo por Depósito
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-nexora-border text-xs text-nexora-text-secondary">
                  <th className="pb-2 font-medium">Depósito</th>
                  <th className="pb-2 font-medium text-right">Em Estoque</th>
                  <th className="pb-2 font-medium text-right">Reservado</th>
                  <th className="pb-2 font-medium text-right">Disponível</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexora-border">
                {balances.map((balance) => {
                  const onHand = Number(balance.quantity_on_hand);
                  const reserved = Number(balance.quantity_reserved);
                  const available = onHand - reserved;
                  const isLow = available <= product.minimum_stock;
                  return (
                    <tr key={balance.warehouse.id}>
                      <td className="py-3 font-medium text-nexora-text">
                        {balance.warehouse.name}
                      </td>
                      <td className="py-3 text-right text-nexora-text">
                        {onHand}
                      </td>
                      <td className="py-3 text-right text-nexora-text">
                        {reserved}
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={
                            isLow
                              ? "font-medium text-amber-600"
                              : "text-nexora-text"
                          }
                        >
                          {available}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-nexora-text-secondary">
            Estoque mínimo configurado: {product.minimum_stock} {product.unit}
          </p>
        </div>
      )}

      {/* Variants */}
      {variants.length > 0 && (
        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Tag className="h-5 w-5 text-nexora-text-secondary" />
            <h2 className="text-base font-semibold text-nexora-dark">
              Variantes
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-nexora-border text-xs text-nexora-text-secondary">
                  <th className="pb-2 font-medium">Nome</th>
                  <th className="pb-2 font-medium">SKU</th>
                  <th className="pb-2 font-medium">Atributos</th>
                  <th className="pb-2 font-medium text-right">Custo</th>
                  <th className="pb-2 font-medium text-right">Venda</th>
                  <th className="pb-2 font-medium text-right">Est. Mín.</th>
                  <th className="pb-2 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexora-border">
                {variants.map((variant) => (
                  <tr key={variant.id}>
                    <td className="py-3 font-medium text-nexora-text">
                      {variant.name}
                    </td>
                    <td className="py-3 text-nexora-text">
                      {variant.sku || "—"}
                    </td>
                    <td className="py-3 text-nexora-text">
                      {variant.attributes
                        ? Object.entries(variant.attributes)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(", ")
                        : "—"}
                    </td>
                    <td className="py-3 text-right text-nexora-text">
                      {formatBRL(variant.cost_price_override)}
                    </td>
                    <td className="py-3 text-right text-nexora-text">
                      {formatBRL(variant.sale_price_override)}
                    </td>
                    <td className="py-3 text-right text-nexora-text">
                      {variant.minimum_stock}
                    </td>
                    <td className="py-3 text-center">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                          variant.is_active
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-gray-200 bg-gray-100 text-gray-600"
                        }`}
                      >
                        {variant.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Movements */}
      {movements.length > 0 && (
        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-nexora-text-secondary" />
            <h2 className="text-base font-semibold text-nexora-dark">
              Movimentações Recentes
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-nexora-border text-xs text-nexora-text-secondary">
                  <th className="pb-2 font-medium">Data</th>
                  <th className="pb-2 font-medium">Tipo</th>
                  <th className="pb-2 font-medium text-right">Quantidade</th>
                  <th className="pb-2 font-medium">Depósito</th>
                  <th className="pb-2 font-medium">Motivo</th>
                  <th className="pb-2 font-medium">Usuário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexora-border">
                {movements.map((movement) => {
                  const qty = Number(movement.quantity_delta);
                  return (
                    <tr key={movement.id}>
                      <td className="py-3 text-nexora-text">
                        {formatDateTime(movement.created_at)}
                      </td>
                      <td className="py-3 text-nexora-text">
                        {MOVEMENT_TYPE_LABELS[movement.movement_type] ??
                          movement.movement_type}
                      </td>
                      <td
                        className={`py-3 text-right font-medium ${
                          qty > 0 ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {qty > 0 ? `+${qty}` : qty}
                      </td>
                      <td className="py-3 text-nexora-text">
                        {(movement.warehouse as { name: string } | null)?.name ??
                          "—"}
                      </td>
                      <td className="max-w-[200px] truncate py-3 text-nexora-text" title={movement.reason ?? ""}>
                        {movement.reason || "—"}
                      </td>
                      <td className="py-3 text-nexora-text">
                        {(movement.creator as { full_name: string } | null)
                          ?.full_name ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}