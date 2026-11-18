const STORAGE_KEYS = {
  FAVORITES: 'sapiencia_favorites',
  HISTORY: 'sapiencia_history',
} as const

export interface TrainingRecord {
  id: string
  themeTitle: string
  text: string
  date: string
  timeSeconds: number
  wordCount: number
  estimatedLines: number
  scores: {
    c1: number
    c2: number
    c3: number
    c4: number
    c5: number
  }
  totalScore: number
  criticalSituations: string[]
  checklistC5: {
    agent: boolean
    action: boolean
    means: boolean
    purpose: boolean
    detail: boolean
  }
}

function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__sapiencia_test__'
    localStorage.setItem(testKey, 'test')
    localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

const storageAvailable = isLocalStorageAvailable()

if (!storageAvailable) {
  console.warn('LocalStorage não disponível. Os dados serão mantidos apenas durante esta sessão.')
}

// In-memory fallback
let memoryFavorites: Set<string> = new Set()
let memoryHistory: TrainingRecord[] = []

export function getFavorites(): string[] {
  if (!storageAvailable) {
    return Array.from(memoryFavorites)
  }
  try {
    const data = localStorage.getItem(STORAGE_KEYS.FAVORITES)
    if (!data) return []
    const parsed = JSON.parse(data)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is string => typeof item === 'string')
  } catch (e) {
    console.error('Erro ao ler favoritos:', e)
    return []
  }
}

export function toggleFavorite(id: string): boolean {
  const favorites = new Set(getFavorites())
  let added: boolean

  if (favorites.has(id)) {
    favorites.delete(id)
    added = false
  } else {
    favorites.add(id)
    added = true
  }

  if (!storageAvailable) {
    memoryFavorites = favorites
    return added
  }

  try {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(Array.from(favorites)))
  } catch (e) {
    console.error('Erro ao salvar favorito:', e)
  }

  return added
}

export function isFavorite(id: string): boolean {
  return getFavorites().includes(id)
}

export function getHistory(): TrainingRecord[] {
  if (!storageAvailable) {
    return [...memoryHistory]
  }
  try {
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY)
    if (!data) return []
    const parsed = JSON.parse(data)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is TrainingRecord =>
        item && typeof item === 'object' && typeof item.id === 'string'
    )
  } catch (e) {
    console.error('Erro ao ler histórico:', e)
    return []
  }
}

export function saveTraining(record: TrainingRecord): void {
  const history = getHistory()
  history.unshift(record)

  // Keep only the 30 most recent records
  const trimmed = history.slice(0, 30)

  if (!storageAvailable) {
    memoryHistory = trimmed
    return
  }

  try {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(trimmed))
  } catch (e) {
    console.error('Erro ao salvar treino:', e)
  }
}

export function deleteTraining(id: string): void {
  const history = getHistory().filter((r) => r.id !== id)

  if (!storageAvailable) {
    memoryHistory = history
    return
  }

  try {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history))
  } catch (e) {
    console.error('Erro ao deletar treino:', e)
  }
}

export function exportHistory(): string {
  const history = getHistory()
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), records: history }, null, 2)
}

export function importHistory(json: string): { imported: number; skipped: number } {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('Arquivo JSON inválido')
  }

  // Suporta formato com wrapper { records: [...] } ou array direto
  let records: unknown[]
  if (Array.isArray(parsed)) {
    records = parsed
  } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>).records)) {
    records = (parsed as Record<string, unknown>).records as unknown[]
  } else {
    throw new Error('Formato de arquivo não reconhecido')
  }

  const validRecords = records.filter(
    (item): item is TrainingRecord =>
      item !== null &&
      typeof item === 'object' &&
      typeof (item as Record<string, unknown>).id === 'string' &&
      typeof (item as Record<string, unknown>).themeTitle === 'string' &&
      typeof (item as Record<string, unknown>).totalScore === 'number'
  )

  if (validRecords.length === 0) {
    throw new Error('Nenhum registro válido encontrado no arquivo')
  }

  const existing = getHistory()
  const existingIds = new Set(existing.map((r) => r.id))

  const newRecords = validRecords.filter((r) => !existingIds.has(r.id))
  const skipped = validRecords.length - newRecords.length

  // Mescla: novos registros primeiro, depois existentes, limita a 30
  const merged = [...newRecords, ...existing].slice(0, 30)

  if (!storageAvailable) {
    memoryHistory = merged
    return { imported: newRecords.length, skipped }
  }

  try {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(merged))
  } catch (e) {
    console.error('Erro ao importar histórico:', e)
    throw new Error('Erro ao salvar dados importados')
  }

  return { imported: newRecords.length, skipped }
}