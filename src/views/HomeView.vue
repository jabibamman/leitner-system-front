<template>
  <v-container class="grey darken-4 pa-6"> 
    <v-row justify="center">
      <v-col cols="12" md="4" class="mb-4"> 
        <v-card class="elevation-12" color="black">
          <v-card-title class="green--text display-1">Progression</v-card-title> 
          <v-card-text class="text-center">
            <v-progress-circular :value="progress" :size="100" color="green" class="my-2">{{ progress }}%</v-progress-circular>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4" class="mb-4"> 
        <v-card class="elevation-12" color="black">
          <v-card-title class="green--text display-1">Cartes à réviser aujourd'hui</v-card-title>
          <v-card-text class="text-center">
            <v-chip color="green" text-color="white">{{ cardsToday }} cartes</v-chip>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4" class="mb-4"> 
        <v-card class="elevation-12" color="black">
          <v-card-title class="green--text display-1">Statistiques de performance</v-card-title>
          <v-card-text>
            <v-list class="green--text">
              <v-list-item>
                <v-list-item-content>Taux de réussite: {{ successRate }}%</v-list-item-content>
              </v-list-item>
              <v-list-item>
                <v-list-item-content>Cartes maîtrisées: {{ masteredCards }}</v-list-item-content>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

    </v-row>
  </v-container>
</template>

<script lang="ts">
import APIService from "@/api/APIService"; 

export default {
  name: "HomeView",
  data() {
    return {
      progress: 0,
      cardsToday: 0, 
      successRate: 0, 
      masteredCards: 0,
    };
  },
  mounted() {
    this.fetchCardsForToday();
  },
  methods: {
    async fetchCardsForToday() {
      try {
        const cards = await APIService.getCardsForQuizz();
        this.cardsToday = cards.length;
      } catch (error) {
        console.error("Erreur lors de la récupération des cartes pour aujourd'hui:", error);
      }
    },

  },
};
</script>