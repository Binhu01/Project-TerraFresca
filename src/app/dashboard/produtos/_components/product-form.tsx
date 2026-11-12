"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Package } from "lucide-react";
import { getCategories } from "@/app/dashboard/produtos/actions";
import {
  createProductSchema,
  updateProductSchema,
  variantSchema,
  type CreateProductInput,
  type UpdateProductInput,
  type VariantInput,
} from "@/app/dashboard/produtos/schemas";
import { MEASUREMENT_UNITS } from "@/types/inventory";

interface ProductFormProps {
  initialData?: UpdateProductInput & { id?: string };
  onSubmit: (data: CreateProductInput | UpdateProductInput) => Promise<{ success: boolean; id?: string }>;
  isSubmitting?: boolean;
}

export default function ProductForm({ initialData, onSubmit, isSubmitting }: ProductFormProps) {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  const schema = initialData ? updateProductSchema : createProductSchema;

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<CreateProductInput | UpdateProductInput>({
    resolver: zodResolver(schema) as never,
    defaultValues: initialData || {
      name: "",
      description: "",
      sku: "",
      barcode: "",
      brand: "",
      category_id: "",
      product_type: "physical",
      unit: "un",
      cost_price: 0,
      sale_price: 0,
      track_inventory: true,
      minimum_stock: 0,
      variants: [],
      image_url: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "variants" as never,
  });

  const watchProductType = watch("product_type");
  const watchTrackInventory = watch("track_inventory");

  useEffect(() => {
    async function loadCategories() {
      try {
        const cats = await getCategories();
        setCategories(cats);
      } catch (error) {
        console.error("Erro ao carregar categorias:", error);
      } finally {
        setIsLoadingCategories(false);
      }
    }
    loadCategories();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const addVariant = () => {
    append({
      name: "",
      sku: "",
      attributes: "",
      cost_price_override: 0,
      sale_price_override: 0,
      minimum_stock: 0,
      is_active: true,
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-4xl mx-auto bg-white rounded-xl border border-nexora-border p-6 shadow-sm"
    >
      {/* Basic Info Section */}
      <div className="mb-8">
        <h2 className="font-display text-lg font-semibold text-nexora-dark pb-3 mb-6 border-b border-nexora-border">
          Informações Básicas
        </h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-nexora-text mb-1">
              Nome do Produto *
            </label>
            <input
              id="name"
              {...register("name")}
              type="text"
              className="w-full px-3 py-2 border border-nexora-border rounded-lg focus:outline-none focus:ring-2 focus:ring-nexora-blue"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-nexora-error">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-nexora-text mb-1">
              Descrição
            </label>
            <textarea
              id="description"
              {...register("description")}
              rows={4}
              className="w-full px-3 py-2 border border-nexora-border rounded-lg focus:outline-none focus:ring-2 focus:ring-nexora-blue"
            />
            {errors.description && (
              <p className="mt-1 text-xs text-nexora-error">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="sku" className="block text-sm font-medium text-nexora-text mb-1">
                SKU
              </label>
              <input
                id="sku"
                {...register("sku")}
                type="text"
                className="w-full px-3 py-2 border border-nexora-border rounded-lg focus:outline-none focus:ring-2 focus:ring-nexora-blue"
              />
              {errors.sku && (
                <p className="mt-1 text-xs text-nexora-error">{errors.sku.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="barcode" className="block text-sm font-medium text-nexora-text mb-1">
                Código de Barras
              </label>
              <input
                id="barcode"
                {...register("barcode")}
                type="text"
                className="w-full px-3 py-2 border border-nexora-border rounded-lg focus:outline-none focus:ring-2 focus:ring-nexora-blue"
              />
              {errors.barcode && (
                <p className="mt-1 text-xs text-nexora-error">{errors.barcode.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="brand" className="block text-sm font-medium text-nexora-text mb-1">
                Marca
              </label>
              <input
                id="brand"
                {...register("brand")}
                type="text"
                className="w-full px-3 py-2 border border-nexora-border rounded-lg focus:outline-none focus:ring-2 focus:ring-nexora-blue"
              />
              {errors.brand && (
                <p className="mt-1 text-xs text-nexora-error">{errors.brand.message}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Category Section */}
      <div className="mb-8">
        <h2 className="font-display text-lg font-semibold text-nexora-dark pb-3 mb-6 border-b border-nexora-border">
          Categoria
        </h2>

        <div>
          <label htmlFor="category_id" className="block text-sm font-medium text-nexora-text mb-1">
            Categoria
          </label>
          <select
            id="category_id"
            {...register("category_id")}
            disabled={isLoadingCategories}
            className="w-full px-3 py-2 border border-nexora-border rounded-lg focus:outline-none focus:ring-2 focus:ring-nexora-blue disabled:bg-nexora-bg-secondary"
          >
            <option value="">
              {isLoadingCategories ? "Carregando categorias..." : "Selecione uma categoria"}
            </option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          {errors.category_id && (
            <p className="mt-1 text-xs text-nexora-error">{errors.category_id.message}</p>
          )}
        </div>
      </div>

      {/* Type & Pricing Section */}
      <div className="mb-8">
        <h2 className="font-display text-lg font-semibold text-nexora-dark pb-3 mb-6 border-b border-nexora-border">
          Tipo e Preços
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-nexora-text mb-2">
              Tipo de Produto
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  {...register("product_type")}
                  value="physical"
                  className="w-4 h-4 text-nexora-blue focus:ring-nexora-blue"
                />
                <span className="text-sm text-nexora-text">Físico</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  {...register("product_type")}
                  value="service"
                  className="w-4 h-4 text-nexora-blue focus:ring-nexora-blue"
                />
                <span className="text-sm text-nexora-text">Serviço</span>
              </label>
            </div>
            {errors.product_type && (
              <p className="mt-1 text-xs text-nexora-error">{errors.product_type.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="unit" className="block text-sm font-medium text-nexora-text mb-1">
                Unidade
              </label>
              <select
                id="unit"
                {...register("unit")}
                className="w-full px-3 py-2 border border-nexora-border rounded-lg focus:outline-none focus:ring-2 focus:ring-nexora-blue"
              >
                {MEASUREMENT_UNITS.map((unit) => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
              {errors.unit && (
                <p className="mt-1 text-xs text-nexora-error">{errors.unit.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="cost_price" className="block text-sm font-medium text-nexora-text mb-1">
                Preço de Custo
              </label>
              <input
                id="cost_price"
                {...register("cost_price", { valueAsNumber: true })}
                type="number"
                step="0.01"
                className="w-full px-3 py-2 border border-nexora-border rounded-lg focus:outline-none focus:ring-2 focus:ring-nexora-blue"
              />
              {errors.cost_price && (
                <p className="mt-1 text-xs text-nexora-error">{errors.cost_price.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="sale_price" className="block text-sm font-medium text-nexora-text mb-1">
                Preço de Venda *
              </label>
              <input
                id="sale_price"
                {...register("sale_price", { valueAsNumber: true })}
                type="number"
                step="0.01"
                className="w-full px-3 py-2 border border-nexora-border rounded-lg focus:outline-none focus:ring-2 focus:ring-nexora-blue"
              />
              {errors.sale_price && (
                <p className="mt-1 text-xs text-nexora-error">{errors.sale_price.message}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Section */}
      <div className="mb-8">
        <h2 className="font-display text-lg font-semibold text-nexora-dark pb-3 mb-6 border-b border-nexora-border">
          Estoque
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label htmlFor="track_inventory" className="text-sm font-medium text-nexora-text">
              Controlar Estoque
            </label>
            <input
              id="track_inventory"
              {...register("track_inventory")}
              type="checkbox"
              disabled={watchProductType === "service"}
              className="w-5 h-5 text-nexora-blue focus:ring-nexora-blue rounded disabled:bg-nexora-bg-secondary disabled:cursor-not-allowed"
            />
          </div>

          {watchTrackInventory && watchProductType !== "service" && (
            <div>
              <label htmlFor="minimum_stock" className="block text-sm font-medium text-nexora-text mb-1">
                Estoque Mínimo
              </label>
              <input
                id="minimum_stock"
                {...register("minimum_stock", { valueAsNumber: true })}
                type="number"
                className="w-full px-3 py-2 border border-nexora-border rounded-lg focus:outline-none focus:ring-2 focus:ring-nexora-blue"
              />
              {errors.minimum_stock && (
                <p className="mt-1 text-xs text-nexora-error">{errors.minimum_stock.message}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Variants Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between pb-3 mb-6 border-b border-nexora-border">
          <h2 className="font-display text-lg font-semibold text-nexora-dark">
            Variantes
          </h2>
          <button
            type="button"
            onClick={addVariant}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-nexora-blue text-white rounded-lg hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-nexora-blue"
          >
            <Plus size={16} />
            Adicionar Variante
          </button>
        </div>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="p-4 bg-nexora-bg-secondary rounded-lg border border-nexora-border"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Package size={18} className="text-nexora-blue" />
                  <span className="font-medium text-nexora-text">
                    Variante {index + 1}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-nexora-error hover:text-opacity-80"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-nexora-text mb-1">
                    Nome da Variante
                  </label>
                  <input
                    {...register(`variants.${index}.name` as never)}
                    type="text"
                    className="w-full px-3 py-2 border border-nexora-border rounded-lg focus:outline-none focus:ring-2 focus:ring-nexora-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-nexora-text mb-1">
                    SKU da Variante
                  </label>
                  <input
                    {...register(`variants.${index}.sku` as never)}
                    type="text"
                    className="w-full px-3 py-2 border border-nexora-border rounded-lg focus:outline-none focus:ring-2 focus:ring-nexora-blue"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-nexora-text mb-1">
                  Atributos (JSON)
                </label>
                <input
                  {...register(`variants.${index}.attributes` as never)}
                  type="text"
                  placeholder='{"cor": "vermelho", "tamanho": "M"}'
                  className="w-full px-3 py-2 border border-nexora-border rounded-lg focus:outline-none focus:ring-2 focus:ring-nexora-blue font-mono text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-nexora-text mb-1">
                    Preço de Custo
                  </label>
                  <input
                    {...register(`variants.${index}.cost_price_override` as never, { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    className="w-full px-3 py-2 border border-nexora-border rounded-lg focus:outline-none focus:ring-2 focus:ring-nexora-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-nexora-text mb-1">
                    Preço de Venda
                  </label>
                  <input
                    {...register(`variants.${index}.sale_price_override` as never, { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    className="w-full px-3 py-2 border border-nexora-border rounded-lg focus:outline-none focus:ring-2 focus:ring-nexora-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-nexora-text mb-1">
                    Estoque Mínimo
                  </label>
                  <input
                    {...register(`variants.${index}.minimum_stock` as never, { valueAsNumber: true })}
                    type="number"
                    className="w-full px-3 py-2 border border-nexora-border rounded-lg focus:outline-none focus:ring-2 focus:ring-nexora-blue"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-nexora-text">
                  Ativo
                </label>
                <input
                  {...register(`variants.${index}.is_active` as never)}
                  type="checkbox"
                  className="w-5 h-5 text-nexora-blue focus:ring-nexora-blue rounded"
                />
              </div>
            </div>
          ))}

          {fields.length === 0 && (
            <p className="text-sm text-nexora-text-secondary text-center py-8">
              Nenhuma variante adicionada. Clique em "Adicionar Variante" para começar.
            </p>
          )}
        </div>
      </div>

      {/* Image Section */}
      <div className="mb-8">
        <h2 className="font-display text-lg font-semibold text-nexora-dark pb-3 mb-6 border-b border-nexora-border">
          Imagem
        </h2>

        <div>
          <label htmlFor="image_url" className="block text-sm font-medium text-nexora-text mb-1">
            URL da Imagem
          </label>
          <input
            id="image_url"
            {...register("image_url")}
            type="text"
            placeholder="https://exemplo.com/imagem.jpg"
            className="w-full px-3 py-2 border border-nexora-border rounded-lg focus:outline-none focus:ring-2 focus:ring-nexora-blue"
          />
          {errors.image_url && (
            <p className="mt-1 text-xs text-nexora-error">{errors.image_url.message}</p>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4 border-t border-nexora-border">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 bg-nexora-blue text-white font-medium rounded-lg hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-nexora-blue disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? "Salvando..."
            : initialData
            ? "Atualizar Produto"
            : "Criar Produto"}
        </button>
      </div>
    </form>
  );
}