import { useState } from 'react'
import type { Repertorio, TipoConteudo } from '../../data/repertorios'

interface ResourceCardProps {
  repertorio: Repertorio
  isFavorite: boolean
  onToggleFavorite: (id: string) => void
}

const TIPO_LABELS: Record<TipoConteudo, string> = {
  pessoa: 'Pessoa',
  livro: 'Livro',
  filme: 'Filme/Série',
  citacao: 'Citação',
  musica: 'Música',
  instituicao: 'Instituição/Lei',
}

export default function ResourceCard({ repertorio, isFavorite, onToggleFavorite }: ResourceCardProps) {
  const [expanded, setExpanded] = useState(false)
  const r = repertorio

  // Layout adaptativo por tipo de conteúdo
  const renderHeader = () => {
    switch (r.tipo_conteudo) {
      case 'pessoa':
        return (
          <div className="flex items-start gap-3 mb-3">
            {r.imagem ? (
              <img
                src={r.imagem}
                alt={r.nome}
                className="w-12 h-12 rounded-full object-cover shrink-0 border border-brand-lavender/30 dark:border-brand-purple/30"
                loading="lazy"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-brand-purple/15 dark:bg-brand-lavender/20 flex items-center justify-center text-xl shrink-0">
                👤
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-base font-bold text-brand-purple-deep dark:text-brand-beige leading-snug">
                {r.nome}
              </h3>
              {r.autor && (
                <p className="text-xs font-display text-brand-graphite/60 dark:text-brand-lavender/60 mt-0.5">
                  {r.autor}
                </p>
              )}
            </div>
          </div>
        )

      case 'livro':
        return (
          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-16 rounded bg-brand-purple/15 dark:bg-brand-lavender/20 flex items-center justify-center text-xl shrink-0">
              📚
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-base font-bold text-brand-purple-deep dark:text-brand-beige leading-snug">
                {r.nome}
              </h3>
              {r.autor && (
                <p className="text-xs font-display text-brand-graphite/60 dark:text-brand-lavender/60 mt-0.5">
                  {r.autor}{r.ano ? ` · ${r.ano}` : ''}
                </p>
              )}
            </div>
          </div>
        )

      case 'filme':
        return (
          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-16 rounded bg-brand-purple/15 dark:bg-brand-lavender/20 flex items-center justify-center text-xl shrink-0">
              🎬
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-base font-bold text-brand-purple-deep dark:text-brand-beige leading-snug">
                {r.nome}
              </h3>
              {(r.autor || r.ano) && (
                <p className="text-xs font-display text-brand-graphite/60 dark:text-brand-lavender/60 mt-0.5">
                  {[r.autor, r.ano].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>
        )

      case 'citacao':
        return (
          <div className="mb-3">
            <blockquote className="font-serif text-base italic text-brand-purple-deep dark:text-brand-beige leading-relaxed border-l-3 border-brand-purple/40 dark:border-brand-lavender/40 pl-4 py-1">
              "{r.nome}"
            </blockquote>
            {r.autor && (
              <p className="text-xs font-display text-brand-graphite/60 dark:text-brand-lavender/60 mt-2 text-right">
                — {r.autor}
              </p>
            )}
          </div>
        )

      case 'musica':
        return (
          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 rounded bg-brand-purple/15 dark:bg-brand-lavender/20 flex items-center justify-center text-xl shrink-0">
              🎵
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-base font-bold text-brand-purple-deep dark:text-brand-beige leading-snug">
                {r.nome}
              </h3>
              {r.autor && (
                <p className="text-xs font-display text-brand-graphite/60 dark:text-brand-lavender/60 mt-0.5">
                  {r.autor}{r.ano ? ` · ${r.ano}` : ''}
                </p>
              )}
            </div>
          </div>
        )

      case 'instituicao':
        return (
          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 rounded bg-brand-purple/15 dark:bg-brand-lavender/20 flex items-center justify-center text-xl shrink-0">
              🏛️
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-base font-bold text-brand-purple-deep dark:text-brand-beige leading-snug">
                {r.nome}
              </h3>
              {r.ano && (
                <p className="text-xs font-display text-brand-graphite/60 dark:text-brand-lavender/60 mt-0.5">
                  {r.ano}
                </p>
              )}
            </div>
          </div>
        )
    }
  }

  return (
    <article className="bg-brand-beige/95 dark:bg-brand-purple-dark/95 backdrop-blur-md rounded-xl p-5 border border-brand-lavender/40 dark:border-brand-purple/40 shadow-lg card-hover group flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {renderHeader()}
        </div>
        <button
          onClick={() => onToggleFavorite(r.id)}
          className="btn-feedback shrink-0 p-2 rounded-full hover:bg-brand-purple/10 dark:hover:bg-brand-lavender/10 transition-colors self-start"
          aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill={isFavorite ? '#7F5D99' : 'none'}
            stroke={isFavorite ? '#7F5D99' : 'currentColor'}
            strokeWidth="2"
            className="w-5 h-5 text-brand-graphite/40 dark:text-brand-lavender/40"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </button>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="text-[11px] font-display font-semibold px-2.5 py-0.5 rounded-full bg-brand-purple/10 text-brand-purple dark:bg-brand-lavender/20 dark:text-brand-lavender">
          {TIPO_LABELS[r.tipo_conteudo]}
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

      {/* Explicação — truncada com botão "Ver detalhes" */}
      <div className="flex-1">
        <p className={`font-serif text-sm text-brand-graphite dark:text-brand-beige/90 leading-relaxed ${
          !expanded && r.explicacao.length > 150 ? 'line-clamp-3' : ''
        }`}>
          {r.explicacao}
        </p>
        {r.explicacao.length > 150 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-display font-medium text-brand-purple dark:text-brand-lavender hover:underline underline-offset-2 mt-1"
          >
            {expanded ? 'Ver menos' : 'Ver detalhes'}
          </button>
        )}
      </div>

      {/* Como usar */}
      <div className="bg-brand-purple/5 dark:bg-brand-lavender/10 rounded-lg p-3 mt-3">
        <p className="text-xs font-display font-medium text-brand-purple-deep dark:text-brand-lavender mb-1">
          💡 Como usar na redação:
        </p>
        <p className="font-serif text-xs text-brand-graphite dark:text-brand-beige/80 leading-relaxed">
          {r.comoUsar}
        </p>
      </div>
    </article>
  )
}