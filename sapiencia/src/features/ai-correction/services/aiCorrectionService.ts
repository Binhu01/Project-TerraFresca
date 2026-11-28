import type { EvaluationResult } from '../../../services/textAnalysis';
import type { DeepCorrectionResult, ThemeContext, MotorComparison, Divergence } from '../types/aiCorrection.types';
import { createAiProvider } from './aiProvider';

const provider = createAiProvider();

/**
 * Solicita avaliação profunda por IA.
 */
export async function requestAiEvaluation(
  text: string,
  theme: ThemeContext
): Promise<DeepCorrectionResult> {
  return provider.evaluate(text, theme);
}

/**
 * Compara resultados dos dois motores (heurístico vs IA).
 * Não faz averaging — apenas juxtapõe e identifica divergências.
 */
export function compareEvaluations(
  heuristic: EvaluationResult,
  ai: DeepCorrectionResult
): MotorComparison {
  const heuristicScores: Record<string, number> = {
    'C1 — Norma Culta': heuristic.c1.score,
    'C2 — Tema e Estrutura': heuristic.c2.score,
    'C3 — Argumentação': heuristic.c3.score,
    'C4 — Coesão': heuristic.c4.score,
    'C5 — Proposta': heuristic.c5.score,
  };

  const aiScores: Record<string, number> = {
    'C1 — Norma Culta': ai.competencias[0].nota,
    'C2 — Tema e Estrutura': ai.competencias[1].nota,
    'C3 — Argumentação': ai.competencias[2].nota,
    'C4 — Coesão': ai.competencias[3].nota,
    'C5 — Proposta': ai.competencias[4].nota,
  };

  const divergences = identifyDivergences(heuristicScores, aiScores);

  const heuristicTotal = Object.values(heuristicScores).reduce((a, b) => a + b, 0);

  return {
    heuristicScores,
    aiScores,
    divergences,
    heuristicTotal,
    aiTotal: ai.notaTotal,
  };
}

/**
 * Identifica divergências significativas (>40 pontos) entre motores.
 */
function identifyDivergences(
  heuristic: Record<string, number>,
  ai: Record<string, number>
): Divergence[] {
  const divergences: Divergence[] = [];

  for (const competency of Object.keys(heuristic)) {
    const hScore = heuristic[competency];
    const aScore = ai[competency];
    const difference = Math.abs(hScore - aScore);

    if (difference > 40) {
      let possibleReason = '';
      if (aScore > hScore) {
        possibleReason = 'A IA pode ter identificado nuances contextuais que o motor heurístico não captura (ex: articulação implícita de repertório).';
      } else {
        possibleReason = 'O motor heurístico pode ter sido generoso em padrões superficiais que a IA identificou como insuficientes em profundidade.';
      }

      divergences.push({
        competency,
        heuristicScore: hScore,
        aiScore: aScore,
        difference,
        possibleReason,
      });
    }
  }

  return divergences.sort((a, b) => b.difference - a.difference);
}

/**
 * Valida que todas as notas são níveis ENEM válidos.
 */
export function validateAiResult(result: DeepCorrectionResult): boolean {
  const validScores = [0, 40, 80, 120, 160, 200];
  return result.competencias.every((c) => validScores.includes(c.nota));
}