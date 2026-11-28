import type { DeepCorrectionResult } from '../types/aiCorrection.types';
import { AiCompetencyCard } from './AiCompetencyCard';

interface AiCorrectionReportProps {
  result: DeepCorrectionResult;
}

const CONFIDENCE_COLORS: Record<string, string> = {
  baixa: 'text-orange-600 bg-orange-50',
  media: 'text-yellow-700 bg-yellow-50',
  alta: 'text-green-600 bg-green-50',
};

const CONFIDENCE_LABELS: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
};

export function AiCorrectionReport({ result }: AiCorrectionReportProps) {
  const confidenceClass = CONFIDENCE_COLORS[result.confianca] || CONFIDENCE_COLORS.media;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header com nota total */}
      <div className="bg-gradient-to-r from-[#7F5D99] to-[#9B7BB5] rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
            </svg>
            Avaliação Profunda IA
          </h3>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${confidenceClass}`}>
            Confiança: {CONFIDENCE_LABELS[result.confianca]}
          </span>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-4xl font-bold">{result.notaTotal}</span>
          <span className="text-sm opacity-80 mb-1">/ 1000 pontos</span>
        </div>
        <p className="text-xs opacity-70 mt-1">Modelo: {result.modelo}</p>
      </div>

      {/* Análise geral */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h4 className="text-sm font-bold text-[#7F5D99] uppercase tracking-wide mb-2">Análise Geral</h4>
        <p className="text-sm text-gray-700 leading-relaxed">{result.analiseGeral}</p>
      </div>

      {/* Alertas de nota zero */}
      {result.alertasNotaZero.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h4 className="text-sm font-bold text-red-700 uppercase tracking-wide mb-2 flex items-center gap-1">
            ⚠️ Alertas
          </h4>
          <ul className="text-sm text-red-700 space-y-1">
            {result.alertasNotaZero.map((alert, i) => (
              <li key={i} className="flex items-start gap-1">
                <span className="mt-0.5">•</span>
                <span>{alert}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Competências */}
      <div className="space-y-2">
        <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wide">Análise por Competência</h4>
        {result.competencias.map((comp) => (
          <AiCompetencyCard key={comp.competencia} analysis={comp} />
        ))}
      </div>

      {/* Proposta de Intervenção */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h4 className="text-sm font-bold text-[#7F5D99] uppercase tracking-wide mb-3">Proposta de Intervenção (C5)</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {result.propostaIntervencao.map((elem) => (
            <div
              key={elem.elemento}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
                elem.presente
                  ? elem.qualidade === 'detalhado'
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-gray-50 border-gray-200 text-gray-400'
              }`}
            >
              <span className="font-medium capitalize">{elem.elemento.replace('_', '/')}: </span>
              <span className="truncate">{elem.descricao || 'Ausente'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pontos fortes e melhoria */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <h4 className="text-sm font-bold text-green-700 uppercase tracking-wide mb-2">✓ Pontos Fortes</h4>
          <ul className="text-sm text-green-800 space-y-1">
            {result.pontosFortesGerais.map((p, i) => (
              <li key={i} className="flex items-start gap-1">
                <span className="mt-0.5">•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <h4 className="text-sm font-bold text-orange-700 uppercase tracking-wide mb-2">↑ A Melhorar</h4>
          <ul className="text-sm text-orange-800 space-y-1">
            {result.pontosMelhoria.map((p, i) => (
              <li key={i} className="flex items-start gap-1">
                <span className="mt-0.5">•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Aviso de limitações */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
        <p className="text-xs text-gray-500 leading-relaxed text-center">
          ℹ️ {result.avisoLimitacoes}
        </p>
      </div>
    </div>
  );
}