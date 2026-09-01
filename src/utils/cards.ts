import { Category } from '@/api/models/Category'
import { CardType } from '@/api/models/CardType'
import type { Card } from '@/api/models/Card'

/** Ordre de progression du système de Leitner, de la boîte 1 à la carte acquise. */
export const CATEGORY_ORDER: Category[] = [
  Category.FIRST,
  Category.SECOND,
  Category.THIRD,
  Category.FOURTH,
  Category.FIFTH,
  Category.SIXTH,
  Category.SEVENTH,
  Category.DONE,
]

const CATEGORY_LABELS: Record<Category, string> = {
  [Category.FIRST]: 'Boîte 1',
  [Category.SECOND]: 'Boîte 2',
  [Category.THIRD]: 'Boîte 3',
  [Category.FOURTH]: 'Boîte 4',
  [Category.FIFTH]: 'Boîte 5',
  [Category.SIXTH]: 'Boîte 6',
  [Category.SEVENTH]: 'Boîte 7',
  [Category.DONE]: 'Acquise',
}

export function categoryLabel(category: Category): string {
  return CATEGORY_LABELS[category] ?? String(category)
}

export function categoryColor(category: Category): string {
  if (category === Category.DONE) return 'success'
  const index = CATEGORY_ORDER.indexOf(category)
  if (index <= 1) return 'error'
  if (index <= 3) return 'warning'
  return 'info'
}

/** Avancement d'une carte, de 0 (boîte 1) à 1 (acquise). */
export function cardProgress(card: Card): number {
  const index = CATEGORY_ORDER.indexOf(card.category)
  if (index < 0) return 0
  return index / (CATEGORY_ORDER.length - 1)
}

/** Progression globale du paquet, en pourcentage entier. */
export function deckProgress(cards: Card[]): number {
  if (cards.length === 0) return 0
  const total = cards.reduce((sum, card) => sum + cardProgress(card), 0)
  return Math.round((total / cards.length) * 100)
}

/**
 * Compare une réponse saisie à la réponse attendue en ignorant la casse,
 * les accents, la ponctuation et les espaces superflus — indispensable
 * quand on tape au pouce sur un clavier iPhone.
 */
export function normalizeAnswer(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('fr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
}

export function answersMatch(given: string, expected: string): boolean {
  return normalizeAnswer(given) === normalizeAnswer(expected)
}

/** Une carte sans type (créée avant l'introduction du champ) est traitée
 *  comme ATOMIC : c'était le seul mode disponible jusque-là. */
export function effectiveCardType(card: Pick<Card, 'type'>): CardType {
  return card.type ?? CardType.ATOMIC
}

export function isOralCard(card: Pick<Card, 'type'>): boolean {
  return effectiveCardType(card) === CardType.ORAL
}

const CARD_TYPE_LABELS: Record<CardType, string> = {
  [CardType.ATOMIC]: 'Atomique',
  [CardType.ORAL]: 'Oral',
}

export function cardTypeLabel(type: CardType): string {
  return CARD_TYPE_LABELS[type]
}
