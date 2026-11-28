import type { DeepCorrectionResult, ThemeContext } from '../types/aiCorrection.types';

/**
 * Interface abstrata para provedores de avaliação IA.
 * Permite trocar o backend (OpenAI, Anthropic, etc.) sem alterar a UI.
 */
export interface AiProvider {
  evaluate(text: string, theme: ThemeContext): Promise<DeepCorrectionResult>;
}

/**
 * Factory function que retorna o provedor configurado.
 * Atualmente usa fetch direto ao endpoint serverless Vercel.
 */
export function createAiProvider(): AiProvider {
  return {
    evaluate: async (text: string, theme: ThemeContext): Promise<DeepCorrectionResult> => {
      const response = await fetch('/api/correction/deep-evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          themeTitle: theme.titulo,
          themeContext: theme.contextualizacao,
          themeProblematica: theme.problematica,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro desconhecido na avaliação IA');
      }

      return result.data;
    },
  };
}