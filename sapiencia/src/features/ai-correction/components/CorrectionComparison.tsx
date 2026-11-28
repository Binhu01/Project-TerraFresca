import type { MotorComparison } from '../types/aiCorrection.types';

interface CorrectionComparisonProps {
  comparison: MotorComparison;
}

export function CorrectionComparison({ comparison }: CorrectionComparisonProps) {
  const competencies = Object.keys(comparison.heuristicScores);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden animate-fade-in">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
          <svg className="w-4 h-4 text-[#7F5D99]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          Comparação entre Motores
        </h4>
      </div>

      {/* Tabela de comparação */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Competência</th>
              <th className="text-center px-3 py-2 text-xs font-semibold text-blue-600 uppercase">Heurístico</th>
              <th className="text-center px-3 py-2 text-xs font-semibold text-[#7F5D99] uppercase">IA</th>
              <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Dif.</th>
            </tr>
          </thead>
          <tbody>
            {competencies.map((comp) => {
              const hScore = comparison.heuristicScores[comp];
              const aScore = comparison.aiScores[comp];
              const diff = Math.abs(hScore - aScore);
              const isDivergent = diff > 40;

              return (
                <tr key={comp} className={`border-b border-gray-50 ${isDivergent ? 'bg-yellow-50/50' : ''}`}>
                  <td className="px-4 py-2.5 text-gray-700 font-medium">{comp}</td>
                  <td className="text-center px-3 py-2.5 text-blue-700 font-semibold">{hScore}</td>
                  <td className="text-center px-3 py-2.5 text-[#7F5D99] font-semibold">{aScore}</td>
                  <td className="text-center px-3 py-2.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                        isDivergent
                          ? 'bg-yellow-100 text-yellow-700'
                          : diff === 0
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {diff > 0 ? `±${diff}` : '='}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-bold">
              <td className="px-4 py-2.5 text-gray-700">Total</td>
              <td className="text-center px-3 py-2.5 text-blue-700">{comparison.heuristicTotal}</td>
              <td className="text-center px-3 py-2.5 text-[#7F5D99]">{comparison.aiTotal}</td>
              <td className="text-center px-3 py-2.5 text-gray-600">
                ±{Math.abs(comparison.heuristicTotal - comparison.aiTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Divergências significativas */}
      {comparison.divergences.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-100 bg-yellow-50/30">
          <p className="text-xs font-semibold text-yellow-700 uppercase mb-2">⚡ Divergências Significativas (&gt;40 pts)</p>
          <div className="space-y-2">
            {comparison.divergences.map((div) => (
              <div key={div.competency} className="text-sm">
                <span className="font-medium text-gray-700">{div.competency}: </span>
                <span className="text-gray-600">{div.possibleReason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nota explicativa */}
      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-500 leading-relaxed">
          💡 As diferenças entre os motores são normais e informativas. O motor heurístico analisa padrões estruturais, enquanto a IA avalia o significado contextual. Nenhuma nota é calculada como média — ambas as avaliações são independentes.
        </p>
      </div>
    </div>
  );
}