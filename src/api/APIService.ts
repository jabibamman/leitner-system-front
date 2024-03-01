import axios from 'axios';
import type { Card, CardId, CardUserData } from './models/Card'; // Note l'utilisation de "type" ici

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
    // Construct the query parameters object
    const queryParams = {};
    if (tags && tags.length > 0) {
      // If tags are provided, add them to the query parameters
      queryParams['tags'] = tags.join(',');
    }
  
    // Make the API call with the constructed query parameters
    return apiClient.get('/cards', { params: queryParams }).then(res => res.data);
  },

  createCard(data: CardUserData): Promise<Card> {
    console.log(data);
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

