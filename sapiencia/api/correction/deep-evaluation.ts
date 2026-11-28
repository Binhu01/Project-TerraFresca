import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildSystemPrompt, buildUserPrompt } from '../../src/features/ai-correction/prompts/enemCorrectionPrompt';
import { validateAndRecalculate } from '../../src/features/ai-correction/schemas/correctionSchema';

/**
 * Rate limiting in-memory (por IP).
 * Em produção com múltiplas instâncias, migrar para Redis ou similar.
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutos
const RATE_LIMIT_MAX = 3; // 3 avaliações por janela

const MAX_TEXT_LENGTH = 3000;
const OPENAI_TIMEOUT_MS = 60_000;

function getClientIp(req: VercelRequest): string {
  return (
    req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
    req.headers['x-real-ip']?.toString() ||
    'unknown'
  );
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido. Use POST.' });
  }

  // Rate limiting
  const clientIp = getClientIp(req);
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({
      success: false,
      error: 'Limite de avaliações excedido. Aguarde alguns minutos e tente novamente.',
    });
  }

  // Validação da API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OPENAI_API_KEY não configurada no servidor');
    return res.status(500).json({
      success: false,
      error: 'Serviço de avaliação IA não configurado. Contate o administrador.',
    });
  }

  // Validação do input
  const { text, themeTitle, themeContext, themeProblematica } = req.body || {};

  if (!text || typeof text !== 'string' || text.trim().length < 50) {
    return res.status(400).json({
      success: false,
      error: 'Texto muito curto. Mínimo de 50 caracteres para avaliação.',
    });
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return res.status(400).json({
      success: false,
      error: `Texto muito longo. Máximo de ${MAX_TEXT_LENGTH} caracteres.`,
    });
  }

  if (!themeTitle || typeof themeTitle !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Título do tema é obrigatório.',
    });
  }

  // Construir prompts
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(text, {
    titulo: themeTitle,
    contextualizacao: themeContext,
    problematica: themeProblematica,
  });

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  try {
    // Chamada à OpenAI Responses API com Structured Outputs
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

    const openAiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        instructions: systemPrompt,
        input: userPrompt,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'enem_correction',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' },
                modelo: { type: 'string' },
                notaTotal: { type: 'integer' },
                analiseGeral: { type: 'string' },
                competencias: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      competencia: { type: 'integer' },
                      nome: { type: 'string' },
                      nota: { type: 'integer', enum: [0, 40, 80, 120, 160, 200] },
                      nivel: { type: 'string', enum: ['insuficiente', 'regular', 'bom', 'muito_bom', 'excelente'] },
                      justificativa: { type: 'string', minLength: 40 },
                      pontosFortes: { type: 'array', items: { type: 'string' } },
                      pontosFracos: { type: 'array', items: { type: 'string' } },
                      evidencias: { type: 'array', items: { type: 'string', minLength: 3 }, minItems: 1 },
                      recomendacoes: { type: 'array', items: { type: 'string', minLength: 5 }, minItems: 1 },
                    },
                    required: ['competencia', 'nome', 'nota', 'nivel', 'justificativa', 'pontosFortes', 'pontosFracos', 'evidencias', 'recomendacoes'],
                    additionalProperties: false,
                  },
                  minItems: 5,
                  maxItems: 5,
                },
                propostaIntervencao: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      elemento: { type: 'string', enum: ['agente', 'acao', 'meio_modo', 'efeito', 'detalhamento'] },
                      presente: { type: 'boolean' },
                      descricao: { type: 'string' },
                      qualidade: { type: 'string', enum: ['ausente', 'generico', 'adequado', 'detalhado'] },
                    },
                    required: ['elemento', 'presente', 'descricao', 'qualidade'],
                    additionalProperties: false,
                  },
                  minItems: 5,
                  maxItems: 5,
                },
                pontosFortesGerais: { type: 'array', items: { type: 'string' } },
                pontosMelhoria: { type: 'array', items: { type: 'string' } },
                alertasNotaZero: { type: 'array', items: { type: 'string' } },
                confianca: { type: 'string', enum: ['baixa', 'media', 'alta'] },
                avisoLimitacoes: { type: 'string' },
              },
              required: [
                'timestamp', 'modelo', 'notaTotal', 'analiseGeral', 'competencias',
                'propostaIntervencao', 'pontosFortesGerais', 'pontosMelhoria',
                'alertasNotaZero', 'confianca', 'avisoLimitacoes',
              ],
              additionalProperties: false,
            },
          },
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!openAiResponse.ok) {
      const errorBody = await openAiResponse.text();
      console.error(`OpenAI API error (${openAiResponse.status}):`, errorBody);
      return res.status(502).json({
        success: false,
        error: 'Erro ao processar a avaliação. Tente novamente em instantes.',
      });
    }

    const responseData = await openAiResponse.json();

    // Extrair conteúdo da resposta (Responses API format)
    let parsedContent: unknown;
    try {
      const outputText = responseData.output?.[0]?.content?.[0]?.text;
      if (!outputText) {
        throw new Error('Resposta da OpenAI sem conteúdo textual');
      }
      parsedContent = JSON.parse(outputText);
    } catch (parseError) {
      console.error('Erro ao parsear resposta da OpenAI:', parseError);
      return res.status(502).json({
        success: false,
        error: 'Resposta da IA em formato inválido. Tente novamente.',
      });
    }

    // Validar com Zod e recalcular nota total
    const validated = validateAndRecalculate(parsedContent);

    // Adicionar timestamp e modelo se ausentes
    const result = {
      ...validated,
      timestamp: validated.timestamp || new Date().toISOString(),
      modelo: validated.modelo || model,
    };

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error('Timeout na chamada à OpenAI');
      return res.status(504).json({
        success: false,
        error: 'Tempo de avaliação excedido. Tente novamente.',
      });
    }

    console.error('Erro inesperado na avaliação:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao processar a avaliação.',
    });
  }
}