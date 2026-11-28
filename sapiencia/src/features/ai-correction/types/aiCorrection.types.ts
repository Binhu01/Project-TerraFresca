/**
 * Tipos para o motor de avaliação profunda por IA.
 * Independente do motor heurístico — sem averaging, sem substituição.
 */

/** Escala discreta ENEM: apenas estes 6 valores são válidos por competência */
export type EnemScore = 0 | 40 | 80 | 120 | 160 | 200;

/** Nível de desempenho associado à nota */
export type PerformanceLevel =
  | 'insuficiente'   // 0-40
  | 'regular'        // 80
  | 'bom'            // 120
  | 'muito_bom'      // 160
  | 'excelente';     // 200

/** Análise detalhada de uma competência individual */
export interface CompetencyAnalysis {
  competencia: number;           // 1-5
  nome: string;                  // ex: "Norma culta", "Tema e estrutura"
  nota: EnemScore;
  nivel: PerformanceLevel;
  justificativa: string;         // Explicação contextual da nota
  pontosFortes: string[];        // Aspectos positivos identificados
  pontosFracos: string[];        // Aspectos a melhorar
  evidencias: string[];          // Trechos do texto que fundamentam a nota
  recomendacoes: string[];       // Sugestões concretas de melhoria
}

/** Elemento da proposta de intervenção (C5) */
export interface InterventionElement {
  elemento: 'agente' | 'acao' | 'meio_modo' | 'efeito' | 'detalhamento';
  presente: boolean;
  descricao: string;             // Como aparece no texto ou por que falta
  qualidade: 'ausente' | 'generico' | 'adequado' | 'detalhado';
}

/** Item de feedback genérico */
export interface FeedbackItem {
  categoria: string;
  mensagem: string;
  prioridade: 'alta' | 'media' | 'baixa';
}

/** Resultado completo da avaliação profunda por IA */
export interface DeepCorrectionResult {
  /** Timestamp ISO da avaliação */
  timestamp: string;
  /** Modelo utilizado */
  modelo: string;
  /** Nota total (soma das 5 competências, recalculada no servidor) */
  notaTotal: number;
  /** Análise geral do texto (resumo narrativo) */
  analiseGeral: string;
  /** Análise por competência */
  competencias: [
    CompetencyAnalysis,  // C1
    CompetencyAnalysis,  // C2
    CompetencyAnalysis,  // C3
    CompetencyAnalysis,  // C4
    CompetencyAnalysis   // C5
  ];
  /** Detalhamento dos 5 elementos da proposta de intervenção */
  propostaIntervencao: InterventionElement[];
  /** Pontos fortes gerais do texto */
  pontosFortesGerais: string[];
  /** Principais pontos de melhoria */
  pontosMelhoria: string[];
  /** Alertas de situações que zeram a redação */
  alertasNotaZero: string[];
  /** Indicador de confiança da avaliação */
  confianca: 'baixa' | 'media' | 'alta';
  /** Aviso sobre limitações da IA */
  avisoLimitacoes: string;
}

/** Estado da máquina de estados da avaliação IA */
export type AiEvaluationStatus =
  | 'idle'         // Aguardando ação do usuário
  | 'preparing'    // Validando entrada, preparando payload
  | 'evaluating'   // Chamada API em andamento
  | 'completed'    // Avaliação concluída com sucesso
  | 'error';       // Erro na avaliação

/** Dados do tema passados para a avaliação */
export interface ThemeContext {
  titulo: string;
  contextualizacao?: string;
  problematica?: string;
}

/** Payload enviado ao endpoint serverless */
export interface DeepEvaluationRequest {
  text: string;
  themeTitle: string;
  themeContext?: string;
  themeProblematica?: string;
}

/** Resposta bruta do endpoint (antes de validação Zod) */
export interface DeepEvaluationResponse {
  success: boolean;
  data?: DeepCorrectionResult;
  error?: string;
}

/** Resultado da comparação entre os dois motores */
export interface MotorComparison {
  heuristicScores: Record<string, number>;
  aiScores: Record<string, number>;
  divergences: Divergence[];
  heuristicTotal: number;
  aiTotal: number;
}

/** Divergência significativa entre motores (>40 pontos) */
export interface Divergence {
  competency: string;
  heuristicScore: number;
  aiScore: number;
  difference: number;
  possibleReason: string;
}