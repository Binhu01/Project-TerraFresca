import { useState, useEffect, useCallback } from 'react'
import SilkShaderBackground from './components/ui/SilkShaderBackground'
import SplashScreen from './components/ui/SplashScreen'
import Skeleton from './components/ui/Skeleton'
import Header from './components/layout/Header'
import Navigation from './components/layout/Navigation'
import Footer from './components/layout/Footer'
import Inicio from './pages/Inicio'
import Repertorio from './pages/Repertorio'
import Modelos from './pages/Modelos'
import Treino from './pages/Treino'
import Historico from './pages/Historico'

type Page = 'inicio' | 'repertorio' | 'modelos' | 'treino' | 'historico'

const VALID_PAGES: Page[] = ['inicio', 'repertorio', 'modelos', 'treino', 'historico']

function getPageFromHash(): Page {
  const hash = window.location.hash.replace('#', '')
  if (VALID_PAGES.includes(hash as Page)) {
    return hash as Page
  }
  return 'inicio'
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>(getPageFromHash)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [splashFinished, setSplashFinished] = useState(() => !!sessionStorage.getItem('sapiencia-splash-shown'))

  const handleSplashFinish = useCallback(() => {
    setSplashFinished(true)
  }, [])

  useEffect(() => {
    const handleHashChange = () => {
      const newPage = getPageFromHash()
      if (newPage !== currentPage) {
        setIsTransitioning(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        setTimeout(() => {
          setCurrentPage(newPage)
          setIsTransitioning(false)
        }, 150)
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [currentPage])

  const navigateTo = (page: Page) => {
    window.location.hash = page
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'inicio':
        return <Inicio onNavigate={navigateTo} />
      case 'repertorio':
        return <Repertorio />
      case 'modelos':
        return <Modelos />
      case 'treino':
        return <Treino />
      case 'historico':
        return <Historico />
      default:
        return <Inicio onNavigate={navigateTo} />
    }
  }

  if (!splashFinished) {
    return <SplashScreen onFinish={handleSplashFinish} />
  }

  return (
    <div className="relative min-h-screen">
      <SilkShaderBackground />

      <div className="relative z-10 flex flex-col min-h-screen">
        <Header />
        <Navigation currentPage={currentPage} onNavigate={navigateTo} />

        <main
          className={`flex-1 w-full max-w-5xl mx-auto px-4 py-8 transition-opacity duration-300 ease-in-out ${
            isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
          }`}
        >
          {isTransitioning ? <Skeleton /> : renderPage()}
        </main>

        <Footer />
      </div>
    </div>
  )
}