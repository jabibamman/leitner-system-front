<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  mdiArrowRight,
  mdiCheck,
  mdiClose,
  mdiEye,
  mdiHome,
  mdiPlay,
  mdiRefresh,
} from '@mdi/js'
import APIService, { toUserMessage } from '@/api/APIService'
import type { Card } from '@/api/models/Card'
import { answersMatch } from '@/utils/cards'
import { readQuizMode, saveLastSession, saveQuizMode, type QuizMode } from '@/utils/session'

/**
 * Déroulé d'une carte :
 *  - auto-évaluation : question -> revealed -> (je savais / je ne savais pas) -> carte suivante
 *  - saisie          : question -> (vérifier) -> feedback -> carte suivante
 */
type Step = 'intro' | 'question' | 'revealed' | 'feedback' | 'finished'

const loading = ref(true)
const error = ref('')
const notice = ref('')
const noticeVisible = ref(false)

const cards = ref<Card[]>([])
const index = ref(0)
const step = ref<Step>('intro')
const mode = ref<QuizMode>(readQuizMode())

const userAnswer = ref('')
const lastAnswerWasCorrect = ref(false)
const submitting = ref(false)
const correctCount = ref(0)
const wrongCount = ref(0)

const currentCard = computed<Card | null>(() => cards.value[index.value] ?? null)
const total = computed(() => cards.value.length)
const answeredCount = computed(() => correctCount.value + wrongCount.value)
const progressPercent = computed(() =>
  total.value === 0 ? 0 : (answeredCount.value / total.value) * 100,
)
const successRate = computed(() =>
  answeredCount.value === 0 ? 0 : Math.round((correctCount.value / answeredCount.value) * 100),
)
const isLastCard = computed(() => index.value >= total.value - 1)
/** Sur une erreur de chargement, annoncer « rien à réviser » serait trompeur :
 *  on ne montre alors que l'alerte. */
const hasCards = computed(() => !error.value || cards.value.length > 0)
const showsAnswer = computed(() => step.value === 'revealed' || step.value === 'feedback')

const modeModel = computed({
  get: () => mode.value,
  set: (next: QuizMode) => {
    mode.value = next
    saveQuizMode(next)
  },
})

async function loadCards() {
  loading.value = true
  error.value = ''
  try {
    cards.value = await APIService.getCardsForQuizz()
  } catch (err) {
    error.value = toUserMessage(err)
  } finally {
    loading.value = false
  }
}

function startQuiz() {
  index.value = 0
  correctCount.value = 0
  wrongCount.value = 0
  userAnswer.value = ''
  step.value = cards.value.length > 0 ? 'question' : 'finished'
}

/**
 * Envoie la réponse au back. Un échec réseau ne doit pas interrompre la
 * révision : on prévient et on enchaîne.
 */
async function answer(isCorrect: boolean) {
  const card = currentCard.value
  if (!card || submitting.value) return

  submitting.value = true
  lastAnswerWasCorrect.value = isCorrect
  if (isCorrect) correctCount.value++
  else wrongCount.value++

  try {
    await APIService.answerCard(card.id, { isValid: isCorrect })
  } catch (err) {
    notice.value = `Réponse non enregistrée : ${toUserMessage(err)}`
    noticeVisible.value = true
  } finally {
    submitting.value = false
    // En auto-évaluation la réponse est déjà sous les yeux : on enchaîne.
    if (mode.value === 'flip') next()
    else step.value = 'feedback'
  }
}

function checkTypedAnswer() {
  const card = currentCard.value
  if (!card) return
  answer(answersMatch(userAnswer.value, card.answer))
}

function next() {
  userAnswer.value = ''
  if (index.value < cards.value.length - 1) {
    index.value++
    step.value = 'question'
    return
  }
  saveLastSession({ correct: correctCount.value, total: cards.value.length })
  step.value = 'finished'
}

onMounted(loadCards)
</script>

<template>
  <div class="pa-4">
    <v-alert v-if="error" type="error" variant="tonal" rounded="lg" class="mb-4" :text="error">
      <template #append>
        <v-btn
          :icon="mdiRefresh"
          variant="text"
          size="small"
          aria-label="Réessayer"
          @click="loadCards"
        />
      </template>
    </v-alert>

    <v-skeleton-loader v-if="loading" type="article, actions" />

    <!-- Écran de départ : on annonce la charge de travail avant de lancer. -->
    <v-card v-else-if="hasCards && step === 'intro'" variant="tonal" class="pa-6 text-center">
      <div class="text-h5 font-weight-bold mb-2">
        {{ total > 0 ? 'Prêt pour la révision ?' : 'Rien à réviser' }}
      </div>
      <p class="text-body-2 text-medium-emphasis mb-6">
        <template v-if="total > 0">
          {{ total }} {{ total > 1 ? "cartes t'attendent" : "carte t'attend" }} aujourd'hui.
        </template>
        <template v-else>
          Tes cartes sont à jour. Reviens demain, ou ajoute-en de nouvelles.
        </template>
      </p>

      <template v-if="total > 0">
        <div class="text-caption text-medium-emphasis mb-2">Mode de révision</div>
        <v-btn-toggle
          v-model="modeModel"
          color="primary"
          variant="outlined"
          divided
          mandatory
          class="mb-6 w-100"
        >
          <v-btn value="flip" class="flex-grow-1">Auto-évaluation</v-btn>
          <v-btn value="typing" class="flex-grow-1">Saisie</v-btn>
        </v-btn-toggle>

        <v-btn block size="x-large" color="primary" :prepend-icon="mdiPlay" @click="startQuiz">
          Commencer
        </v-btn>
      </template>
      <v-btn v-else block size="large" color="primary" variant="tonal" to="/card">
        Voir mes cartes
      </v-btn>
    </v-card>

    <!-- Révision en cours -->
    <template v-else-if="hasCards && step !== 'finished'">
      <div class="d-flex align-center justify-space-between mb-2">
        <span class="text-caption text-medium-emphasis">Carte {{ index + 1 }} sur {{ total }}</span>
        <span class="text-caption text-medium-emphasis">
          {{ correctCount }} ✓ · {{ wrongCount }} ✗
        </span>
      </div>
      <v-progress-linear
        :model-value="progressPercent"
        color="primary"
        height="8"
        rounded
        class="mb-4"
        aria-label="Progression de la révision"
      />

      <v-card variant="tonal" class="pa-6 mb-4">
        <div class="text-overline text-medium-emphasis mb-2">Question</div>
        <p class="text-h6 font-weight-medium wrap-text">{{ currentCard?.question }}</p>

        <template v-if="showsAnswer">
          <v-divider class="my-5" />
          <div
            v-if="step === 'feedback'"
            class="d-flex align-center mb-3"
            :class="lastAnswerWasCorrect ? 'text-success' : 'text-error'"
          >
            <v-icon :icon="lastAnswerWasCorrect ? mdiCheck : mdiClose" class="mr-2" />
            <span class="text-subtitle-1 font-weight-bold">
              {{ lastAnswerWasCorrect ? 'Bien joué !' : 'Pas encore acquise' }}
            </span>
          </div>
          <div class="text-overline text-medium-emphasis mb-1">Réponse</div>
          <p class="text-body-1 wrap-text">{{ currentCard?.answer }}</p>
        </template>
      </v-card>

      <!-- Zone d'action collée en bas : atteignable au pouce d'une seule main. -->
      <div class="actions">
        <template v-if="step === 'feedback'">
          <v-btn block size="x-large" color="primary" :append-icon="mdiArrowRight" @click="next">
            {{ isLastCard ? 'Terminer' : 'Carte suivante' }}
          </v-btn>
        </template>

        <!-- Auto-évaluation : deux grandes cibles, aucun clavier. -->
        <template v-else-if="step === 'revealed'">
          <div class="text-caption text-center text-medium-emphasis mb-2">
            Tu avais la bonne réponse ?
          </div>
          <v-row dense>
            <v-col cols="6">
              <v-btn
                block
                size="x-large"
                color="error"
                variant="tonal"
                :prepend-icon="mdiClose"
                :disabled="submitting"
                @click="answer(false)"
              >
                Non
              </v-btn>
            </v-col>
            <v-col cols="6">
              <v-btn
                block
                size="x-large"
                color="success"
                variant="flat"
                :prepend-icon="mdiCheck"
                :disabled="submitting"
                @click="answer(true)"
              >
                Oui
              </v-btn>
            </v-col>
          </v-row>
        </template>

        <template v-else-if="mode === 'typing'">
          <v-text-field
            v-model="userAnswer"
            label="Ta réponse"
            autocomplete="off"
            enterkeyhint="send"
            class="mb-3"
            @keyup.enter="checkTypedAnswer"
          />
          <v-btn
            block
            size="x-large"
            color="primary"
            :loading="submitting"
            :disabled="userAnswer.trim() === ''"
            @click="checkTypedAnswer"
          >
            Vérifier
          </v-btn>
          <v-btn block variant="text" class="mt-2" :disabled="submitting" @click="answer(false)">
            Je ne sais pas
          </v-btn>
        </template>

        <template v-else>
          <v-btn
            block
            size="x-large"
            color="primary"
            :prepend-icon="mdiEye"
            @click="step = 'revealed'"
          >
            Voir la réponse
          </v-btn>
        </template>
      </div>
    </template>

    <!-- Récapitulatif -->
    <v-card v-else-if="hasCards" variant="tonal" class="pa-6 text-center">
      <div class="text-h5 font-weight-bold mb-1">Session terminée</div>
      <p class="text-body-2 text-medium-emphasis mb-5">
        {{ answeredCount > 0 ? 'Reviens demain pour consolider.' : "Aucune carte à réviser aujourd'hui." }}
      </p>

      <template v-if="answeredCount > 0">
        <v-progress-circular
          :model-value="successRate"
          :size="120"
          :width="10"
          color="primary"
          class="mb-5"
        >
          <span class="text-h5 font-weight-bold">{{ successRate }}%</span>
        </v-progress-circular>

        <v-row dense class="mb-5">
          <v-col cols="6">
            <div class="text-h5 font-weight-bold text-success">{{ correctCount }}</div>
            <div class="text-caption text-medium-emphasis">bonnes réponses</div>
          </v-col>
          <v-col cols="6">
            <div class="text-h5 font-weight-bold text-error">{{ wrongCount }}</div>
            <div class="text-caption text-medium-emphasis">à revoir</div>
          </v-col>
        </v-row>
      </template>

      <v-btn block size="large" color="primary" :prepend-icon="mdiHome" to="/">
        Retour à l'accueil
      </v-btn>
    </v-card>

    <v-snackbar v-model="noticeVisible" :timeout="4000" color="warning" location="top">
      {{ notice }}
    </v-snackbar>
  </div>
</template>

<style scoped>
/* Une réponse longue ne doit jamais déborder d'un écran étroit. */
.wrap-text {
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

/* Les boutons restent sous le pouce même si la question est longue. */
.actions {
  position: sticky;
  bottom: 8px;
  padding-block: 8px;
  background: rgb(var(--v-theme-background));
}
</style>
