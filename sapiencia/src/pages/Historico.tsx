import { useState, useEffect, useMemo, useRef } from 'react'
import { getHistory, deleteTraining, exportHistory, importHistory, type TrainingRecord } from '../services/storage'

type ScoreFilter = 'all' | 'high' | 'mid' | 'low' | 'zero'
type SortBy = 'date-desc' | 'date-asc' | 'score-desc' | 'score-asc'

export default function Historico() {
  const [records, setRecords] = useState<TrainingRecord[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('all')
  const [sortBy, setSortBy] = useState<SortBy>('date-desc')
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    const json = exportHistory()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sapiencia-historico-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string
        const result = importHistory(json)
        setRecords(getHistory())
        setImportMessage({
          type: 'success',
          text: `${result.imported} registro(s) importado(s)${result.skipped > 0 ? `, ${result.skipped} duplicado(s) ignorado(s)` : ''}.`,
        })
      } catch (err) {
        setImportMessage({
          type: 'error',
          text: err instanceof Error ? err.message : 'Erro desconhecido ao importar.',
        })
      }
      // Limpa mensagem após 5 segundos
      setTimeout(() => setImportMessage(null), 5000)
    }
    reader.readAsText(file)
    // Reseta o input para permitir reimportar o mesmo arquivo
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  useEffect(() => {
    setRecords(getHistory())
  }, [])

  const filtered = useMemo(() => {
    let result = records

    // Busca por título do tema
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      result = result.filter(r => r.themeTitle.toLowerCase().includes(q))
    }

    // Filtro por faixa de nota
    switch (scoreFilter) {
      case 'high':
        result = result.filter(r => r.totalScore >= 800)
        break
      case 'mid':
        result = result.filter(r => r.totalScore >= 600 && r.totalScore < 800)
        break
      case 'low':
        result = result.filter(r => r.totalScore > 0 && r.totalScore < 600)
        break
      case 'zero':
        result = result.filter(r => r.totalScore === 0)
        break
    }

    // Ordenação
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.date).getTime() - new Date(a.date).getTime()
        case 'date-asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime()
        case 'score-desc':
          return b.totalScore - a.totalScore
        case 'score-asc':
          return a.totalScore - b.totalScore
        default:
          return 0
      }
    })

    return result
  }, [records, search, scoreFilter, sortBy])

  const handleDelete = (id: string) => {
    deleteTraining(id)
    setRecords(prev => prev.filter(r => r.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  const formatDate = (iso: string): string => {
    try {
      const d = new Date(iso)
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return iso
    }
  }

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}h ${m}min ${s}s`
    if (m > 0) return `${m}min ${s}s`
    return `${s}s`
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="font-display text-3xl font-bold text-brand-purple-deep dark:text-brand-beige mb-4">
          Histórico de Treinos
        </h2>
        <p className="font-serif text-brand-graphite/60 dark:text-brand-lavender/60 text-lg">
          Nenhum treino salvo ainda. Complete um treino e salve para vê-lo aqui.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-purple-deep dark:text-brand-beige mb-3">
          Histórico de Treinos
        </h2>
        <p className="font-serif text-brand-graphite dark:text-brand-lavender max-w-xl mx-auto">
          Acompanhe sua evolução e revise redações anteriores.
        </p>
      </div>

      {/* Export/Import */}
      <div className="flex flex-wrap gap-3 justify-center sm:justify-end">
        <button
          onClick={handleExport}
          disabled={records.length === 0}
          className="btn-feedback px-4 py-2 rounded-full text-sm font-display font-medium bg-brand-purple/10 dark:bg-brand-lavender/10 text-brand-purple-deep dark:text-brand-beige border border-brand-purple/30 dark:border-brand-lavender/30 hover:bg-brand-purple/20 dark:hover:bg-brand-lavender/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ⬇ Exportar histórico
        </button>
        <label className="btn-feedback px-4 py-2 rounded-full text-sm font-display font-medium bg-brand-purple/10 dark:bg-brand-lavender/10 text-brand-purple-deep dark:text-brand-beige border border-brand-purple/30 dark:border-brand-lavender/30 hover:bg-brand-purple/20 dark:hover:bg-brand-lavender/20 transition-all cursor-pointer">
          ⬆ Importar histórico
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImport}
            className="hidden"
          />
        </label>
      </div>

      {/* Mensagem de import */}
      {importMessage && (
        <div
          className={`text-center py-3 px-4 rounded-lg text-sm font-display font-medium animate-fadeIn ${
            importMessage.type === 'success'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/50'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50'
          }`}
        >
          {importMessage.text}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-brand-beige/95 dark:bg-brand-purple-dark/95 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-brand-lavender/40 dark:border-brand-purple/40 shadow-lg space-y-4">
        <input
          type="text"
          placeholder="Buscar por tema..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white dark:bg-brand-purple-deep border border-brand-lavender/40 dark:border-brand-purple/40 text-brand-graphite dark:text-brand-beige font-serif placeholder:text-brand-graphite/40 dark:placeholder:text-brand-lavender/40 focus:outline-none focus:ring-2 focus:ring-brand-purple/50 dark:focus:ring-brand-lavender/50"
        />

        <div className="flex flex-wrap gap-2 items-center">
          {([
            { key: 'all', label: 'todos' },
            { key: 'high', label: '≥ 800' },
            { key: 'mid', label: '600–799' },
            { key: 'low', label: '1–599' },
            { key: 'zero', label: 'nota zero' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setScoreFilter(key)}
              aria-pressed={scoreFilter === key}
              className={`px-4 py-1.5 rounded-full text-sm font-display transition-all ${
                scoreFilter === key
                  ? 'bg-brand-lavender text-brand-purple-deep font-semibold'
                  : 'bg-brand-purple-deep/50 dark:bg-brand-purple/20 text-brand-graphite dark:text-brand-lavender border border-brand-lavender/30 dark:border-brand-purple/30 hover:bg-brand-lavender/20 dark:hover:bg-brand-purple/30'
              }`}
            >
              {label}
            </button>
          ))}

          <span className="ml-auto text-xs font-display text-brand-graphite/60 dark:text-brand-lavender/60">
            {filtered.length} de {records.length} resultados
          </span>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-display text-brand-graphite/60 dark:text-brand-lavender/60">Ordenar:</span>
          {([
            { key: 'date-desc', label: 'Mais recente' },
            { key: 'date-asc', label: 'Mais antigo' },
            { key: 'score-desc', label: 'Maior nota' },
            { key: 'score-asc', label: 'Menor nota' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              aria-pressed={sortBy === key}
              className={`px-3 py-1 rounded-full text-xs font-display transition-all ${
                sortBy === key
                  ? 'bg-brand-purple text-brand-beige font-semibold'
                  : 'bg-brand-purple-deep/30 dark:bg-brand-purple/10 text-brand-graphite dark:text-brand-lavender border border-brand-lavender/20 dark:border-brand-purple/20 hover:bg-brand-purple/20 dark:hover:bg-brand-purple/20'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && records.length > 0 && (
          <div className="text-center py-12">
            <p className="font-serif text-brand-graphite/60 dark:text-brand-lavender/60 text-lg">
              Nenhum treino encontrado com os filtros atuais.
            </p>
          </div>
        )}

        {filtered.map((record) => {
          const isExpanded = expandedId === record.id
          return (
            <div
              key={record.id}
              className="bg-brand-beige/98 dark:bg-brand-purple-dark/98 backdrop-blur-md rounded-xl border border-brand-lavender/40 dark:border-brand-purple/40 shadow-lg overflow-hidden transition-all duration-200"
            >
              {/* Summary row */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : record.id)}
                className="w-full px-5 py-4 flex items-center gap-4 text-left btn-feedback"
                aria-expanded={isExpanded}
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-base font-bold text-brand-purple-deep dark:text-brand-beige truncate">
                    {record.themeTitle}
                  </h3>
                  <p className="text-xs font-display text-brand-graphite/60 dark:text-brand-lavender/60 mt-1">
                    {formatDate(record.date)}
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-xs font-display text-brand-graphite/50 dark:text-brand-lavender/50 hidden sm:inline">
                    {formatTime(record.timeSeconds)}
                  </span>
                  <div className={`px-3 py-1 rounded-full text-sm font-display font-bold tabular-nums ${
                    record.totalScore >= 800
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : record.totalScore >= 600
                        ? 'bg-brand-purple/10 dark:bg-brand-lavender/20 text-brand-purple-deep dark:text-brand-beige'
                        : record.totalScore === 0
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                  }`}>
                    {record.totalScore}
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`w-4 h-4 text-brand-graphite/40 dark:text-brand-lavender/40 transition-transform duration-200 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-5 pb-5 space-y-4 border-t border-brand-lavender/20 dark:border-brand-purple/20 pt-4 animate-fadeIn">
                  {/* Scores grid */}
                  <div className="grid grid-cols-5 gap-2">
                    {(['c1', 'c2', 'c3', 'c4', 'c5'] as const).map((key) => (
                      <div key={key} className="text-center p-2 rounded-lg bg-brand-purple/5 dark:bg-brand-lavender/10">
                        <p className="text-[10px] font-display font-semibold text-brand-graphite/50 dark:text-brand-lavender/50 uppercase">
                          {key.toUpperCase()}
                        </p>
                        <p className="text-lg font-display font-bold text-brand-purple-deep dark:text-brand-beige tabular-nums">
                          {record.scores[key]}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap gap-4 text-xs font-display text-brand-graphite/60 dark:text-brand-lavender/60">
                    <span>⏱ {formatTime(record.timeSeconds)}</span>
                    <span>📝 {record.wordCount} palavras</span>
                    <span>📄 ~{record.estimatedLines} linhas</span>
                  </div>

                  {/* Critical situations */}
                  {record.criticalSituations.length > 0 && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/50">
                      <p className="text-xs font-display font-semibold text-red-700 dark:text-red-300 mb-1">
                        Situações críticas:
                      </p>
                      <ul className="list-disc list-inside text-xs font-display text-red-600 dark:text-red-400">
                        {record.criticalSituations.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Checklist C5 */}
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(record.checklistC5).map(([key, checked]) => (
                      <span
                        key={key}
                        className={`text-[10px] font-display font-medium px-2 py-1 rounded-md border ${
                          checked
                            ? 'bg-brand-purple/10 dark:bg-brand-lavender/20 border-brand-purple/30 dark:border-brand-lavender/30 text-brand-purple-deep dark:text-brand-beige'
                            : 'border-brand-lavender/20 dark:border-brand-purple/20 text-brand-graphite/30 dark:text-brand-lavender/30 line-through'
                        }`}
                      >
                        {key === 'agent' ? 'Agente' : key === 'action' ? 'Ação' : key === 'means' ? 'Meio' : key === 'purpose' ? 'Finalidade' : 'Detalhe'}
                      </span>
                    ))}
                  </div>

                  {/* Full text */}
                  <div className="space-y-2">
                    <p className="text-xs font-display font-semibold text-brand-purple-deep dark:text-brand-beige">
                      Texto completo:
                    </p>
                    <div className="p-4 rounded-lg bg-white dark:bg-brand-purple-deep border border-brand-lavender/30 dark:border-brand-purple/30 max-h-60 overflow-y-auto">
                      <p className="font-serif text-sm text-brand-graphite dark:text-brand-beige/90 leading-relaxed whitespace-pre-wrap">
                        {record.text}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => handleDelete(record.id)}
                      className="btn-feedback text-xs font-display font-medium text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 px-3 py-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      Excluir registro
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}