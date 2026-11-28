import { useState, useCallback, useRef } from 'react';
import type { DeepCorrectionResult, AiEvaluationStatus, ThemeContext } from '../types/aiCorrection.types';
import { requestAiEvaluation } from '../services/aiCorrectionService';

/**
 * Hook para gerenciar o fluxo de avaliação profunda por IA.
 * Máquina de estados: idle → preparing → evaluating → completed | error
 */
export function useAiCorrection() {
  const [status, setStatus] = useState<AiEvaluationStatus>('idle');
  const [result, setResult] = useState<DeepCorrectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const requestEvaluation = useCallback(
    async (text: string, theme: ThemeContext) => {
      if (status === 'evaluating' || status === 'preparing') return;

      abortRef.current = false;
      setError(null);
      setResult(null);

      // Validação básica antes de enviar
      setStatus('preparing');
      const wordCount = text.trim().split(/\s+/).length;
      if (wordCount < 50) {
        setStatus('error');
        setError('Texto muito curto. Escreva pelo menos 50 palavras para uma avaliação significativa.');
        return;
      }

      setStatus('evaluating');

      try {
        const data = await requestAiEvaluation(text, theme);

        if (abortRef.current) return;

        setResult(data);
        setStatus('completed');
      } catch (err) {
        if (abortRef.current) return;

        setStatus('error');
        setError(err instanceof Error ? err.message : 'Erro desconhecido ao avaliar.');
      }
    },
    [status]
  );

  const reset = useCallback(() => {
    abortRef.current = true;
    setStatus('idle');
    setResult(null);
    setError(null);
  }, []);

  return {
    status,
    result,
    error,
    requestEvaluation,
    reset,
    isEvaluating: status === 'preparing' || status === 'evaluating',
  };
}