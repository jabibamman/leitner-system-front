<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { mdiCheckDecagram, mdiCardsOutline, mdiMicrophone, mdiPlay, mdiRefresh } from '@mdi/js'
import APIService, { toUserMessage } from '@/api/APIService'
import type { Card } from '@/api/models/Card'
import { Category } from '@/api/models/Category'
import { deckProgress, isOralCard } from '@/utils/cards'
import { readLastSession, type QuizSession } from '@/utils/session'

const loading = ref(true)
const error = ref('')
const cards = ref<Card[]>([])
const dueCards = ref<Card[]>([])
const lastSession = ref<QuizSession | null>(null)

/** Sans données chargées, une erreur ne doit pas laisser croire que le
 *  paquet est vide ou à jour : on n'affiche alors que l'alerte. */
const hasData = computed(() => !error.value || cards.value.length > 0)

const progress = computed(() => deckProgress(cards.value))
const masteredCards = computed(
  () => cards.value.filter((card) => card.category === Category.DONE).length,
)

// Les deux cycles sont indépendants (voir QuizView) : l'oral n'apparaît que
// deux fois par semaine, ce qui est normal et pas une carte manquante.
const dueOral = computed(() => dueCards.value.filter(isOralCard))
const dueAtomic = computed(() => dueCards.value.filter((card) => !isOralCard(card)))
const dueToday = computed(() => dueCards.value.length)

const lastSessionScore = computed(() => {
  const session = lastSession.value
  if (!session || session.total === 0) return null
  return {
    ...session,
    rate: Math.round((session.correct / session.total) * 100),
    date: new Date(session.finishedAt).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
    }),
  }
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [allCards, quizCards] = await Promise.all([
      APIService.getAllCards(),
      APIService.getCardsForQuizz(),
    ])
    cards.value = allCards
    dueCards.value = quizCards
  } catch (err) {
    error.value = toUserMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  lastSession.value = readLastSession()
  load()
})
</script>

<template>
  <div class="pa-4">
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      rounded="lg"
      class="mb-4"
      :text="error"
    >
      <template #append>
        <v-btn :icon="mdiRefresh" variant="text" size="small" aria-label="Réessayer" @click="load" />
      </template>
    </v-alert>

    <v-skeleton-loader v-if="loading" type="card, list-item-two-line, list-item-two-line" />

    <template v-else-if="hasData">
      <!-- Action principale : atteignable au pouce, toujours en haut d'écran. -->
      <v-card
        :color="dueToday > 0 ? 'primary' : 'surface'"
        :variant="dueToday > 0 ? 'flat' : 'tonal'"
        class="pa-5 mb-4"
      >
        <div class="text-overline mb-1">Aujourd'hui</div>
        <div class="text-h4 font-weight-bold mb-1">
          {{ dueToday }} {{ dueToday > 1 ? 'cartes' : 'carte' }}
        </div>
        <div class="text-body-2 mb-2" :class="{ 'text-medium-emphasis': dueToday === 0 }">
          {{ dueToday > 0 ? 'à réviser pour rester à jour' : 'Tout est révisé, reviens demain !' }}
        </div>
        <div v-if="dueToday > 0" class="text-caption mb-4 due-breakdown">
          {{ dueAtomic.length }} atomique{{ dueAtomic.length > 1 ? 's' : '' }}
          <template v-if="dueOral.length > 0">
            · <v-icon :icon="mdiMicrophone" size="12" /> {{ dueOral.length }} orale{{ dueOral.length > 1 ? 's' : '' }}
          </template>
        </div>
        <v-btn
          block
          size="x-large"
          :color="dueToday > 0 ? 'surface' : 'primary'"
          :variant="dueToday > 0 ? 'flat' : 'tonal'"
          :prepend-icon="mdiPlay"
          :disabled="dueToday === 0"
          to="/quiz"
        >
          Réviser maintenant
        </v-btn>
      </v-card>

      <v-row dense class="mb-1">
        <v-col cols="6">
          <v-card variant="tonal" class="pa-4 h-100">
            <v-icon :icon="mdiCardsOutline" size="20" class="mb-2 text-medium-emphasis" />
            <div class="text-h5 font-weight-bold">{{ cards.length }}</div>
            <div class="text-caption text-medium-emphasis">
              {{ cards.length > 1 ? 'cartes au total' : 'carte au total' }}
            </div>
          </v-card>
        </v-col>
        <v-col cols="6">
          <v-card variant="tonal" class="pa-4 h-100">
            <v-icon :icon="mdiCheckDecagram" size="20" class="mb-2 text-success" />
            <div class="text-h5 font-weight-bold">{{ masteredCards }}</div>
            <div class="text-caption text-medium-emphasis">
              {{ masteredCards > 1 ? 'cartes acquises' : 'carte acquise' }}
            </div>
          </v-card>
        </v-col>
      </v-row>

      <v-card variant="tonal" class="pa-5 mb-3">
        <div class="d-flex align-center justify-space-between mb-3">
          <span class="text-subtitle-1 font-weight-medium">Progression du paquet</span>
          <span class="text-h6 font-weight-bold">{{ progress }}%</span>
        </div>
        <v-progress-linear
          :model-value="progress"
          color="primary"
          height="12"
          rounded
          aria-label="Progression du paquet"
        />
        <div class="text-caption text-medium-emphasis mt-2">
          Une carte progresse de boîte en boîte à chaque bonne réponse.
        </div>
      </v-card>

      <v-card v-if="lastSessionScore" variant="tonal" class="pa-5">
        <div class="text-subtitle-1 font-weight-medium mb-1">Dernière révision</div>
        <div class="text-body-2 text-medium-emphasis">
          {{ lastSessionScore.correct }}/{{ lastSessionScore.total }} bonnes réponses
          ({{ lastSessionScore.rate }}%) — {{ lastSessionScore.date }}
        </div>
      </v-card>

      <v-card v-else-if="cards.length === 0" variant="tonal" class="pa-5 text-center">
        <div class="text-subtitle-1 font-weight-medium mb-2">Aucune carte pour l'instant</div>
        <div class="text-body-2 text-medium-emphasis mb-4">
          Crée ta première carte pour lancer ta première révision.
        </div>
        <v-btn color="primary" variant="flat" block to="/card">Créer une carte</v-btn>
      </v-card>
    </template>
  </div>
</template>

<style scoped>
.due-breakdown {
  opacity: 0.85;
}
</style>
