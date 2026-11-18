import { useState, useCallback } from 'react'
import { REPERTORIOS, type Repertorio } from '../data/repertorios'

interface InicioProps {
  onNavigate: (page: 'repertorio' | 'treino') => void
}

export default function Inicio({ onNavigate }: InicioProps) {
  const [dailyRepertorio, setDailyRepertorio] = useState<Repertorio>(() => {
    const idx = Math.floor(Math.random() * REPERTORIOS.length)
    return REPERTORIOS[idx]
  })
  const [lastId, setLastId] = useState(dailyRepertorio.id)

  const sortearOutro = useCallback(() => {
    const available = REPERTORIOS.filter((r) => r.id !== lastId)
    if (available.length === 0) return
    const idx = Math.floor(Math.random() * available.length)
    setDailyRepertorio(available[idx])
    setLastId(available[idx].id)
  }, [lastId])

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="text-center py-12 sm:py-16">
        {/* Logo + Nome centralizados */}
        <div className="flex flex-col items-center justify-center mb-10 animate-fadeIn">
          <img
            src="/logo-sapiencia.png"
            alt="Sapiência"
            className="w-28 h-28 sm:w-36 sm:h-36 object-contain drop-shadow-lg mb-4"
          />
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-extrabold text-brand-purple-deep dark:text-brand-beige tracking-tight">
            Sapiência
          </h1>
        </div>

        <div className="bg-brand-beige/85 dark:bg-brand-purple-dark/85 backdrop-blur-md rounded-3xl px-8 py-10 sm:px-12 sm:py-14 border border-brand-lavender/20 dark:border-brand-purple/20 shadow-lg max-w-3xl mx-auto mb-10">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-brand-purple-deep dark:text-brand-beige leading-tight mb-6">
            Escrever bem é aprender a pensar.
          </h2>
          <p className="font-serif text-lg sm:text-xl text-brand-graphite dark:text-brand-lavender max-w-2xl mx-auto leading-relaxed font-medium">
            Construa repertório, desenvolva argumentos e prepare-se para alcançar seu melhor resultado no ENEM.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => onNavigate('repertorio')}
            className="btn-feedback px-8 py-3 rounded-full bg-brand-purple text-brand-beige font-display font-medium text-base shadow-md hover:shadow-lg"
          >
            Explorar repertórios
          </button>
          <button
            onClick={() => onNavigate('treino')}
            className="btn-feedback px-8 py-3 rounded-full border-2 border-brand-purple text-brand-purple dark:text-brand-lavender dark:border-brand-lavender font-display font-medium text-base hover:bg-brand-purple/10 dark:hover:bg-brand-lavender/10"
          >
            Começar um treino
          </button>
        </div>
      </section>

      {/* Repertório do dia */}
      <section className="max-w-2xl mx-auto">
        <div className="bg-brand-beige/95 dark:bg-brand-purple-dark/95 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-brand-lavender/40 dark:border-brand-purple/40 shadow-lg card-hover">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-block w-2 h-2 rounded-full bg-brand-purple animate-pulse" />
            <span className="text-xs font-display font-semibold uppercase tracking-widest text-brand-purple dark:text-brand-lavender">
              Repertório do dia
            </span>
          </div>

          <h3 className="font-display text-xl sm:text-2xl font-bold text-brand-purple-deep dark:text-brand-beige mb-2">
            {dailyRepertorio.nome}
          </h3>

          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-xs font-display font-medium px-3 py-1 rounded-full bg-brand-purple/10 text-brand-purple dark:bg-brand-lavender/20 dark:text-brand-lavender">
              {dailyRepertorio.tipo}
            </span>
            {dailyRepertorio.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs font-display px-3 py-1 rounded-full border border-brand-lavender/40 dark:border-brand-purple/40 text-brand-graphite dark:text-brand-lavender/80"
              >
                {tag}
              </span>
            ))}
          </div>

          <p className="font-serif text-brand-graphite dark:text-brand-beige/90 leading-relaxed mb-4">
            {dailyRepertorio.explicacao}
          </p>

          <div className="bg-brand-purple/5 dark:bg-brand-lavender/10 rounded-lg p-4 mb-6">
            <p className="text-sm font-display font-medium text-brand-purple-deep dark:text-brand-lavender mb-1">
              💡 Como usar na redação:
            </p>
            <p className="font-serif text-sm text-brand-graphite dark:text-brand-beige/80 leading-relaxed">
              {dailyRepertorio.comoUsar}
            </p>
          </div>

          <button
            onClick={sortearOutro}
            className="btn-feedback text-sm font-display font-medium text-brand-purple dark:text-brand-lavender hover:underline underline-offset-4"
          >
            Sortear outro →
          </button>
        </div>
      </section>
    </div>
  )
}