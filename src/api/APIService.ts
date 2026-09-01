import axios from 'axios'
import type { Card, CardId, CardUserData } from './models/Card'
import type { AnswerPayload } from './models/AnswerPayload'
import type { CardType } from './models/CardType'

const rawBaseUrl = import.meta.env.VITE_APP_API_URL

if (!rawBaseUrl) {
  console.warn(
    "[Leitner] VITE_APP_API_URL n'est pas défini : les appels API échoueront. " +
      'Définis cette variable dans .env.local (dev) ou dans les variables du projet (Vercel).',
  )
}

/** Supprime le "/" final pour éviter les URLs en "//cards". */
export const API_BASE_URL = (rawBaseUrl ?? '').replace(/\/+$/, '')

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-type': 'application/json',
  },
})

/** Message lisible pour l'utilisateur, à afficher tel quel dans l'UI. */
export function toUserMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') {
      return 'Le serveur met trop de temps à répondre. Réessaie dans un instant.'
    }
    if (!error.response) {
      return 'Impossible de joindre le serveur. Vérifie ta connexion.'
    }
    if (error.response.status === 404) return 'Ressource introuvable.'
    if (error.response.status >= 500) return 'Le serveur a rencontré une erreur. Réessaie plus tard.'
    return 'La requête a été refusée par le serveur.'
  }
  return 'Une erreur inattendue est survenue.'
}

export const APIService = {
  getAllCards(tags?: string[], type?: CardType): Promise<Card[]> {
    const params: Record<string, string> = {}
    const cleaned = tags?.map((tag) => tag.trim()).filter(Boolean) ?? []

    if (cleaned.length > 0) {
      params.tags = cleaned.join(',')
    }
    if (type) {
      params.type = type
    }

    return apiClient.get<Card[]>('/cards', { params }).then((res) => res.data)
  },

  createCard(data: CardUserData): Promise<Card> {
    return apiClient.post<Card>('/cards', data).then((res) => res.data)
  },

  /** Sans `type`, renvoie les cartes dues des deux cycles mélangées : à
   *  réserver aux écrans qui ne lancent pas de session (ex. l'accueil). */
  getCardsForQuizz(date?: string, type?: CardType): Promise<Card[]> {
    return apiClient
      .get<Card[]>('/cards/quizz', { params: { date, type } })
      .then((res) => res.data)
  },

  answerCard(cardId: CardId, answer: AnswerPayload): Promise<void> {
    return apiClient.patch(`/cards/${cardId}/answer`, answer).then((res) => res.data)
  },
}

export default APIService
