import { useState, useMemo } from 'react'
import { REPERTORIOS, TEMAS_REPERTORIO, type Repertorio } from '../data/repertorios'
import { getFavorites, toggleFavorite } from '../services/storage'

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export default function Repertorio() {
  const [search, setSearch] = useState('')
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

  const filtered = useMemo(() => {
    const normalizedSearch = normalize(search)

    return REPERTORIOS.filter((r: Repertorio) => {
      // Search filter
      if (normalizedSearch) {
        const haystack = normalize(
          `${r.nome} ${r.explicacao} ${r.tipo} ${r.tags.join(' ')}`
        )
        if (!haystack.includes(normalizedSearch)) return false
      }

      // Theme filter
      if (selectedTheme && !r.tags.includes(selectedTheme)) return false

      // Favorites filter
      if (showFavoritesOnly && !favorites.has(r.id)) return false

      return true
    })
  }, [search, selectedTheme, showFavoritesOnly, favorites])

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-purple-deep dark:text-brand-beige mb-3">
          Repertório Sociocultural
        </h2>
        <p className="font-serif text-brand-graphite dark:text-brand-lavender max-w-xl mx-auto">
          Explore referências reais para fundamentar seus argumentos com propriedade.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-brand-beige/95 dark:bg-brand-purple-dark/95 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-brand-lavender/40 dark:border-brand-purple/40 shadow-lg space-y-4">
        <input
          type="text"
          placeholder="Buscar por autor, obra ou lei"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white dark:bg-brand-purple-deep border border-brand-lavender/40 dark:border-brand-purple/40 text-brand-graphite dark:text-brand-beige font-serif placeholder:text-brand-graphite/40 dark:placeholder:text-brand-lavender/40 focus:outline-none focus:ring-2 focus:ring-brand-purple/50 dark:focus:ring-brand-lavender/50"
        />

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

          <span className="ml-auto text-xs font-display text-brand-graphite/60 dark:text-brand-lavender/60">
            {filtered.length} de {REPERTORIOS.length} resultados
          </span>
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-serif text-lg text-brand-graphite/60 dark:text-brand-lavender/60">
            Nenhum repertório encontrado com esses filtros.
          </p>
          <button
            onClick={() => {
              setSearch('')
              setSelectedTheme('')
              setShowFavoritesOnly(false)
            }}
            className="mt-4 text-sm font-display font-medium text-brand-purple dark:text-brand-lavender hover:underline underline-offset-4"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((r) => (
            <article
              key={r.id}
              className="bg-brand-beige/95 dark:bg-brand-purple-dark/95 backdrop-blur-md rounded-xl p-5 border border-brand-lavender/40 dark:border-brand-purple/40 shadow-lg card-hover group"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="font-display text-lg font-bold text-brand-purple-deep dark:text-brand-beige leading-snug">
                  {r.nome}
                </h3>
                <button
                  onClick={() => handleToggleFavorite(r.id)}
                  className="btn-feedback shrink-0 p-2 rounded-full hover:bg-brand-purple/10 dark:hover:bg-brand-lavender/10 transition-colors"
                  aria-label={favorites.has(r.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill={favorites.has(r.id) ? '#7F5D99' : 'none'}
                    stroke={favorites.has(r.id) ? '#7F5D99' : 'currentColor'}
                    strokeWidth="2"
                    className="w-5 h-5 text-brand-graphite/40 dark:text-brand-lavender/40"
                  >
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className="text-[11px] font-display font-semibold px-2.5 py-0.5 rounded-full bg-brand-purple/10 text-brand-purple dark:bg-brand-lavender/20 dark:text-brand-lavender">
                  {r.tipo}
                </span>
                {r.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] font-display px-2.5 py-0.5 rounded-full border border-brand-lavender/30 dark:border-brand-purple/30 text-brand-graphite/70 dark:text-brand-lavender/70"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <p className="font-serif text-sm text-brand-graphite dark:text-brand-beige/90 leading-relaxed mb-3">
                {r.explicacao}
              </p>

              <div className="bg-brand-purple/5 dark:bg-brand-lavender/10 rounded-lg p-3">
                <p className="text-xs font-display font-medium text-brand-purple-deep dark:text-brand-lavender mb-1">
                  💡 Como usar:
                </p>
                <p className="font-serif text-xs text-brand-graphite dark:text-brand-beige/80 leading-relaxed">
                  {r.comoUsar}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}