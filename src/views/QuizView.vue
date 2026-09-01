<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  mdiArrowRight,
  mdiCheck,
  mdiClose,
  mdiEye,
  mdiHome,
  mdiMicrophone,
  mdiPlay,
  mdiRefresh,
  mdiTimerOutline,
} from '@mdi/js'
import APIService, { toUserMessage } from '@/api/APIService'
import type { Card } from '@/api/models/Card'
import { CardType } from '@/api/models/CardType'
import { answersMatch } from '@/utils/cards'
import { readQuizMode, saveLastSession, saveQuizMode, type QuizMode } from '@/utils/session'

/**
 * Déroulé complet :
 *  choice (quel cycle ?) -> [setup, atomique uniquement : mode de révision]
 *  -> question -> revealed / feedback -> (carte suivante) -> finished
 */
type Step = 'choice' | 'setup' | 'question' | 'revealed' | 'feedback' | 'finished'

const ORAL_TIMER_SECONDS = 60

const loading = ref(true)
const error = ref('')
const notice = ref('')
const noticeVisible = ref(false)

// Chargées séparément : mélanger les deux cycles dans une même session fait
// disparaître l'oral au profit du silencieux, donc on ne les fusionne jamais.
const atomicCards = ref<Card[]>([])
const oralCards = ref<Card[]>([])

const sessionType = ref<CardType | null>(null)
const cards = computed<Card[]>(() =>
  sessionType.value === CardType.ORAL ? oralCards.value : atomicCards.value,
)
const isOralSession = computed(() => sessionType.value === CardType.ORAL)
const otherCards = computed(() => (isOralSession.value ? atomicCards.value : oralCards.value))

const index = ref(0)
const step = ref<Step>('choice')
const mode = ref<QuizMode>(readQuizMode())

const userAnswer = ref('')
const lastAnswerWasCorrect = ref(false)
const submitting = ref(false)
const correctCount = ref(0)
const wrongCount = ref(0)

const timeLeft = ref(ORAL_TIMER_SECONDS)
let timerHandle: ReturnType<typeof setInterval> | undefined

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
const hasLoaded = computed(
  () => !error.value || atomicCards.value.length + oralCards.value.length > 0,
)
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
    const [atomic, oral] = await Promise.all([
      APIService.getCardsForQuizz(undefined, CardType.ATOMIC),
      APIService.getCardsForQuizz(undefined, CardType.ORAL),
    ])
    atomicCards.value = atomic
    oralCards.value = oral
  } catch (err) {
    error.value = toUserMessage(err)
  } finally {
    loading.value = false
  }
}

function startCards() {
  index.value = 0
  correctCount.value = 0
  wrongCount.value = 0
  userAnswer.value = ''
  step.value = cards.value.length > 0 ? 'question' : 'finished'
}

function chooseSession(type: CardType) {
  sessionType.value = type
  // L'oral n'a qu'un seul mode (à voix haute) : pas d'écran de réglage,
  // on démarre directement.
  if (type === CardType.ATOMIC) {
    step.value = 'setup'
  } else {
    startCards()
  }
}

function stopTimer() {
  clearInterval(timerHandle)
  timerHandle = undefined
}

function startTimer() {
  stopTimer()
  timeLeft.value = ORAL_TIMER_SECONDS
  timerHandle = setInterval(() => {
    if (timeLeft.value > 0) timeLeft.value--
  }, 1000)
}

// Le chronomètre ne court que pendant la question orale.
watch(step, (currentStep) => {
  if (isOralSession.value && currentStep === 'question') {
    startTimer()
  } else {
    stopTimer()
  }
})

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
    // En auto-évaluation et à l'oral, la réponse est déjà sous les yeux : on enchaîne.
    if (mode.value === 'flip' || isOralSession.value) next()
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

function backToChoice() {
  stopTimer()
  sessionType.value = null
  step.value = 'choice'
}

function continueWithOtherSession() {
  chooseSession(isOralSession.value ? CardType.ATOMIC : CardType.ORAL)
}

onMounted(loadCards)
onBeforeUnmount(stopTimer)
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

    <!-- Choix de session : les deux cycles ne se mélangent jamais. -->
    <template v-else-if="hasLoaded && step === 'choice'">
      <v-card
        variant="tonal"
        class="pa-5 mb-3 session-choice"
        :class="{ 'session-choice--disabled': atomicCards.length === 0 }"
        @click="atomicCards.length > 0 && chooseSession(CardType.ATOMIC)"
      >
        <div class="d-flex align-center justify-space-between mb-1">
          <span class="text-subtitle-1 font-weight-bold">Session atomique</span>
          <v-chip size="small" :color="atomicCards.length > 0 ? 'primary' : undefined" variant="flat">
            {{ atomicCards.length }}
          </v-chip>
        </div>
        <p class="text-body-2 text-medium-emphasis mb-0">Révision silencieuse, à ton rythme.</p>
      </v-card>

      <v-card
        variant="tonal"
        class="pa-5 mb-6 session-choice"
        :class="{ 'session-choice--disabled': oralCards.length === 0 }"
        @click="oralCards.length > 0 && chooseSession(CardType.ORAL)"
      >
        <div class="d-flex align-center justify-space-between mb-1">
          <span class="text-subtitle-1 font-weight-bold">
            <v-icon :icon="mdiMicrophone" size="18" class="mr-1" />
            Session orale
          </span>
          <v-chip size="small" :color="oralCards.length > 0 ? 'primary' : undefined" variant="flat">
            {{ oralCards.length }}
          </v-chip>
        </div>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Debout, à voix haute, 60&nbsp;secondes par carte. Le critère est la
          fluidité, pas l'exactitude — une carte ne monte de boîte que si tu
          l'as sortie sans hésiter ni relire.
        </p>
      </v-card>

      <v-card
        v-if="atomicCards.length === 0 && oralCards.length === 0"
        variant="tonal"
        class="pa-6 text-center"
      >
        <div class="text-subtitle-1 font-weight-medium mb-2">Rien à réviser</div>
        <p class="text-body-2 text-medium-emphasis mb-4">
          Tes deux cycles sont à jour. Reviens plus tard, ou ajoute des cartes.
        </p>
        <v-btn block size="large" color="primary" variant="tonal" to="/card">
          Voir mes cartes
        </v-btn>
      </v-card>
    </template>

    <!-- Réglages de la session atomique (l'oral saute directement à la question). -->
    <v-card v-else-if="hasLoaded && step === 'setup'" variant="tonal" class="pa-6 text-center">
      <div class="text-h5 font-weight-bold mb-2">Session atomique</div>
      <p class="text-body-2 text-medium-emphasis mb-6">
        {{ atomicCards.length }} {{ atomicCards.length > 1 ? "cartes t'attendent" : "carte t'attend" }}.
      </p>
      <div class="text-caption text-medium-emphasis mb-2">Mode de révision</div>
      <v-btn-toggle v-model="modeModel" color="primary" variant="outlined" divided mandatory class="mb-6 w-100">
        <v-btn value="flip" class="flex-grow-1">Auto-évaluation</v-btn>
        <v-btn value="typing" class="flex-grow-1">Saisie</v-btn>
      </v-btn-toggle>
      <v-btn block size="x-large" color="primary" :prepend-icon="mdiPlay" @click="startCards">
        Commencer
      </v-btn>
    </v-card>

    <!-- Révision en cours -->
    <template v-else-if="hasLoaded && (step === 'question' || step === 'revealed' || step === 'feedback')">
      <div class="d-flex align-center justify-space-between mb-2">
        <span class="text-caption text-medium-emphasis">Carte {{ index + 1 }} sur {{ total }}</span>
        <span
          v-if="isOralSession"
          class="text-caption font-weight-bold d-flex align-center"
          :class="timeLeft <= 10 ? 'text-error' : 'text-medium-emphasis'"
        >
          <v-icon :icon="mdiTimerOutline" size="16" class="mr-1" />
          {{ timeLeft }}s
        </span>
        <span v-else class="text-caption text-medium-emphasis">
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
        <div class="text-overline text-medium-emphasis mb-2">
          {{ isOralSession ? 'À dire à voix haute' : 'Question' }}
        </div>
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

        <!-- Auto-évaluation et oral : deux grandes cibles, aucun clavier. -->
        <template v-else-if="step === 'revealed'">
          <div class="text-caption text-center text-medium-emphasis mb-2">
            {{ isOralSession ? 'Sortie sans hésiter, sans relire ?' : 'Tu avais la bonne réponse ?' }}
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
                {{ isOralSession ? 'À retravailler' : 'Non' }}
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
                {{ isOralSession ? 'Fluide' : 'Oui' }}
              </v-btn>
            </v-col>
          </v-row>
        </template>

        <template v-else-if="!isOralSession && mode === 'typing'">
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
          <v-btn block size="x-large" color="primary" :prepend-icon="mdiEye" @click="step = 'revealed'">
            {{ isOralSession ? "J'ai fini de répondre" : 'Voir la réponse' }}
          </v-btn>
        </template>
      </div>
    </template>

    <!-- Récapitulatif -->
    <v-card v-else-if="hasLoaded" variant="tonal" class="pa-6 text-center">
      <div class="text-h5 font-weight-bold mb-1">Session terminée</div>
      <p class="text-body-2 text-medium-emphasis mb-5">
        {{ answeredCount > 0 ? 'Reviens demain pour consolider.' : "Aucune carte à réviser aujourd'hui." }}
      </p>

      <template v-if="answeredCount > 0">
        <v-progress-circular :model-value="successRate" :size="120" :width="10" color="primary" class="mb-5">
          <span class="text-h5 font-weight-bold">{{ successRate }}%</span>
        </v-progress-circular>

        <v-row dense class="mb-5">
          <v-col cols="6">
            <div class="text-h5 font-weight-bold text-success">{{ correctCount }}</div>
            <div class="text-caption text-medium-emphasis">
              {{ isOralSession ? 'fluides' : 'bonnes réponses' }}
            </div>
          </v-col>
          <v-col cols="6">
            <div class="text-h5 font-weight-bold text-error">{{ wrongCount }}</div>
            <div class="text-caption text-medium-emphasis">à revoir</div>
          </v-col>
        </v-row>
      </template>

      <v-btn
        v-if="otherCards.length > 0"
        block
        size="large"
        color="primary"
        variant="tonal"
        class="mb-3"
        @click="continueWithOtherSession"
      >
        Continuer avec la session {{ isOralSession ? 'atomique' : 'orale' }}
      </v-btn>
      <v-btn
        block
        size="large"
        :variant="answeredCount > 0 ? 'text' : 'flat'"
        color="primary"
        :prepend-icon="mdiHome"
        to="/"
      >
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

/* Les boutons restent sous le pouce même si la question est longue.
   La navigation basse est en position fixed, hors du flux du document :
   un simple `bottom: 8px` sur cette zone sticky la ferait passer dessous
   sur une réponse assez longue pour dépasser l'écran (le cas typique
   d'une réponse orale). Il faut donc réserver sa hauteur explicitement. */
.actions {
  position: sticky;
  bottom: calc(64px + 8px + var(--safe-area-bottom));
  padding-block: 8px;
  background: rgb(var(--v-theme-background));
}

.session-choice {
  cursor: pointer;
  transition: opacity 0.2s;
}

.session-choice--disabled {
  cursor: default;
  opacity: 0.5;
}
</style>
