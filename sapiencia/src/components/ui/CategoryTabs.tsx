import { SUBCATEGORIAS, type TipoConteudo } from '../../data/repertorios'

interface CategoryTabsProps {
  activeTab: TipoConteudo | ''
  onTabChange: (tab: TipoConteudo | '') => void
  counts: Record<TipoConteudo, number>
}

export default function CategoryTabs({ activeTab, onTabChange, counts }: CategoryTabsProps) {
  const total = Object.values(counts).reduce((sum, c) => sum + c, 0)

  return (
    <div
      role="tablist"
      aria-label="Subcategorias de repertório"
      className="flex overflow-x-auto gap-1 pb-2 scrollbar-hide -mx-2 px-2 sm:mx-0 sm:px-0 sm:flex-wrap"
    >
      {/* Aba "Todos" */}
      <button
        role="tab"
        aria-selected={activeTab === ''}
        onClick={() => onTabChange('')}
        className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-display font-medium transition-all duration-200 whitespace-nowrap ${
          activeTab === ''
            ? 'bg-brand-purple text-brand-beige shadow-sm'
            : 'bg-brand-purple/10 dark:bg-brand-lavender/15 text-brand-graphite/70 dark:text-brand-lavender/70 hover:bg-brand-purple/20 dark:hover:bg-brand-lavender/25'
        }`}
      >
        <span>📋</span>
        <span>Todos</span>
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
          activeTab === ''
            ? 'bg-brand-beige/20 text-brand-beige'
            : 'bg-brand-purple/10 dark:bg-brand-lavender/10 text-brand-graphite/50 dark:text-brand-lavender/50'
        }`}>
          {total}
        </span>
      </button>

      {/* Abas por subcategoria */}
      {SUBCATEGORIAS.map((sub) => {
        const count = counts[sub.key]
        if (count === 0) return null

        const isActive = activeTab === sub.key

        return (
          <button
            key={sub.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(sub.key)}
            className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-display font-medium transition-all duration-200 whitespace-nowrap ${
              isActive
                ? 'bg-brand-purple text-brand-beige shadow-sm'
                : 'bg-brand-purple/10 dark:bg-brand-lavender/15 text-brand-graphite/70 dark:text-brand-lavender/70 hover:bg-brand-purple/20 dark:hover:bg-brand-lavender/25'
            }`}
          >
            <span>{sub.icon}</span>
            <span>{sub.label}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              isActive
                ? 'bg-brand-beige/20 text-brand-beige'
                : 'bg-brand-purple/10 dark:bg-brand-lavender/10 text-brand-graphite/50 dark:text-brand-lavender/50'
            }`}>
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}