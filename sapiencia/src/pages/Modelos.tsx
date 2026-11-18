import { useState } from 'react'
import { MODELO_COMPLETO, ESQUELETOS } from '../data/modelos'

export default function Modelos() {
  const [openSkeleton, setOpenSkeleton] = useState<string | null>(null)

  const toggleSkeleton = (key: string) => {
    setOpenSkeleton((prev) => (prev === key ? null : key))
  }

  return (
    <div className="space-y-10">
      <div className="text-center mb-8">
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-purple-deep dark:text-brand-beige mb-3">
          Modelos de Redação
        </h2>
        <p className="font-serif text-brand-graphite dark:text-brand-lavender max-w-xl mx-auto">
          Estude a estrutura dissertativo-argumentativa com um modelo completo e esqueletos guiados.
        </p>
      </div>

      {/* Aviso */}
      <div className="bg-brand-purple/5 dark:bg-brand-lavender/10 border border-brand-purple/20 dark:border-brand-lavender/20 rounded-lg p-4 text-center">
        <p className="text-sm font-display text-brand-graphite dark:text-brand-lavender italic">
          Este é um modelo didático original, elaborado para fins de estudo. Não se trata de uma redação oficial do ENEM.
        </p>
      </div>

      {/* Modelo Completo */}
      <section className="bg-brand-lavender/30 dark:bg-brand-purple/40 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-brand-lavender/40 dark:border-brand-purple/40 shadow-lg space-y-8">
        <div>
          <h3 className="font-display text-xl font-bold text-brand-purple-deep dark:text-brand-beige mb-1">
            {MODELO_COMPLETO.titulo}
          </h3>
          <p className="text-sm font-display text-brand-graphite/60 dark:text-brand-lavender/60">
            Tema: {MODELO_COMPLETO.tema}
          </p>
        </div>

        {[
          { label: 'Introdução', content: MODELO_COMPLETO.introducao },
          { label: 'Desenvolvimento 1', content: MODELO_COMPLETO.desenvolvimento1 },
          { label: 'Desenvolvimento 2', content: MODELO_COMPLETO.desenvolvimento2 },
          { label: 'Conclusão', content: MODELO_COMPLETO.conclusao },
        ].map(({ label, content }) => (
          <div key={label} className="space-y-3">
            <h4 className="font-display text-sm font-semibold uppercase tracking-widest text-brand-purple dark:text-brand-lavender">
              {label}
            </h4>
            <p className="font-serif text-brand-graphite dark:text-brand-beige/90 leading-relaxed text-base sm:text-lg">
              {content.texto}
            </p>
            <div className="bg-brand-lavender/25 dark:bg-brand-purple/30 rounded-lg p-4 border-l-2 border-brand-purple/50 dark:border-brand-lavender/50">
              <p className="text-sm font-serif text-brand-graphite/90 dark:text-brand-lavender/90 leading-relaxed italic">
                📝 {content.explicacao}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* Esqueletos */}
      <section>
        <h3 className="font-display text-2xl font-bold text-brand-purple-deep dark:text-brand-beige mb-6 text-center">
          Esqueletos de Redação
        </h3>
        <div className="space-y-3">
          {Object.entries(ESQUELETOS).map(([key, section]) => (
            <div
              key={key}
              className="bg-brand-lavender/25 dark:bg-brand-purple/35 backdrop-blur-sm rounded-xl border border-brand-lavender/40 dark:border-brand-purple/40 overflow-hidden"
            >
              <button
                onClick={() => toggleSkeleton(key)}
                className="w-full px-6 py-4 flex items-center justify-between text-left btn-feedback"
                aria-expanded={openSkeleton === key}
              >
                <span className="font-display text-lg font-semibold text-brand-purple-deep dark:text-brand-beige">
                  {section.titulo}
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`w-5 h-5 text-brand-purple dark:text-brand-lavender transition-transform duration-200 ${
                    openSkeleton === key ? 'rotate-180' : ''
                  }`}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {openSkeleton === key && (
                <div className="px-6 pb-6 space-y-3 animate-fadeIn">
                  {section.conteudo.map((item, idx) => (
                    <p
                      key={idx}
                      className={`font-serif text-sm leading-relaxed ${
                        item.startsWith('DICA:')
                          ? 'text-brand-purple dark:text-brand-lavender font-medium mt-2 pt-2 border-t border-brand-lavender/20 dark:border-brand-purple/20'
                          : 'text-brand-graphite dark:text-brand-beige/90'
                      }`}
                    >
                      {item}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}