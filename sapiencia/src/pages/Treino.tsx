import { useState, useMemo, useCallback, useRef } from 'react'
import { TEMAS } from '../data/temas'
import { useTimer } from '../hooks/useTimer'
import { useAutoEvaluation } from '../hooks/useAutoEvaluation'
import { useDebouncedCorrection } from '../hooks/useDebouncedCorrection'
import { buildCorrectionResult, hasTextChangedSignificantly, type CorrectionResult } from '../services/correctionService'
import { saveTraining, type TrainingRecord } from '../services/storage'
import { useAiCorrection } from '../features/ai-correction/hooks/useAiCorrection'
import { AiCorrectionButton } from '../features/ai-correction/components/AiCorrectionButton'
import { AiCorrectionReport } from '../features/ai-correction/components/AiCorrectionReport'
import { CorrectionComparison } from '../features/ai-correction/components/CorrectionComparison'
import { compareEvaluations } from '../features/ai-correction/services/aiCorrectionService'

type CorrectionMode = 'realtime' | 'final'

const COMPETENCIAS = [
  { key: 'c1', label: 'C1', desc: 'Domínio da modalidade escrita formal' },
  { key: 'c2', label: 'C2', desc: 'Compreensão do tema e repertório sociocultural' },
  { key: 'c3', label: 'C3', desc: 'Seleção e organização dos argumentos' },
  { key: 'c4', label: 'C4', desc: 'Coesão e mecanismos linguísticos' },
  { key: 'c5', label: 'C5', desc: 'Proposta de intervenção' },
] as const


interface CriticalSituation {
  id: string
  label: string
  requiresConfirmation: boolean
  zerosGlobal: boolean
  zerosC5Only: boolean
}

const CRITICAL_SITUATIONS: CriticalSituation[] = [
  { id: 'fuga', label: 'Fuga total ao tema', requiresConfirmation: false, zerosGlobal: true, zerosC5Only: false },
  { id: 'linhas', label: 'Texto com até 7 linhas autorais', requiresConfirmation: true, zerosGlobal: true, zerosC5Only: false },
  { id: 'copia', label: 'Cópia integral sem produção autoral suficiente', requiresConfirmation: false, zerosGlobal: true, zerosC5Only: false },
  { id: 'desconectado', label: 'Parte deliberadamente desconectada do tema', requiresConfirmation: false, zerosGlobal: true, zerosC5Only: false },
  { id: 'estrutura', label: 'Não atendimento à estrutura dissertativo-argumentativa', requiresConfirmation: false, zerosGlobal: true, zerosC5Only: false },
  { id: 'dh', label: 'Desrespeito aos direitos humanos na proposta', requiresConfirmation: false, zerosGlobal: false, zerosC5Only: true },
]

export default function Treino() {
  // Theme selection
  const [selectedThemeId, setSelectedThemeId] = useState<string>(TEMAS[0].id)
  const selectedTheme = useMemo(() => TEMAS.find(t => t.id === selectedThemeId) || TEMAS[0], [selectedThemeId])

  // Editor
  const [text, setText] = useState('')

  // Correction mode toggle
  const [correctionMode, setCorrectionMode] = useState<CorrectionMode>('realtime')
  const [finalCorrection, setFinalCorrection] = useState<CorrectionResult | null>(null)
  const [hasFinalizedCorrection, setHasFinalizedCorrection] = useState(false)
  const finalizedTextRef = useRef('')

  // Timer - persists across navigation because it's in this component
  // For true persistence across page unmounts, we'd need context or a ref at App level
  // Using a module-level approach instead
  const timer = useTimer()


  // Critical situations
  const [criticalFlags, setCriticalFlags] = useState<Record<string, boolean>>({})
  const [confirmedSituations, setConfirmedSituations] = useState<Record<string, boolean>>({})

  // Save feedback
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  // Auto-evaluation: usa palavras-chave e equivalências estruturadas do tema
  const themeKeywords = useMemo(() => selectedTheme.palavrasChave || [], [selectedTheme])
  const themeEquivalences = useMemo(() => selectedTheme.equivalencias || [], [selectedTheme])

  const autoEval = useAutoEvaluation(text, themeKeywords, themeEquivalences)

  // AI Deep Evaluation
  const aiCorrection = useAiCorrection()
  const aiComparison = useMemo(() => {
    if (!aiCorrection.result) return null
    return compareEvaluations(autoEval, aiCorrection.result)
  }, [aiCorrection.result, autoEval])

  // Debounced correction for real-time mode
  const { correction: realtimeCorrection, isAnalyzing } = useDebouncedCorrection(
    text,
    themeKeywords,
    { delay: 600, minChars: 20 },
    themeEquivalences
  )

  // Invalidate final correction when text changes significantly after finalization
  const handleTextChange = useCallback((newText: string) => {
    setText(newText)
    if (hasFinalizedCorrection && finalizedTextRef.current !== newText) {
      if (hasTextChangedSignificantly(finalizedTextRef.current, newText)) {
        setFinalCorrection(null)
        setHasFinalizedCorrection(false)
        finalizedTextRef.current = ''
      }
    }
  }, [hasFinalizedCorrection])

  // Finalize correction on demand (modo "Correção Final")
  const handleFinalizeCorrection = useCallback(() => {
    const result = buildCorrectionResult(autoEval)
    setFinalCorrection(result)
    setHasFinalizedCorrection(true)
    finalizedTextRef.current = text
  }, [autoEval, text])

  // Switch mode handler — resets final correction state
  const handleModeChange = useCallback((mode: CorrectionMode) => {
    setCorrectionMode(mode)
    if (mode === 'realtime') {
      setFinalCorrection(null)
      setHasFinalizedCorrection(false)
      finalizedTextRef.current = ''
    }
  }, [])

  // Determine which correction to display
  const activeCorrection = correctionMode === 'realtime' ? realtimeCorrection : finalCorrection

  // Computed values
  const wordCount = useMemo(() => {
    const trimmed = text.trim()
    if (!trimmed) return 0
    return trimmed.split(/\s+/).length
  }, [text])

  const estimatedLines = useMemo(() => {
    if (!text) return 0
    const charsPerLine = 90
    const lines = text.split('\n')
    let total = 0
    for (const line of lines) {
      total += Math.max(1, Math.ceil(line.length / charsPerLine))
    }
    return total
  }, [text])

  // C5 now fully auto-evaluated from text analysis
  const effectiveC5 = autoEval.c5.score

  // Calculate total with critical situations — uses auto-eval scores for C1-C4
  const totalScore = useMemo(() => {
    let hasGlobalZero = false
    let hasC5Zero = false

    for (const situation of CRITICAL_SITUATIONS) {
      if (criticalFlags[situation.id]) {
        if (situation.requiresConfirmation && !confirmedSituations[situation.id]) continue
        if (situation.zerosGlobal) hasGlobalZero = true
        if (situation.zerosC5Only) hasC5Zero = true
      }
    }

    if (hasGlobalZero) return 0

    const c5Final = hasC5Zero ? 0 : effectiveC5
    return autoEval.c1.score + autoEval.c2.score + autoEval.c3.score + autoEval.c4.score + c5Final
  }, [autoEval, effectiveC5, criticalFlags, confirmedSituations])

  const handleSortearTema = useCallback(() => {
    const available = TEMAS.filter(t => t.id !== selectedThemeId)
    if (available.length === 0) return
    const idx = Math.floor(Math.random() * available.length)
    setSelectedThemeId(available[idx].id)
  }, [selectedThemeId])

  const handleToggleCritical = (id: string) => {
    setCriticalFlags(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleConfirmSituation = (id: string) => {
    setConfirmedSituations(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleSalvar = () => {
    const record: TrainingRecord = {
      id: crypto.randomUUID(),
      themeTitle: selectedTheme.titulo,
      text,
      date: new Date().toISOString(),
      timeSeconds: Math.floor(timer.elapsed),
      wordCount,
      estimatedLines,
      scores: {
        c1: autoEval.c1.score,
        c2: autoEval.c2.score,
        c3: autoEval.c3.score,
        c4: autoEval.c4.score,
        c5: effectiveC5,
      },
      totalScore,
      criticalSituations: CRITICAL_SITUATIONS
        .filter(s => criticalFlags[s.id])
        .map(s => s.label),
      checklistC5: {
        agent: autoEval.c5.score >= 40,
        action: autoEval.c5.score >= 80,
        means: autoEval.c5.score >= 120,
        purpose: autoEval.c5.score >= 160,
        detail: autoEval.c5.score >= 200,
      },
      correctionMode,
    }

    saveTraining(record)
    setSaveMessage('Treino salvo no histórico!')
    setTimeout(() => setSaveMessage(null), 3000)
  }

  const lineWarning = estimatedLines < 8 ? 'below' : estimatedLines > 30 ? 'above' : null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-purple-deep dark:text-brand-beige mb-3">
          Treino de Redação
        </h2>
        <p className="font-serif text-brand-graphite dark:text-brand-lavender max-w-xl mx-auto">
          Pratique a escrita dissertativo-argumentativa com temas reais e autoavaliação guiada.
        </p>
      </div>

      {/* Theme Selection */}
      <section className="bg-brand-lavender/30 dark:bg-brand-purple/40 backdrop-blur-md rounded-2xl p-6 border border-brand-lavender/50 dark:border-brand-purple/50 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <h3 className="font-display text-lg font-bold text-brand-purple-deep dark:text-brand-beige">
            Tema
          </h3>
          <div className="flex gap-2">
            <select
              value={selectedThemeId}
              onChange={(e) => setSelectedThemeId(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white dark:bg-brand-purple-deep border border-brand-lavender/40 dark:border-brand-purple/40 text-sm font-display text-brand-graphite dark:text-brand-beige focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
            >
              {TEMAS.map(t => (
                <option key={t.id} value={t.id}>{t.titulo}</option>
              ))}
            </select>
            <button
              onClick={handleSortearTema}
              className="btn-feedback px-4 py-2 rounded-lg bg-brand-purple/10 dark:bg-brand-lavender/20 text-brand-purple dark:text-brand-lavender text-sm font-display font-medium hover:bg-brand-purple/20 dark:hover:bg-brand-lavender/30"
            >
              Sortear
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-display text-xl font-bold text-brand-purple-deep dark:text-brand-beige">
            {selectedTheme.titulo}
          </h4>
          <p className="font-serif text-brand-graphite dark:text-brand-beige/90 leading-relaxed">
            {selectedTheme.contextualizacao}
          </p>
          <div className="bg-brand-purple/5 dark:bg-brand-lavender/10 rounded-lg p-4">
            <p className="text-sm font-display font-medium text-brand-purple-deep dark:text-brand-lavender mb-1">
              🎯 Problemática:
            </p>
            <p className="font-serif text-sm text-brand-graphite dark:text-brand-beige/80 leading-relaxed">
              {selectedTheme.problematica}
            </p>
          </div>
        </div>
      </section>

      {/* Timer */}
      <section className="flex flex-wrap items-center justify-center gap-4 bg-brand-beige/90 dark:bg-brand-purple-dark/90 backdrop-blur-sm rounded-xl p-4 border border-brand-lavender/30 dark:border-brand-purple/30">
        <span className="font-display text-3xl font-mono font-bold text-brand-purple-deep dark:text-brand-beige tabular-nums tracking-wider">
          {timer.formatTime(timer.elapsed)}
        </span>
        <div className="flex gap-2">
          {!timer.isRunning ? (
            <button
              onClick={timer.start}
              className="btn-feedback px-4 py-2 rounded-lg bg-brand-purple text-brand-beige text-sm font-display font-medium"
            >
              Iniciar
            </button>
          ) : (
            <button
              onClick={timer.pause}
              className="btn-feedback px-4 py-2 rounded-lg bg-brand-graphite text-brand-beige text-sm font-display font-medium"
            >
              Pausar
            </button>
          )}
          <button
            onClick={() => {
              timer.reset()
              setText('')
              setFinalCorrection(null)
              setHasFinalizedCorrection(false)
              finalizedTextRef.current = ''
              setCriticalFlags({})
              setConfirmedSituations({})
            }}
            className="btn-feedback px-4 py-2 rounded-lg border border-brand-lavender/40 dark:border-brand-purple/40 text-brand-graphite dark:text-brand-lavender text-sm font-display font-medium hover:bg-brand-purple/10 dark:hover:bg-brand-lavender/10"
          >
            Reiniciar
          </button>
        </div>
      </section>

      {/* Editor */}
      <section className="bg-brand-beige/98 dark:bg-brand-purple-dark/98 backdrop-blur-md rounded-2xl p-6 border border-brand-lavender/40 dark:border-brand-purple/40 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="font-display text-lg font-bold text-brand-purple-deep dark:text-brand-beige">
            Sua redação
          </h3>
          <div className="flex items-center gap-4">
            {/* Toggle de Modo de Correção */}
            <div className="flex items-center bg-brand-purple/10 dark:bg-brand-lavender/15 rounded-lg p-1 border border-brand-lavender/30 dark:border-brand-purple/30" role="radiogroup" aria-label="Modo de correção">
              <button
                onClick={() => handleModeChange('realtime')}
                role="radio"
                aria-checked={correctionMode === 'realtime'}
                className={`px-3 py-1.5 rounded-md text-xs font-display font-medium transition-all duration-200 ${
                  correctionMode === 'realtime'
                    ? 'bg-brand-purple text-brand-beige shadow-sm'
                    : 'text-brand-graphite/60 dark:text-brand-lavender/60 hover:text-brand-graphite dark:hover:text-brand-lavender'
                }`}
              >
                ⚡ Tempo Real
              </button>
              <button
                onClick={() => handleModeChange('final')}
                role="radio"
                aria-checked={correctionMode === 'final'}
                className={`px-3 py-1.5 rounded-md text-xs font-display font-medium transition-all duration-200 ${
                  correctionMode === 'final'
                    ? 'bg-brand-purple text-brand-beige shadow-sm'
                    : 'text-brand-graphite/60 dark:text-brand-lavender/60 hover:text-brand-graphite dark:hover:text-brand-lavender'
                }`}
              >
                📝 Correção Final
              </button>
            </div>
            <div className="flex gap-4 text-xs font-display text-brand-graphite/60 dark:text-brand-lavender/60">
              <span>{wordCount} palavras</span>
              <span>~{estimatedLines} linhas</span>
            </div>
          </div>
        </div>

        <textarea
          value={text}
          onChange={(e) => {
            const newText = e.target.value
            // Limita a ~30 linhas (90 chars por linha × 30 = 2700 chars aprox.)
            const maxChars = 90 * 30
            if (newText.length <= maxChars) {
              handleTextChange(newText)
            }
          }}
          placeholder="Comece a escrever sua redação aqui..."
          maxLength={2700}
          className={`w-full min-h-[400px] p-6 rounded-xl bg-white dark:bg-brand-purple-deep border font-serif text-base sm:text-lg text-brand-graphite dark:text-brand-beige leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-brand-purple/50 dark:focus:ring-brand-lavender/50 placeholder:text-brand-graphite/30 dark:placeholder:text-brand-lavender/30 transition-colors duration-200 ${
            correctionMode === 'final' && !hasFinalizedCorrection
              ? 'border-brand-lavender/40 dark:border-brand-purple/40'
              : estimatedLines >= 30
                ? 'border-red-400 dark:border-red-500 ring-1 ring-red-400/30'
                : 'border-brand-lavender/40 dark:border-brand-purple/40'
          }`}
          spellCheck={false}
        />

        {/* Indicador de análise em tempo real */}
        {correctionMode === 'realtime' && isAnalyzing && (
          <div className="flex items-center gap-2 text-xs font-display text-brand-purple/70 dark:text-brand-lavender/70 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-purple dark:bg-brand-lavender animate-bounce" />
            Analisando texto...
          </div>
        )}

        {/* Botão Concluir e Ver Correção (modo final) */}
        {correctionMode === 'final' && !hasFinalizedCorrection && text.trim().length > 0 && (
          <button
            onClick={handleFinalizeCorrection}
            className="w-full py-3 rounded-xl bg-brand-purple text-brand-beige font-display font-medium text-sm shadow-md hover:shadow-lg btn-feedback transition-all"
          >
            ✅ Concluir e Ver Correção
          </button>
        )}

        {/* Aviso de invalidação no modo final */}
        {correctionMode === 'final' && hasFinalizedCorrection && (
          <p className="text-xs font-display text-amber-600 dark:text-amber-400 text-center">
            ✏️ Editar o texto após a correção irá invalidar os resultados. Clique novamente em "Concluir" para reanalisar.
          </p>
        )}

        {lineWarning && (
          <div className={`text-sm font-display font-medium px-4 py-2 rounded-lg ${
            lineWarning === 'below'
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
          }`}>
            {lineWarning === 'below'
              ? `⚠️ Seu texto tem aproximadamente ${estimatedLines} linhas. O mínimo recomendado é 8 linhas.`
              : `⚠️ Seu texto tem aproximadamente ${estimatedLines} linhas. O máximo permitido é 30 linhas.`
            }
          </div>
        )}
      </section>

      {/* Feedback / Correção */}
      <section className="bg-brand-beige/98 dark:bg-brand-purple-dark/98 backdrop-blur-md rounded-2xl p-6 border border-brand-lavender/40 dark:border-brand-purple/40 shadow-lg space-y-6">
        <div className="text-center mb-4">
          <h3 className="font-display text-xl font-bold text-brand-purple-deep dark:text-brand-beige">
            {correctionMode === 'realtime' ? 'Feedback em Tempo Real' : 'Correção Final'}
          </h3>
          <p className="text-xs font-display text-brand-graphite/50 dark:text-brand-lavender/50 mt-1">
            {correctionMode === 'realtime'
              ? 'Análise heurística automática enquanto você escreve'
              : hasFinalizedCorrection
                ? 'Resultado da análise completa do seu texto'
                : 'Escreva sua redação e clique em "Concluir e Ver Correção" para analisar'}
          </p>
        </div>

        {/* Modo final sem correção ainda */}
        {correctionMode === 'final' && !hasFinalizedCorrection && (
          <div className="text-center py-12 text-brand-graphite/40 dark:text-brand-lavender/40">
            <p className="font-display text-lg mb-2">📝</p>
            <p className="font-serif text-sm">Termine de escrever e solicite a correção quando estiver pronto.</p>
          </div>
        )}

        {/* Correção ativa (realtime ou final finalizada) */}
        {activeCorrection && (
          <>
            {/* Overall tips */}
            {activeCorrection.overallTips.length > 0 && (
              <div className="bg-brand-purple/5 dark:bg-brand-lavender/10 rounded-lg p-4 border-l-2 border-brand-purple/40 dark:border-brand-lavender/40">
                {activeCorrection.overallTips.map((tip, i) => (
                  <p key={i} className="text-sm font-serif text-brand-graphite/80 dark:text-brand-lavender/80 leading-relaxed">
                    💡 {tip}
                  </p>
                ))}
              </div>
            )}

            {/* Categorias de correção */}
            <div className="space-y-4">
              {activeCorrection.categories.map((cat) => {
                const levelColor = {
                  critical: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700',
                  'needs-work': 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700',
                  good: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
                  excellent: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700',
                }[cat.level]

                return (
                  <div key={cat.category} className={`rounded-xl border p-4 transition-all duration-300 ${levelColor}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-display text-sm font-bold">
                        {cat.icon} {cat.label}
                      </h4>
                      <span className="font-display text-lg font-bold tabular-nums">
                        {cat.score}/{cat.maxScore} pts
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {cat.tips.map((tip, i) => (
                        <li key={i} className="text-xs font-serif leading-relaxed opacity-90 flex gap-2">
                          <span className="shrink-0">→</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Fallback: mostrar competências individuais quando não há activeCorrection no modo realtime (texto muito curto) */}
        {correctionMode === 'realtime' && !activeCorrection && text.trim().length > 0 && (
          <div className="space-y-4">
            {(['c1', 'c2', 'c3', 'c4', 'c5'] as const).map((key) => {
              const comp = COMPETENCIAS.find(c => c.key === key)!
              const feedback = autoEval[key]
              const levelColor = {
                critical: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700',
                'needs-work': 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700',
                good: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
                excellent: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700',
              }[feedback.level]

              return (
                <div key={key} className={`rounded-xl border p-4 transition-all duration-300 ${levelColor}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-display text-sm font-bold">
                      {comp.label}: {comp.desc}
                    </h4>
                    <span className="font-display text-lg font-bold tabular-nums">
                      {feedback.score} pts
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {feedback.tips.map((tip, i) => (
                      <li key={i} className="text-xs font-serif leading-relaxed opacity-90 flex gap-2">
                        <span className="shrink-0">→</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        )}

        {/* Situações Críticas */}
        <div className="border-t border-brand-lavender/30 dark:border-brand-purple/30 pt-6">
          <h4 className="font-display text-sm font-semibold text-brand-purple-deep dark:text-brand-beige mb-3">
            Situações Críticas (Nota Zero)
          </h4>
          <div className="space-y-2">
            {CRITICAL_SITUATIONS.map((situation) => (
              <div key={situation.id} className="space-y-1">
                <label className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                  <input
                    type="checkbox"
                    checked={!!criticalFlags[situation.id]}
                    onChange={() => handleToggleCritical(situation.id)}
                    className="w-4 h-4 rounded border-red-300 text-red-600 focus:ring-red-500/50"
                  />
                  <span className="text-sm font-display text-brand-graphite dark:text-brand-beige">
                    {situation.label}
                    {situation.zerosGlobal && (
                      <span className="ml-2 text-xs text-red-600 dark:text-red-400 font-medium">(zera nota global)</span>
                    )}
                    {situation.zerosC5Only && (
                      <span className="ml-2 text-xs text-red-600 dark:text-red-400 font-medium">(zera C5)</span>
                    )}
                  </span>
                </label>
                {situation.requiresConfirmation && criticalFlags[situation.id] && (
                  <div className="ml-7 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/50">
                    <p className="text-xs font-display text-amber-800 dark:text-amber-200 mb-2">
                      ⚠️ Como a quantidade de linhas é estimada, confirme que seu texto realmente possui até 7 linhas autorais.
                    </p>
                    <button
                      onClick={() => handleConfirmSituation(situation.id)}
                      className={`px-3 py-1.5 rounded-md text-xs font-display font-medium transition-all ${
                        confirmedSituations[situation.id]
                          ? 'bg-red-600 text-white'
                          : 'bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 hover:bg-amber-300 dark:hover:bg-amber-700'
                      }`}
                    >
                      {confirmedSituations[situation.id] ? '✓ Confirmado' : 'Confirmar situação'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Inline tips below editor — apenas no modo realtime */}
      {correctionMode === 'realtime' && text.trim().length > 0 && activeCorrection && (
        <div className="flex flex-wrap gap-2 justify-center animate-fadeIn">
          {activeCorrection.overallTips.map((tip, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-brand-purple/10 dark:bg-brand-lavender/15 border border-brand-purple/20 dark:border-brand-lavender/20 text-xs font-display text-brand-purple-deep dark:text-brand-lavender">
              💡 {tip}
            </span>
          ))}
        </div>
      )}

      {/* Resultado — visível sempre no modo realtime; no modo final apenas após clicar em Concluir */}
      {(correctionMode === 'realtime' || hasFinalizedCorrection) && (
        <section className="bg-brand-beige/98 dark:bg-brand-purple-dark/98 backdrop-blur-md rounded-2xl p-6 border border-brand-lavender/40 dark:border-brand-purple/40 shadow-lg">
          <h3 className="font-display text-xl font-bold text-brand-purple-deep dark:text-brand-beige text-center mb-6">
            Resultado
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6">
            {(['c1', 'c2', 'c3', 'c4'] as const).map((key) => {
              const comp = COMPETENCIAS.find(c => c.key === key)!
              const feedback = autoEval[key]
              return (
                <div key={key} className={`text-center p-3 rounded-lg border transition-all duration-300 ${
                  feedback.level === 'excellent' ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' :
                  feedback.level === 'good' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700' :
                  feedback.level === 'needs-work' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700' :
                  'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                }`}>
                  <p className="text-xs font-display font-semibold text-brand-graphite/60 dark:text-brand-lavender/60 mb-1">
                    {comp.label}
                  </p>
                  <p className="text-2xl font-display font-bold text-brand-purple-deep dark:text-brand-beige tabular-nums transition-all duration-300">
                    {feedback.score}
                  </p>
                </div>
              )
            })}
            <div className="text-center p-3 rounded-lg bg-brand-purple/5 dark:bg-brand-lavender/10 border border-brand-lavender/30 dark:border-brand-purple/30">
              <p className="text-xs font-display font-semibold text-brand-graphite/60 dark:text-brand-lavender/60 mb-1">
                C5
              </p>
              <p className="text-2xl font-display font-bold text-brand-purple-deep dark:text-brand-beige tabular-nums transition-all duration-300">
                {effectiveC5}
              </p>
            </div>
          </div>

          <div className="text-center py-6 border-t border-brand-lavender/30 dark:border-brand-purple/30">
            <p className="text-sm font-display text-brand-graphite/60 dark:text-brand-lavender/60 mb-2">
              Nota Total
            </p>
            <p className={`text-5xl font-display font-bold tabular-nums transition-all duration-500 ${
              totalScore === 0 ? 'text-red-600 dark:text-red-400' : 'text-brand-purple-deep dark:text-brand-beige'
            }`}>
              {totalScore}
            </p>
            <p className="text-xs font-display text-brand-graphite/40 dark:text-brand-lavender/40 mt-1">
              de 1000 pontos
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-display text-brand-graphite/60 dark:text-brand-lavender/60 mb-6">
            <span>⏱ {timer.formatTime(timer.elapsed)}</span>
            <span>📝 {wordCount} palavras</span>
            <span>📄 ~{estimatedLines} linhas</span>
          </div>

          {criticalFlags && Object.values(criticalFlags).some(Boolean) && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/50">
              <p className="text-xs font-display font-semibold text-red-700 dark:text-red-300 mb-2">
                Situações críticas marcadas:
              </p>
              <ul className="list-disc list-inside text-xs font-display text-red-600 dark:text-red-400 space-y-1">
                {CRITICAL_SITUATIONS.filter(s => criticalFlags[s.id]).map(s => (
                  <li key={s.id}>{s.label}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col items-center gap-3">
            <button
              onClick={handleSalvar}
              disabled={!text.trim()}
              className="btn-feedback px-8 py-3 rounded-full bg-brand-purple text-brand-beige font-display font-medium text-base shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Salvar no histórico
            </button>
            {saveMessage && (
              <p className="text-sm font-display font-medium text-green-600 dark:text-green-400 animate-fadeIn">
                ✓ {saveMessage}
              </p>
            )}
          </div>
        </section>
      )}

      {/* AI Deep Evaluation Section */}
      {(correctionMode === 'realtime' || hasFinalizedCorrection) && text.trim().length > 0 && (
        <section className="space-y-4">
          <AiCorrectionButton
            status={aiCorrection.status}
            onEvaluate={() =>
              aiCorrection.requestEvaluation(text, {
                titulo: selectedTheme.titulo,
                contextualizacao: selectedTheme.contextualizacao,
                problematica: selectedTheme.problematica,
              })
            }
            disabled={wordCount < 50}
          />

          {aiCorrection.error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-sm text-red-700 font-medium">❌ {aiCorrection.error}</p>
              <button
                onClick={aiCorrection.reset}
                className="mt-2 text-xs text-red-600 underline hover:text-red-800"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {aiCorrection.result && <AiCorrectionReport result={aiCorrection.result} />}

          {aiComparison && <CorrectionComparison comparison={aiComparison} />}
        </section>
      )}

      {/* Botão salvar visível no modo final antes de concluir (sem notas) */}
      {correctionMode === 'final' && !hasFinalizedCorrection && text.trim().length > 0 && (
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={handleSalvar}
            className="btn-feedback px-8 py-3 rounded-full bg-brand-purple text-brand-beige font-display font-medium text-base shadow-md hover:shadow-lg"
          >
            Salvar no histórico
          </button>
          {saveMessage && (
            <p className="text-sm font-display font-medium text-green-600 dark:text-green-400 animate-fadeIn">
              ✓ {saveMessage}
            </p>
          )}
        </div>
      )}
    </div>
  )
}