import { useState, useEffect, useRef, useCallback } from 'react'
import { evaluateEssay, type EvaluationResult } from '../services/textAnalysis'
import { buildCorrectionResult, type CorrectionResult } from '../services/correctionService'

interface UseDebouncedCorrectionOptions {
  /** Delay em ms antes de executar a análise (default: 600) */
  delay?: number
  /** Mínimo de caracteres para ativar a análise (default: 20) */
  minChars?: number
}

interface UseDebouncedCorrectionReturn {
  /** Resultado da correção com debounce (pode estar desatualizado durante digitação) */
  correction: CorrectionResult | null
  /** Se está aguardando o debounce para atualizar */
  isAnalyzing: boolean
  /** O texto que foi efetivamente analisado */
  analyzedText: string
  /** Forçar reanálise imediata (ignora debounce) */
  forceAnalyze: () => void
}

/**
 * Hook que aplica debounce à autoavaliação para modo "Correção em Tempo Real".
 * A avaliação pura só é executada quando o timer expira — não calcula a cada render.
 */
export function useDebouncedCorrection(
  text: string,
  themeKeywords: string[],
  options: UseDebouncedCorrectionOptions = {},
  equivalences: string[] = []
): UseDebouncedCorrectionReturn {
  const { delay = 600, minChars = 20 } = options

  // Estado debounced — a avaliação NÃO roda a cada render
  const [debouncedEval, setDebouncedEval] = useState<EvaluationResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzedText, setAnalyzedText] = useState('')

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastAnalyzedRef = useRef('')

  // Refs para capturar valores atuais sem criar dependências no effect
  const textRef = useRef(text)
  const keywordsRef = useRef(themeKeywords)
  const equivalencesRef = useRef(equivalences)
  textRef.current = text
  keywordsRef.current = themeKeywords
  equivalencesRef.current = equivalences

  const runEvaluation = useCallback((currentText: string) => {
    if (currentText.trim().length < minChars) {
      setDebouncedEval(null)
      setAnalyzedText('')
      lastAnalyzedRef.current = ''
      setIsAnalyzing(false)
      return
    }

    // Avaliação pura executada SOMENTE aqui, dentro do timer ou forceAnalyze
    const result = evaluateEssay(currentText, keywordsRef.current, equivalencesRef.current)
    setDebouncedEval(result)
    setAnalyzedText(currentText)
    lastAnalyzedRef.current = currentText
    setIsAnalyzing(false)
  }, [minChars])

  const forceAnalyze = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    runEvaluation(textRef.current)
  }, [runEvaluation])

  useEffect(() => {
    // Limpa timer anterior
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    // Se texto muito curto, limpa resultado imediatamente
    if (text.trim().length < minChars) {
      setDebouncedEval(null)
      setAnalyzedText('')
      setIsAnalyzing(false)
      return
    }

    // Marca como analisando (feedback visual para o usuário)
    setIsAnalyzing(true)

    // Agenda nova análise COM DEBOUNCE — a função pura só roda quando o timer expirar
    timerRef.current = setTimeout(() => {
      runEvaluation(text)
    }, delay)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [text, themeKeywords, equivalences, delay, minChars, runEvaluation])

  const correction = debouncedEval ? buildCorrectionResult(debouncedEval) : null

  return {
    correction,
    isAnalyzing,
    analyzedText,
    forceAnalyze,
  }
}