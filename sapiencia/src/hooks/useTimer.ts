import { useState, useRef, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'sapiencia-timer'

interface TimerState {
  elapsed: number
  isRunning: boolean
  startedAt: number | null
}

function loadTimerState(): TimerState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return { elapsed: 0, isRunning: false, startedAt: null }
    const parsed = JSON.parse(raw) as TimerState
    // Se estava rodando, calcula o tempo decorrido desde a última gravação
    if (parsed.isRunning && parsed.startedAt) {
      const extraSeconds = (Date.now() - parsed.startedAt) / 1000
      return { ...parsed, elapsed: parsed.elapsed + extraSeconds, startedAt: Date.now() }
    }
    return parsed
  } catch {
    return { elapsed: 0, isRunning: false, startedAt: null }
  }
}

function saveTimerState(state: TimerState) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // sessionStorage pode estar indisponível (modo privado, quota excedida)
  }
}

export function useTimer() {
  const [elapsed, setElapsed] = useState(() => loadTimerState().elapsed)
  const [isRunning, setIsRunning] = useState(() => loadTimerState().isRunning)
  const intervalRef = useRef<number | null>(null)
  const lastTickRef = useRef<number>(performance.now())

  // Sincroniza com sessionStorage sempre que o estado muda
  useEffect(() => {
    saveTimerState({
      elapsed,
      isRunning,
      startedAt: isRunning ? Date.now() : null,
    })
  }, [elapsed, isRunning])

  const start = useCallback(() => {
    setIsRunning((prev) => {
      if (prev) return prev
      lastTickRef.current = performance.now()
      return true
    })
  }, [])

  const pause = useCallback(() => {
    setIsRunning(false)
    if (intervalRef.current !== null) {
      cancelAnimationFrame(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    pause()
    setElapsed(0)
    saveTimerState({ elapsed: 0, isRunning: false, startedAt: null })
  }, [pause])

  useEffect(() => {
    if (!isRunning) return

    lastTickRef.current = performance.now()

    const tick = () => {
      const now = performance.now()
      const delta = (now - lastTickRef.current) / 1000
      lastTickRef.current = now
      setElapsed((prev) => prev + delta)
      intervalRef.current = requestAnimationFrame(tick)
    }

    intervalRef.current = requestAnimationFrame(tick)

    return () => {
      if (intervalRef.current !== null) {
        cancelAnimationFrame(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isRunning])

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  return {
    elapsed,
    isRunning,
    start,
    pause,
    reset,
    formatTime,
  }
}