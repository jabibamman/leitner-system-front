const STORAGE_KEY = 'leitner.lastSession'

export interface QuizSession {
  correct: number
  total: number
  /** Timestamp ISO de fin de session. */
  finishedAt: string
}

/**
 * Le back ne conserve pas d'historique de révision : on garde le résultat de
 * la dernière session en local, juste pour l'afficher sur l'accueil.
 */
export function readLastSession(): QuizSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<QuizSession>
    if (typeof parsed.correct !== 'number' || typeof parsed.total !== 'number') return null
    return {
      correct: parsed.correct,
      total: parsed.total,
      finishedAt: parsed.finishedAt ?? new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export function saveLastSession(session: Omit<QuizSession, 'finishedAt'>): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...session, finishedAt: new Date().toISOString() }),
    )
  } catch {
    /* Stockage indisponible : on perd juste l'historique d'affichage. */
  }
}

const MODE_KEY = 'leitner.quizMode'
export type QuizMode = 'flip' | 'typing'

export function readQuizMode(): QuizMode {
  try {
    return localStorage.getItem(MODE_KEY) === 'typing' ? 'typing' : 'flip'
  } catch {
    return 'flip'
  }
}

export function saveQuizMode(mode: QuizMode): void {
  try {
    localStorage.setItem(MODE_KEY, mode)
  } catch {
    /* Sans persistance, le mode revient simplement au défaut. */
  }
}
