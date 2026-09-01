import type { Category } from './Category'
import type { CardType } from './CardType'

export type CardId = string

export interface CardUserData {
  question: string
  answer: string
  tag?: string
  /** Omis ou absent : le serveur applique ATOMIC par défaut. */
  type?: CardType
}

export interface Card extends CardUserData {
  id: CardId
  category: Category
  /** Absent uniquement sur une carte créée avant l'introduction du champ. */
  type?: CardType
}

/** Carte enrichie côté UI (état d'affichage local, non persisté). */
export interface CardWithUiState extends Card {
  showAnswer: boolean
}
