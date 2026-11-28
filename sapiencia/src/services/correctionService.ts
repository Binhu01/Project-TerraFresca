/**
 * Serviço centralizado de correção de redação
 * Reutiliza a lógica do textAnalysis mas organiza os feedbacks por categoria
 * para exibição no modo "Correção Final"
 */

import type { EvaluationResult, CompetencyFeedback } from './textAnalysis'

// Re-export para compatibilidade retroativa
export type { EvaluationResult as AutoEvaluationResult } from './textAnalysis'

export type CorrectionCategory = 'ortografia' | 'estrutura' | 'argumentacao' | 'coesao' | 'proposta'

export interface CategoryFeedback {
  category: CorrectionCategory
  label: string
  icon: string
  score: number
  maxScore: number
  level: CompetencyFeedback['level']
  tips: string[]
}

export interface CorrectionResult {
  categories: CategoryFeedback[]
  totalScore: number
  overallTips: string[]
  timestamp: number
}

const CATEGORY_MAP: Record<CorrectionCategory, { keys: ('c1' | 'c2' | 'c3' | 'c4' | 'c5')[]; label: string; icon: string }> = {
  ortografia: { keys: ['c1'], label: 'Ortografia e Norma Culta', icon: '✏️' },
  estrutura: { keys: ['c3'], label: 'Estrutura Argumentativa', icon: '🏗️' },
  argumentacao: { keys: ['c2'], label: 'Argumentação e Repertório', icon: '💡' },
  coesao: { keys: ['c4'], label: 'Coesão Textual', icon: '🔗' },
  proposta: { keys: ['c5'], label: 'Proposta de Intervenção', icon: '🎯' },
}

export function buildCorrectionResult(evalResult: EvaluationResult): CorrectionResult {
  const categories: CategoryFeedback[] = (Object.entries(CATEGORY_MAP) as [CorrectionCategory, typeof CATEGORY_MAP[CorrectionCategory]][]).map(
    ([category, config]) => {
      let score = 0
      const tips: string[] = []
      let worstLevel: CompetencyFeedback['level'] = 'excellent'
      const levelOrder: CompetencyFeedback['level'][] = ['critical', 'needs-work', 'good', 'excellent']

      for (const key of config.keys) {
        const feedback = evalResult[key]
        score += feedback.score
        tips.push(...feedback.tips)
        if (levelOrder.indexOf(feedback.level) < levelOrder.indexOf(worstLevel)) {
          worstLevel = feedback.level
        }
      }

      return {
        category,
        label: config.label,
        icon: config.icon,
        score,
        maxScore: config.keys.length * 200,
        level: worstLevel,
        tips,
      }
    }
  )

  const totalScore = categories.reduce((sum, c) => sum + c.score, 0)

  return {
    categories,
    totalScore,
    overallTips: evalResult.overallTips,
    timestamp: Date.now(),
  }
}

/**
 * Verifica se o texto mudou significativamente desde a última correção
 * Usado para invalidar correções finais quando o aluno continua editando
 */
export function hasTextChangedSignificantly(oldText: string, newText: string): boolean {
  if (oldText === newText) return false

  const oldWords = oldText.trim().split(/\s+/).filter(Boolean).length
  const newWords = newText.trim().split(/\s+/).filter(Boolean).length

  if (Math.abs(oldWords - newWords) >= 3) return true

  let diffs = 0
  const maxLen = Math.max(oldText.length, newText.length)
  for (let i = 0; i < maxLen; i++) {
    if (oldText[i] !== newText[i]) diffs++
    if (diffs > 10) return true
  }

  return diffs > 10
}