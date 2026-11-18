import { useState, useEffect } from 'react'

type Page = 'inicio' | 'repertorio' | 'modelos' | 'treino' | 'historico'

interface NavigationProps {
  currentPage: Page
  onNavigate: (page: Page) => void
}

const NAV_ITEMS: { page: Page; label: string }[] = [
  { page: 'inicio', label: 'Início' },
  { page: 'repertorio', label: 'Repertório' },
  { page: 'modelos', label: 'Modelos' },
  { page: 'treino', label: 'Treino' },
  { page: 'historico', label: 'Histórico' },
]

export default function Navigation({ currentPage, onNavigate }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Fecha o menu ao navegar
  const handleNavigate = (page: Page) => {
    onNavigate(page)
    setIsOpen(false)
  }

  // Fecha o menu ao clicar fora ou ao redimensionar para desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 640) {
        setIsOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <nav className="w-full px-6 py-3" aria-label="Navegação principal">
      <div className="max-w-5xl mx-auto flex items-center justify-center sm:justify-start relative">
        {/* Botão hambúrguer - apenas mobile */}
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="sm:hidden p-2 rounded-lg text-brand-graphite dark:text-brand-lavender hover:bg-brand-purple/10 dark:hover:bg-brand-purple/20 transition-colors"
          aria-expanded={isOpen}
          aria-controls="mobile-nav-menu"
          aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
        >
          {isOpen ? (
            /* Ícone X */
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            /* Ícone hambúrguer */
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          )}
        </button>

        {/* Menu desktop - sempre visível em sm+ */}
        <ul className="hidden sm:flex flex-wrap items-center gap-1 sm:gap-2">
          {NAV_ITEMS.map(({ page, label }) => {
            const isActive = currentPage === page
            return (
              <li key={page}>
                <a
                  href={`#${page}`}
                  onClick={(e) => {
                    e.preventDefault()
                    handleNavigate(page)
                  }}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                    ${
                      isActive
                        ? 'bg-brand-purple text-brand-beige shadow-sm'
                        : 'text-brand-graphite dark:text-brand-lavender hover:bg-brand-purple/10 dark:hover:bg-brand-purple/20'
                    }
                  `}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {label}
                </a>
              </li>
            )
          })}
        </ul>

        {/* Menu mobile - dropdown */}
        {isOpen && (
          <ul
            id="mobile-nav-menu"
            className="sm:hidden absolute top-full left-0 right-0 mt-2 flex flex-col gap-1 bg-brand-beige/98 dark:bg-brand-purple-dark/98 backdrop-blur-md rounded-xl border border-brand-lavender/40 dark:border-brand-purple/40 shadow-xl p-3 z-50 animate-fadeIn"
          >
            {NAV_ITEMS.map(({ page, label }) => {
              const isActive = currentPage === page
              return (
                <li key={page}>
                  <a
                    href={`#${page}`}
                    onClick={(e) => {
                      e.preventDefault()
                      handleNavigate(page)
                    }}
                    className={`
                      block px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                      ${
                        isActive
                          ? 'bg-brand-purple text-brand-beige shadow-sm'
                          : 'text-brand-graphite dark:text-brand-lavender hover:bg-brand-purple/10 dark:hover:bg-brand-purple/20'
                      }
                    `}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {label}
                  </a>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </nav>
  )
}