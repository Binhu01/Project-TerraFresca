import { Plus, Tags, TrendingUp, TrendingDown } from "lucide-react";
import { getCategories } from "../actions";

export default async function CategoriasPage() {
  const [incomeCategories, expenseCategories] = await Promise.all([
    getCategories("income"),
    getCategories("expense"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-nexora-dark">
          Categorias Financeiras
        </h1>
        <button className="inline-flex items-center gap-2 rounded-lg bg-nexora-blue px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90">
          <Plus className="h-4 w-4" />
          Nova Categoria
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Income Categories */}
        <div className="rounded-xl border border-nexora-border bg-white">
          <div className="flex items-center gap-2 border-b border-nexora-border px-5 py-4">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold text-nexora-dark">Receitas</h2>
            <span className="ml-auto rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
              {incomeCategories.length}
            </span>
          </div>
          <div className="divide-y divide-nexora-border">
            {incomeCategories.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-nexora-text-secondary">
                Nenhuma categoria de receita cadastrada.
              </p>
            ) : (
              incomeCategories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Tags className="h-4 w-4 text-nexora-text-secondary" />
                    <span className={`text-sm ${!cat.is_active ? "text-nexora-text-secondary line-through" : "text-nexora-dark"}`}>
                      {cat.name}
                    </span>
                  </div>
                  {!cat.is_active && (
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Inativa</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Expense Categories */}
        <div className="rounded-xl border border-nexora-border bg-white">
          <div className="flex items-center gap-2 border-b border-nexora-border px-5 py-4">
            <TrendingDown className="h-5 w-5 text-nexora-error" />
            <h2 className="text-lg font-semibold text-nexora-dark">Despesas</h2>
            <span className="ml-auto rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
              {expenseCategories.length}
            </span>
          </div>
          <div className="divide-y divide-nexora-border">
            {expenseCategories.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-nexora-text-secondary">
                Nenhuma categoria de despesa cadastrada.
              </p>
            ) : (
              expenseCategories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Tags className="h-4 w-4 text-nexora-text-secondary" />
                    <span className={`text-sm ${!cat.is_active ? "text-nexora-text-secondary line-through" : "text-nexora-dark"}`}>
                      {cat.name}
                    </span>
                  </div>
                  {!cat.is_active && (
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Inativa</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}