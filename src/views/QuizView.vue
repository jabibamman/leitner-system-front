<template>
    <v-container>
        <v-row justify="center">
            <v-col cols="12" md="8">
                <v-card>
                    <v-card-title class="text-h5">Quiz du jour</v-card-title>
                    <v-card-text v-if="currentCard">
                        <p>Question: {{ currentCard.question }}</p>
                        <v-text-field label="Votre réponse" v-model="userAnswer" outlined dense></v-text-field>
                    </v-card-text>
                    <v-card-actions>
                        <v-spacer></v-spacer>
                        <v-btn color="primary" @click="submitAnswer" :disabled="userAnswer === ''" v-if="!isQuizFinished">Soumettre</v-btn>
                        <v-btn color="primary" text="true" @click="nextQuestion" v-else>A demain !</v-btn>
                    </v-card-actions>
                </v-card>
            </v-col>
        </v-row>
        <v-dialog v-model="showStartDialog" persistent width="300">
            <v-card>
                <v-card-title class="text-h5">Prêt pour le Quiz ?</v-card-title>
                <v-card-text v-if="cards.length">
                    <p>Vous avez {{ cards.length }} cartes à réviser aujourd'hui.</p>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="green" @click="startQuiz">Commencer</v-btn>
                    <v-btn color="red" text @click="cancelQuiz">Annuler</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog v-model="showResultDialog" persistent width="300">
            <v-card>
                <v-card-title class="text-h5">
                    Résultat
                </v-card-title>
                <v-card-text>
                    {{ resultMessage }}
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="primary" text="true" @click="nextQuestion" v-if="!isQuizFinished">OK</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
        <v-row v-if="isQuizFinished">
            <v-col cols="12" md="8">
                <v-card>
                    <v-card-title class="text-h5">Résultats finaux</v-card-title>
                    <v-card-text>
                        <p>Bonnes réponses: {{ correctAnswersCount }}</p>
                        <p>Mauvaises réponses: {{ wrongAnswersCount }}</p>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script lang="ts">
import { ref, onMounted, computed } from 'vue';
import APIService from "@/api/APIService";
import type { Card } from '@/api/models/Card';
import { useRouter } from 'vue-router';

export default {
    name: "QuizPage",
    setup() {
        const cards = ref<Card[]>([]);
        const currentCardIndex = ref(0);
        const currentCard = ref<Card | null>(null);
        const userAnswer = ref('');
        const showResultDialog = ref(false);
        const resultMessage = ref('');
        const correctAnswersCount = ref(0);
        const wrongAnswersCount = ref(0);
        const showStartDialog = ref(true);
        const router = useRouter();

        const fetchCardsForQuizz = async () => {
            try {
                const response = await APIService.getCardsForQuizz();
                cards.value = response;
            } catch (error) {
                console.error("Erreur lors de la récupération des cartes pour le quiz:", error);
            }
        };

        const startQuiz = async () => {
            await fetchCardsForQuizz();
            if (cards.value.length > 0) {
                currentCard.value = cards.value[currentCardIndex.value];
            }
            showStartDialog.value = false;
        };

        const cancelQuiz = () => {
            showStartDialog.value = false;
            router.push('/card');
        };

        const submitAnswer = async () => {
            if (!currentCard.value || userAnswer.value === '') return;

            const isCorrect = userAnswer.value.toLowerCase() === currentCard.value.answer.toLowerCase();
            await APIService.answerCard(currentCard.value.id, { isValid: isCorrect });

            resultMessage.value = isCorrect ? 'Correct !' : 'Incorrect. La bonne réponse était : ' + currentCard.value.answer;
            showResultDialog.value = true;

            if (isCorrect) {
                correctAnswersCount.value++;
            } else {
                wrongAnswersCount.value++;
            }
        };

        onMounted(fetchCardsForQuizz);


        const nextQuestion = () => {
            if (currentCardIndex.value < cards.value.length - 1) {
                currentCardIndex.value++;
                currentCard.value = cards.value[currentCardIndex.value];
                userAnswer.value = '';
            } else {
                currentCard.value = null;
                resultMessage.value = 'Fin du quiz ! Revenez demain pour un nouveau défi !';
            }
            showResultDialog.value = false;
        };

        const isQuizFinished = computed(() => currentCardIndex.value === cards.value.length - 1 && !currentCard.value);

        return {
            cards,
            currentCard,
            userAnswer,
            submitAnswer,
            showResultDialog,
            resultMessage,
            nextQuestion,
            isQuizFinished,
            correctAnswersCount,
            wrongAnswersCount,
            showStartDialog,
            startQuiz,
            cancelQuiz
        };
    },
};
</script>
