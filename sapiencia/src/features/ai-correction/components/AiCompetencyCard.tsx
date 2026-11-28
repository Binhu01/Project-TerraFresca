import { useState } from 'react';
import type { CompetencyAnalysis } from '../types/aiCorrection.types';

interface AiCompetencyCardProps {
  analysis: CompetencyAnalysis;
}

const LEVEL_COLORS: Record<string, string> = {
  insuficiente: 'text-red-600 bg-red-50 border-red-200',
  regular: 'text-orange-600 bg-orange-50 border-orange-200',
  bom: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  muito_bom: 'text-green-600 bg-green-50 border-green-200',
  excelente: 'text-emerald-700 bg-emerald-50 border-emerald-200',
};

const LEVEL_LABELS: Record<string, string> = {
  insuficiente: 'Insuficiente',
  regular: 'Regular',
  bom: 'Bom',
  muito_bom: 'Muito Bom',
  excelente: 'Excelente',
};

export function AiCompetencyCard({ analysis }: AiCompetencyCardProps) {
  const [expanded, setExpanded] = useState(false);
  const colorClass = LEVEL_COLORS[analysis.nivel] || LEVEL_COLORS.regular;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-[#7F5D99] uppercase tracking-wide">
            C{analysis.competencia}
          </span>
          <span className="text-sm font-semibold text-gray-800">{analysis.nome}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${colorClass}`}>
            {LEVEL_LABELS[analysis.nivel]}
          </span>
          <span className="text-lg font-bold text-[#7F5D99]">{analysis.nota}</span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          {/* Justificativa */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Justificativa</p>
            <p className="text-sm text-gray-700 leading-relaxed">{analysis.justificativa}</p>
          </div>

          {/* Pontos fortes e fracos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {analysis.pontosFortes.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-green-600 uppercase mb-1">✓ Pontos Fortes</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  {analysis.pontosFortes.map((p, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-green-500 mt-0.5">•</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.pontosFracos.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-orange-600 uppercase mb-1">✗ A Melhorar</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  {analysis.pontosFracos.map((p, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-orange-500 mt-0.5">•</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Evidências */}
          {analysis.evidencias.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Evidências no Texto</p>
              <div className="space-y-1">
                {analysis.evidencias.map((e, i) => (
                  <p key={i} className="text-xs text-gray-600 italic bg-gray-50 px-3 py-1.5 rounded-lg border-l-2 border-[#7F5D99]/40">
                    "{e}"
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Recomendações */}
          {analysis.recomendacoes.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#7F5D99] uppercase mb-1">💡 Recomendações</p>
              <ul className="text-sm text-gray-600 space-y-1">
                {analysis.recomendacoes.map((r, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-[#7F5D99] mt-0.5">→</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}