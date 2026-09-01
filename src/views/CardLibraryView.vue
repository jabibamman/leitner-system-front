<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { mdiCardsOutline, mdiMagnify, mdiPlus, mdiRefresh } from '@mdi/js'
import APIService, { toUserMessage } from '@/api/APIService'
import type { Card, CardWithUiState } from '@/api/models/Card'
import { categoryColor, categoryLabel } from '@/utils/cards'

const cards = ref<CardWithUiState[]>([])
const search = ref('')
const loading = ref(true)
const error = ref('')
const creating = ref(false)
const showCreateModal = ref(false)
const newCard = ref({ question: '', tag: '', answer: '' })
const errorMessages = ref({ question: '', tag: '', answer: '' })

let searchTimer: ReturnType<typeof setTimeout> | undefined

// Une liste vide à cause d'une erreur réseau n'est pas une bibliothèque vide.
const isEmpty = computed(() => !loading.value && !error.value && cards.value.length === 0)

function withUiState(card: Card): CardWithUiState {
  return { ...card, showAnswer: false }
}

/** Les cartes arrivent de la plus ancienne à la plus récente : on inverse pour
 *  montrer les dernières créées en premier. */
async function fetchCards(tags: string[] = []) {
  loading.value = true
  error.value = ''
  try {
    const response = await APIService.getAllCards(tags)
    cards.value = response.map(withUiState).reverse()
  } catch (err) {
    error.value = toUserMessage(err)
  } finally {
    loading.value = false
  }
}

/** La recherche filtre côté serveur : on attend une pause de frappe pour ne
 *  pas lancer un appel à chaque lettre tapée au pouce. */
function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    fetchCards(search.value.split(','))
  }, 350)
}

function toggleShowAnswer(card: CardWithUiState) {
  card.showAnswer = !card.showAnswer
}

function closeCreateModal() {
  showCreateModal.value = false
  errorMessages.value = { question: '', tag: '', answer: '' }
}

async function createCard() {
  errorMessages.value = { question: '', tag: '', answer: '' }

  if (!newCard.value.question.trim()) {
    errorMessages.value.question = 'La question est obligatoire'
  }
  if (!newCard.value.answer.trim()) {
    errorMessages.value.answer = 'La réponse est obligatoire'
  }
  if (errorMessages.value.question || errorMessages.value.answer) {
    return
  }

  creating.value = true
  try {
    // On garde la carte renvoyée par le serveur : c'est elle qui porte
    // l'identifiant et la catégorie de départ.
    const created = await APIService.createCard({
      question: newCard.value.question.trim(),
      answer: newCard.value.answer.trim(),
      tag: newCard.value.tag.trim() || undefined,
    })
    cards.value.unshift(withUiState(created))
    newCard.value = { question: '', tag: '', answer: '' }
    closeCreateModal()
  } catch (err) {
    errorMessages.value.question = toUserMessage(err)
  } finally {
    creating.value = false
  }
}

onMounted(() => fetchCards())
onBeforeUnmount(() => clearTimeout(searchTimer))
</script>

<template>
  <div class="pa-4">
    <v-text-field
      v-model="search"
      :prepend-inner-icon="mdiMagnify"
      label="Filtrer par tag"
      hint="Plusieurs tags séparés par des virgules"
      clearable
      class="mb-4"
      @update:model-value="onSearchInput"
    />

    <v-alert v-if="error" type="error" variant="tonal" rounded="lg" class="mb-4" :text="error">
      <template #append>
        <v-btn
          :icon="mdiRefresh"
          variant="text"
          size="small"
          aria-label="Réessayer"
          @click="fetchCards()"
        />
      </template>
    </v-alert>

    <v-skeleton-loader v-if="loading" type="card, card" />

    <v-card v-else-if="isEmpty" variant="tonal" class="pa-8 text-center">
      <v-icon :icon="mdiCardsOutline" size="40" class="mb-3 text-medium-emphasis" />
      <div class="text-subtitle-1 font-weight-medium mb-1">
        {{ search ? 'Aucune carte pour ce tag' : 'Aucune carte' }}
      </div>
      <div class="text-body-2 text-medium-emphasis">
        {{ search ? 'Essaie un autre tag.' : 'Appuie sur + pour créer ta première carte.' }}
      </div>
    </v-card>

    <!-- Une carte par ligne : plus lisible et plus facile à toucher qu'une grille. -->
    <v-card
      v-for="card in cards"
      :key="card.id"
      :id="'card-' + card.id"
      variant="tonal"
      class="pa-4 mb-3 tap-target"
      :ripple="true"
      role="button"
      :aria-expanded="card.showAnswer"
      @click="toggleShowAnswer(card)"
    >
      <div class="d-flex align-center ga-2 mb-2 flex-wrap">
        <v-chip size="x-small" :color="categoryColor(card.category)" variant="flat">
          {{ categoryLabel(card.category) }}
        </v-chip>
        <v-chip v-if="card.tag" size="x-small" variant="outlined">{{ card.tag }}</v-chip>
      </div>

      <p class="text-subtitle-1 font-weight-medium wrap-text">{{ card.question }}</p>

      <v-expand-transition>
        <div v-if="card.showAnswer">
          <v-divider class="my-3" />
          <p class="text-body-2 wrap-text">{{ card.answer }}</p>
        </div>
      </v-expand-transition>
      <div v-if="!card.showAnswer" class="text-caption text-medium-emphasis mt-1">
        Touche pour voir la réponse
      </div>
    </v-card>

    <!-- Bouton flottant, au-dessus de la navigation basse. -->
    <v-btn
      :icon="mdiPlus"
      color="primary"
      size="large"
      elevation="6"
      class="fab"
      aria-label="Créer une carte"
      @click="showCreateModal = true"
    />

    <!-- Plein écran sur mobile : le clavier ne masque pas les champs. -->
    <v-dialog v-model="showCreateModal" fullscreen transition="dialog-bottom-transition">
      <v-card rounded="0">
        <v-toolbar color="surface" density="comfortable" class="dialog-toolbar">
          <v-toolbar-title class="text-subtitle-1 font-weight-bold">
            Créer une nouvelle carte
          </v-toolbar-title>
          <v-btn variant="text" size="default" @click="closeCreateModal">Annuler</v-btn>
        </v-toolbar>

        <v-card-text class="pt-4">
          <v-text-field
            id="newCard_question"
            v-model="newCard.question"
            label="Question"
            :error-messages="errorMessages.question"
            autocapitalize="sentences"
            class="mb-4"
          />
          <v-text-field
            id="newCard_answer"
            v-model="newCard.answer"
            label="Réponse"
            :error-messages="errorMessages.answer"
            autocapitalize="sentences"
            class="mb-4"
          />
          <v-text-field
            id="newCard_tag"
            v-model="newCard.tag"
            label="Tag (optionnel)"
            autocapitalize="none"
            autocorrect="off"
          />
        </v-card-text>

        <v-card-actions class="px-4 pb-4 dialog-actions">
          <v-btn
            id="create-button"
            block
            size="x-large"
            color="primary"
            variant="flat"
            :loading="creating"
            @click="createCard"
          >
            Créer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.wrap-text {
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.fab {
  position: fixed;
  right: 16px;
  /* Hauteur de la navigation basse + safe-area iPhone. */
  bottom: calc(64px + 16px + var(--safe-area-bottom));
}

.dialog-toolbar {
  padding-top: var(--safe-area-top);
  height: auto;
}

/* Le bouton de validation reste au-dessus de la barre d'accueil iPhone. */
.dialog-actions {
  padding-bottom: calc(16px + var(--safe-area-bottom));
}
</style>
