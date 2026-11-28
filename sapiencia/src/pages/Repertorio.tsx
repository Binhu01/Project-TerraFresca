import { useState, useMemo } from 'react'
import {
  REPERTORIOS,
  TEMAS_REPERTORIO,
  countBySubcategoria,
  filterRepertorios,
  type Repertorio,
  type TipoConteudo,
} from '../data/repertorios'
import { getFavorites, toggleFavorite } from '../services/storage'
import CategoryTabs from '../components/ui/CategoryTabs'
import ResourceCard from '../components/ui/ResourceCard'

export default function Repertorio() {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<TipoConteudo | ''>('')
  const [selectedTheme, setSelectedTheme] = useState<string>('')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set(getFavorites()))

  const handleToggleFavorite = (id: string) => {
    const added = toggleFavorite(id)
    setFavorites((prev) => {
      const next = new Set(prev)
      if (added) next.add(id)
      else next.delete(id)
      return next
    })
  }

  // Contadores por subcategoria (sem filtro de tema — mostra totais globais)
  const counts = useMemo(() => countBySubcategoria(REPERTORIOS, ''), [])

  // Filtragem combinada: aba + tema + busca + favoritos
  const filtered = useMemo(() => {
    return filterRepertorios(
      REPERTORIOS,
      selectedTheme || '',
      activeTab || '',
      search.trim(),
      showFavoritesOnly,
      favorites,
    )
  }, [search, activeTab, selectedTheme, showFavoritesOnly, favorites])

  // Placeholder dinâmico baseado na aba ativa
  const searchPlaceholder = activeTab
    ? `Buscar em ${
        activeTab === 'pessoa' ? 'pessoas' :
        activeTab === 'livro' ? 'livros' :
        activeTab === 'filme' ? 'filmes/séries' :
        activeTab === 'citacao' ? 'citações' :
        activeTab === 'musica' ? 'músicas' :
        'instituições/leis'
      }...`
    : 'Buscar por autor, obra, lei ou tema'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-purple-deep dark:text-brand-beige mb-3">
          Repertório Sociocultural
        </h2>
        <p className="font-serif text-brand-graphite dark:text-brand-lavender max-w-xl mx-auto">
          Explore referências reais para fundamentar seus argumentos com propriedade.
        </p>
      </div>

      {/* Abas de subcategoria */}
      <CategoryTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={counts}
      />

      {/* Filtros e busca */}
      <div className="bg-brand-beige/95 dark:bg-brand-purple-dark/95 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-brand-lavender/40 dark:border-brand-purple/40 shadow-lg space-y-4">
        {/* Barra de busca */}
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white dark:bg-brand-purple-deep border border-brand-lavender/40 dark:border-brand-purple/40 text-brand-graphite dark:text-brand-beige font-serif placeholder:text-brand-graphite/40 dark:placeholder:text-brand-lavender/40 focus:outline-none focus:ring-2 focus:ring-brand-purple/50 dark:focus:ring-brand-lavender/50 transition-shadow"
        />

        {/* Filtros secundários: temas + favoritos */}
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => { setSelectedTheme(''); setShowFavoritesOnly(false) }}
            aria-pressed={!selectedTheme && !showFavoritesOnly}
            className={`px-4 py-1.5 rounded-full text-sm font-display transition-all ${
              !selectedTheme && !showFavoritesOnly
                ? 'bg-brand-lavender text-brand-purple-deep font-semibold'
                : 'bg-brand-purple-deep/50 dark:bg-brand-purple/20 text-brand-graphite dark:text-brand-lavender border border-brand-lavender/30 dark:border-brand-purple/30 hover:bg-brand-lavender/20 dark:hover:bg-brand-purple/30'
            }`}
          >
            todos
          </button>

          <button
            onClick={() => setShowFavoritesOnly((prev) => !prev)}
            aria-pressed={showFavoritesOnly}
            className={`px-4 py-1.5 rounded-full text-sm font-display transition-all flex items-center gap-1.5 ${
              showFavoritesOnly
                ? 'bg-brand-lavender text-brand-purple-deep font-semibold'
                : 'bg-brand-purple-deep/50 dark:bg-brand-purple/20 text-brand-graphite dark:text-brand-lavender border border-brand-lavender/30 dark:border-brand-purple/30 hover:bg-brand-lavender/20 dark:hover:bg-brand-purple/30'
            }`}
          >
            <span>★</span> favoritos
          </button>

          {/* Temas como filtro cruzado (funciona dentro da subcategoria) */}
          {TEMAS_REPERTORIO.map((tema) => (
            <button
              key={tema}
              onClick={() => { setSelectedTheme((prev) => prev === tema ? '' : tema); setShowFavoritesOnly(false) }}
              aria-pressed={selectedTheme === tema}
              className={`px-4 py-1.5 rounded-full text-sm font-display transition-all ${
                selectedTheme === tema
                  ? 'bg-brand-lavender text-brand-purple-deep font-semibold'
                  : 'bg-brand-purple-deep/50 dark:bg-brand-purple/20 text-brand-graphite dark:text-brand-lavender border border-brand-lavender/30 dark:border-brand-purple/30 hover:bg-brand-lavender/20 dark:hover:bg-brand-purple/30'
              }`}
            >
              {tema}
            </button>
          ))}

          <span className="ml-auto text-xs font-display text-brand-graphite/60 dark:text-brand-lavender/60 whitespace-nowrap">
            {filtered.length} de {REPERTORIOS.length} resultados
          </span>
        </div>
      </div>

      {/* Resultados */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-4 opacity-40">📭</div>
          <p className="font-serif text-lg text-brand-graphite/60 dark:text-brand-lavender/60">
            Nenhum repertório encontrado com esses filtros.
          </p>
          <button
            onClick={() => {
              setSearch('')
              setSelectedTheme('')
              setShowFavoritesOnly(false)
              setActiveTab('')
            }}
            className="mt-4 text-sm font-display font-medium text-brand-purple dark:text-brand-lavender hover:underline underline-offset-4"
          >
            Limpar todos os filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <ResourceCard
              key={r.id}
              repertorio={r}
              isFavorite={favorites.has(r.id)}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  )
}