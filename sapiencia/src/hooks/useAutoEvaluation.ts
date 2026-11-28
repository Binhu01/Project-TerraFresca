import { useMemo } from 'react'
import { evaluateEssay, type EvaluationResult } from '../services/textAnalysis'

// Re-export tipos do módulo central para compatibilidade retroativa
export type { CompetencyFeedback, EvaluationResult as AutoEvaluationResult } from '../services/textAnalysis'

/**
 * Hook React que avalia o texto em todas as 5 competências.
 * Wrapper fino sobre `evaluateEssay()` — a lógica pura vive em textAnalysis.ts.
 */
export function useAutoEvaluation(
  text: string,
  themeKeywords: string[],
  equivalences: string[] = []
): EvaluationResult {
  return useMemo(
    () => evaluateEssay(text, themeKeywords, equivalences),
    [text, themeKeywords, equivalences]
  )
}