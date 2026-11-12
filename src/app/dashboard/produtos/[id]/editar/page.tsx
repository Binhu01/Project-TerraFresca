import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import ProductForm from "../../_components/product-form";
import { getProductById, updateProduct } from "../../actions";
import type { UpdateProductInput } from "../../schemas";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  const initialData: UpdateProductInput & { id?: string } = {
    id: product.id,
    name: product.name,
    description: product.description ?? "",
    image_url: product.image_url ?? null,
    sku: product.sku ?? null,
    barcode: product.barcode ?? null,
    brand: product.brand ?? null,
    category_id: product.category_id ?? null,
    product_type: product.product_type as "physical" | "service",
    unit: product.unit ?? "un",
    cost_price: product.cost_price ?? null,
    sale_price: product.sale_price,
    track_inventory: product.track_inventory ?? false,
    minimum_stock: product.minimum_stock ?? 0,
    is_active: product.is_active ?? true,
    variants: (product.variants ?? []).map((v) => ({
      id: v.id,
      name: v.name,
      attributes: v.attributes ?? {},
      sku: v.sku ?? null,
      barcode: v.barcode ?? null,
      cost_price_override: v.cost_price_override ?? null,
      sale_price_override: v.sale_price_override ?? null,
      minimum_stock: v.minimum_stock ?? 0,
      is_active: v.is_active ?? true,
    })),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/produtos/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-nexora-text-secondary hover:text-nexora-blue transition-colors"
        >
          <ChevronLeft size={16} />
          Voltar ao Produto
        </Link>
      </div>

      <div>
        <h1 className="font-display text-2xl font-bold text-nexora-dark">
          Editar Produto
        </h1>
        <p className="mt-1 text-sm text-nexora-text-secondary">
          Atualize as informações do produto abaixo.
        </p>
      </div>

      <ProductForm
        initialData={initialData}
        onSubmit={async (data) => {
          "use server";
          return updateProduct(id, data as UpdateProductInput);
        }}
      />
    </div>
  );
}