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
        <v-card class="ma-2" :id="'card-' + card.id" @click.prevent.right @click="toggleShowAnswer(card)" @click.right="toggleContextMenu(card)">          <v-card-title>{{ card.question }}</v-card-title>
          <v-card-subtitle>{{ card.tag }}</v-card-subtitle>
          <v-card-subtitle>Catégorie : {{ card.category }}</v-card-subtitle>
          <v-card-text v-if="!card.showAnswer">
            Cliquez pour voir la réponse
          </v-card-text>
          <v-card-text v-if="card.showAnswer">
            Réponse : {{ card.answer }}
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-dialog v-model="showCreateModal" persistent full-width>
      <v-card>
        <v-card-title>Créer une nouvelle carte</v-card-title>
        <v-card-text>
          <v-card-text>
            <v-text-field v-model="newCard.question" label="Question" :error-messages="errorMessages.question" id="newCard_question"></v-text-field>
            <v-text-field v-model="newCard.tag" label="Tag" id="newCard_tag"></v-text-field>
            <v-text-field v-model="newCard.answer" label="Réponse" :error-messages="errorMessages.answer" id="newCard_answer"></v-text-field>
          </v-card-text>
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" @click="createCard" id="create-button">Créer</v-btn>
          <v-btn color="error" @click="closeCreateModal">Annuler</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="showEditModal" persistent full-width>
     <v-card>
        <v-btn-group >
          <v-btn color="warning">Editer la carte</v-btn>
          <v-btn>Duppliquer la carte</v-btn>
          <v-btn>Supprimer la carte</v-btn>
        </v-btn-group>  
        <v-text-field label="Question" disabled>Lorem dolor ipsum</v-text-field>
        <v-text-field label="Tag" disabled>Dolor sit amet</v-text-field>
        <v-text-field label="Réponse" disabled big>Sit lorem ipsum</v-text-field>
        <v-card-actions>
          <v-btn color="error" @click="closeEditModal">Fermer</v-btn>
        </v-card-actions>
     </v-card>

    </v-dialog>
  </v-container>
</template>

<script lang="ts">
import { ref } from 'vue';
import APIService from "@/api/APIService";
import type { Card } from "@/api/models/Card";

export default {
  name: "CardLibraryView",
  setup() {
    const cards = ref<Card[]>([]);
    const filteredCards = ref<Card[]>([]);
    const search = ref("");
    const showCreateModal = ref(false);
    const showEditModal = ref(true);
    const newCard = ref({ question: "", tag: "", answer: "" });
    const errorMessages = ref({ question: '', tag: '', answer: '' });

    const fetchCards = async () => {
      try {
        const response = await APIService.getAllCards();
        cards.value = response.map(card => ({
        ...card,
        showAnswer: false,
        category: card.category,
        }));
        cards.value.reverse();
        filteredCards.value = [...cards.value];
      } catch (error) {
        console.error("Erreur lors de la récupération des cartes:", error);
      }
    };

    const filterCards = async () => {
      try {
        const tags = search.value.split(',');
        const response = await APIService.getAllCards(tags.filter(tag => tag.trim() !== ""));
        cards.value = response.map(card => ({ ...card, showAnswer: false }));
        cards.value.reverse();
        filteredCards.value = [...cards.value];
      } catch (error) {
        console.error("Erreur lors du filtrage des cartes:", error);
      }
    };

    const toggleShowAnswer = (card : Card) => {
      card.showAnswer = !card.showAnswer;
    };

    const toggleContextMenu = (card : Card) => {
      showEditModal.value = !showEditModal.value;
    };

const createCard = async () => {
  errorMessages.value = { question: '', tag: '', answer: '' };

  if (!newCard.value.question) {
    errorMessages.value.question = 'La question est obligatoire';
  }

  if (!newCard.value.answer) {
    errorMessages.value.answer = 'La réponse est obligatoire';
  }

  if (errorMessages.value.question || errorMessages.value.tag || errorMessages.value.answer) {
    return;
  }

  try {
    const response = await APIService.createCard(newCard.value);
    const cardWithId = { ...response, id: generateUUID(), showAnswer: false };
    cards.value.push(cardWithId);
    cards.value.reverse();
    filteredCards.value = [...cards.value];
    newCard.value = { question: "", tag: "", answer: "" };
    closeCreateModal();
  } catch (error) {
    console.error("Erreur lors de la création de la carte:", error);
  }
};
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }



  const closeCreateModal = () => {
    showCreateModal.value = false;
  };

  const closeEditModal = () => {
    showEditModal.value = !showEditModal.value;
  }

    fetchCards();

    return {
      cards,
      filteredCards,
      search,
      showCreateModal,
      showEditModal,
      newCard,
      filterCards,
      toggleShowAnswer,
      toggleContextMenu,
      createCard,
      closeCreateModal,
      closeEditModal,
      errorMessages,
    };
  },
};
</script>
