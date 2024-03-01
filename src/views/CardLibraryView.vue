<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <h1 class="mb-3">Ma bibliothèque de cartes</h1>
        <v-btn color="primary" @click="showCreateModal = true">Créer une carte</v-btn>
      </v-col>
      <v-col cols="12">
        <v-text-field v-model="search" label="Recherche par tags, catégories..." outlined clearable @input="filterCards"></v-text-field>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12" sm="6" md="4" lg="6" v-for="card in filteredCards" :key="card.id">
        <v-card class="ma-2">
          <v-card-title>{{ card.question }}</v-card-title>
          <v-card-subtitle>{{ card.tag }}</v-card-subtitle>
          <v-card-actions>
            <v-text-field 
              v-model="card.userAnswer" 
              label="Votre réponse" 
              outlined 
              dense 
              :disabled="card.answerSubmitted">
            </v-text-field>
            <v-btn color="primary" @click.stop="checkAndSubmitAnswer(card)"
              :disabled="card.answerSubmitted || card.userAnswer.trim() === ''">
              Soumettre
            </v-btn>
          </v-card-actions>
          <v-card-text v-if="card.answerSubmitted">
           {{ card.isCorrect ? 'Bravo !' : 'Réponse : ' + card.answer }}
          <v-btn :color="card.isCorrect ? 'success' : 'error'" @click="resetUserAnswer(card)">
           {{ card.isCorrect ? 'Continuer' : 'Réessayer' }}
          </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-dialog v-model="showCreateModal" persistent full-width>
      <v-card>
        <v-card-title>Créer une nouvelle carte</v-card-title>
        <v-card-text>
          <v-text-field v-model="newCard.question" label="Question"></v-text-field>
          <v-text-field v-model="newCard.tag" label="Tag"></v-text-field>
          <v-text-field v-model="newCard.answer" label="Réponse"></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" @click="createCard">Créer</v-btn>
          <v-btn color="error" @click="closeCreateModal">Annuler</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
<script lang="ts">
import { ref } from 'vue';
import APIService from "@/api/APIService";

export default {
  name: "CardLibraryView",
  setup() {
    const cards = ref([]);
    const filteredCards = ref([]);
    const search = ref("");
    const showCreateModal = ref(false);
    const newCard = ref({ question: "", tag: "", answer: "" });

    const fetchCards = async () => {
      try {
        const response = await APIService.getAllCards();
        cards.value = response.map(card => ({ ...card, showAnswer: false, answerSubmitted: false, userAnswer: "" }));
        filteredCards.value = [...cards.value];
      } catch (error) {
        console.error("Erreur lors de la récupération des cartes:", error);
      }
    };

    const filterCards = async () => {
      try {
        const tags = search.value.split(',');
        const response = await APIService.getAllCards(tags.filter(tag => tag.trim() !== ""));
        cards.value = response.map(card => ({ ...card, showAnswer: false, answerSubmitted: false, userAnswer: "" }));
        filteredCards.value = [...cards.value];
      } catch (error) {
        console.error("Erreur lors du filtrage des cartes:", error);
      }
    };

    const checkAndSubmitAnswer = async (card) => {
      if (card.userAnswer.trim() === '') {
        console.error("Erreur: La réponse est vide.");
        return;
      }
      
      const isValid = card.userAnswer.trim().toLowerCase() === card.answer.trim().toLowerCase();
      try {
        await APIService.answerCard(card.id, { isValid });
        card.answerSubmitted = true;
        card.isCorrect = isValid;
      } catch (error) {
        console.error("Erreur lors de la vérification de la réponse:", error);
      }
    };

    const createCard = async () => {
      try {
        const response = await APIService.createCard(newCard.value);
        cards.value.push({ ...response, showAnswer: false, answerSubmitted: false, userAnswer: "" });
        filteredCards.value = [...cards.value];
        newCard.value = { question: "", tag: "", answer: "" };
        closeCreateModal();
      } catch (error) {
        console.error("Erreur lors de la création de la carte:", error);
      }
    };

    const closeCreateModal = () => {
      showCreateModal.value = false;
    };

    const resetUserAnswer = (card) => {
      card.userAnswer = "";
      card.answerSubmitted = false;
    };

    fetchCards();

    return {
      cards,
      filteredCards,
      search,
      filterCards,
      showCreateModal,
      newCard,
      checkAndSubmitAnswer,
      createCard,
      closeCreateModal,
      resetUserAnswer,
    };
  },
};
</script>