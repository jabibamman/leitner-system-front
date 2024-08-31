import axios from 'axios';
import type { Card, CardId, CardUserData } from './models/Card';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_APP_API_URL,
  headers: {
    'Content-type': 'application/json',
  },
});

interface AnswerPayload {
  isValid: boolean;
}

export const APIService = {
  getAllCards(tags?: string[]): Promise<Card[]> {
    const queryParams: Record<string, string> = {};

    if (tags && tags.length > 0) {
      queryParams['tags'] = tags.join(',');
    }

    return apiClient.get('/cards', { params: queryParams }).then(res => res.data);
  },

  createCard(data: CardUserData): Promise<Card> {
    return apiClient.post('/cards', data).then(res => res.data);
  },

  getCardsForQuizz(date?: string): Promise<Card[]> {
    return apiClient.get('/cards/quizz', { params: { date } }).then(res => res.data);
  },

  answerCard(cardId: CardId, answer: AnswerPayload): Promise<void> {
    return apiClient.patch(`/cards/${cardId}/answer`, answer).then(res => res.data);
  },
};

export default APIService;
