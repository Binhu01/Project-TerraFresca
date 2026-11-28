import { z } from 'zod';

/**
 * Schema Zod para validação em runtime da resposta da IA.
 * Usado tanto no servidor (validar output do LLM) quanto no cliente (validar resposta da API).
 */

const enemScoreSchema = z.union([
  z.literal(0),
  z.literal(40),
  z.literal(80),
  z.literal(120),
  z.literal(160),
  z.literal(200),
]);

const performanceLevelSchema = z.enum([
  'insuficiente',
  'regular',
  'bom',
  'muito_bom',
  'excelente',
]);

const competencyAnalysisSchema = z.object({
  competencia: z.number().int().min(1).max(5),
  nome: z.string().min(1),
  nota: enemScoreSchema,
  nivel: performanceLevelSchema,
  // Exigência 2: justificativa substantiva (mínimo 40 chars, pelo menos 2 frases)
  justificativa: z.string().min(40),
  pontosFortes: z.array(z.string()),
  pontosFracos: z.array(z.string()),
  // Exigência 1: pelo menos 1 evidência textual literal obrigatória
  evidencias: z.array(z.string().min(3)).min(1),
  // Exigência 3: pelo menos 1 recomendação prática e acionável
  recomendacoes: z.array(z.string().min(5)).min(1),
});

const interventionElementSchema = z.object({
  elemento: z.enum(['agente', 'acao', 'meio_modo', 'efeito', 'detalhamento']),
  presente: z.boolean(),
  descricao: z.string(),
  qualidade: z.enum(['ausente', 'generico', 'adequado', 'detalhado']),
});

export const deepCorrectionResultSchema = z.object({
  timestamp: z.string().datetime(),
  modelo: z.string().min(1),
  notaTotal: z.number().int().min(0).max(1000),
  analiseGeral: z.string().min(20),
  competencias: z.tuple([
    competencyAnalysisSchema, // C1
    competencyAnalysisSchema, // C2
    competencyAnalysisSchema, // C3
    competencyAnalysisSchema, // C4
    competencyAnalysisSchema, // C5
  ]),
  propostaIntervencao: z.array(interventionElementSchema).length(5),
  pontosFortesGerais: z.array(z.string()).min(1),
  pontosMelhoria: z.array(z.string()).min(1),
  alertasNotaZero: z.array(z.string()),
  confianca: z.enum(['baixa', 'media', 'alta']),
  avisoLimitacoes: z.string().min(10),
});

export type DeepCorrectionResultValidated = z.infer<typeof deepCorrectionResultSchema>;

/**
 * Valida e recalcula a nota total server-side.
 * Retorna o resultado validado ou lança erro.
 */
export function validateAndRecalculate(data: unknown): DeepCorrectionResultValidated {
  const parsed = deepCorrectionResultSchema.parse(data);

  // Recalcula nota total para garantir consistência
  const calculatedTotal = parsed.competencias.reduce((sum, c) => sum + c.nota, 0);

  if (calculatedTotal !== parsed.notaTotal) {
    // Sobrescreve com o valor correto
    return { ...parsed, notaTotal: calculatedTotal };
  }

  return parsed;
}