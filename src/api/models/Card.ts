import type { Category } from './Category'

export type CardId = string

export interface CardUserData {
  question: string
  answer: string
  tag?: string
}

export interface Card extends CardUserData {
  id: CardId
  category: Category
}

/** Carte enrichie côté UI (état d'affichage local, non persisté). */
export interface CardWithUiState extends Card {
  showAnswer: boolean
}
