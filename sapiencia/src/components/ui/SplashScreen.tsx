import { useState, useEffect } from 'react'

const SESSION_KEY = 'sapiencia-splash-shown'

interface SplashScreenProps {
  onFinish: () => void
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [visible, setVisible] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    // Se já mostrou nesta sessão, pula a splash
    if (sessionStorage.getItem(SESSION_KEY)) {
      onFinish()
      return
    }

    // Respeita prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const displayDuration = prefersReducedMotion ? 400 : 1200
    const fadeDuration = prefersReducedMotion ? 200 : 500

    const showTimer = setTimeout(() => {
      setFadeOut(true)
    }, displayDuration)

    const finishTimer = setTimeout(() => {
      setVisible(false)
      sessionStorage.setItem(SESSION_KEY, 'true')
      onFinish()
    }, displayDuration + fadeDuration)

    return () => {
      clearTimeout(showTimer)
      clearTimeout(finishTimer)
    }
  }, [onFinish])

  if (!visible) return null

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-brand-purple-dark transition-opacity ease-in-out ${
        fadeOut ? 'opacity-0 duration-500' : 'opacity-100 duration-0'
      }`}
      aria-hidden={fadeOut}
      role="status"
      aria-label="Carregando Sapiência"
    >
      {/* Logo com animação de entrada */}
      <div className="flex flex-col items-center gap-6 animate-splashIn">
        {/* Ícone de pena/escrita educacional */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="w-16 h-16 text-brand-lavender animate-pulse"
          aria-hidden="true"
        >
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          <path d="m15 5 4 4" />
        </svg>

        {/* Nome do site */}
        <h1 className="font-display text-5xl sm:text-6xl font-extrabold text-brand-beige tracking-tight">
          Sapiência
        </h1>

        {/* Tagline educacional */}
        <p className="font-serif text-lg sm:text-xl text-brand-lavender/80 max-w-md text-center leading-relaxed">
          Construa seu repertório, escreva com propósito.
        </p>

        {/* Indicador de loading sutil — três pontos pulsantes */}
        <div className="flex items-center gap-2 mt-4" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-brand-lavender/60 animate-bounce"
              style={{ animationDelay: `${i * 150}ms`, animationDuration: '1s' }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}