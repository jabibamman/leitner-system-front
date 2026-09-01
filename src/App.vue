<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useTheme } from 'vuetify'
import {
  mdiCardsOutline,
  mdiHomeOutline,
  mdiSchoolOutline,
  mdiWeatherNight,
  mdiWeatherSunny,
} from '@mdi/js'
import { THEME_STORAGE_KEY } from '@/plugins/vuetify'
import { useSafeArea } from '@/composables/useSafeArea'

const APP_BAR_HEIGHT = 56
const BOTTOM_NAV_HEIGHT = 64

const theme = useTheme()
const route = useRoute()
const safeArea = useSafeArea()

const isDark = computed(() => theme.global.current.value.dark)

function toggleTheme() {
  const next = isDark.value ? 'light' : 'dark'
  theme.change(next)
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next)
  } catch {
    /* Navigation privée Safari : le choix ne sera juste pas retenu. */
  }
}

const title = computed(() => {
  switch (route.name) {
    case 'card-library':
      return 'Mes cartes'
    case 'quiz':
      return 'Révision'
    default:
      return 'Leitner'
  }
})
</script>

<template>
  <v-app>
    <v-app-bar
      flat
      border="b"
      color="surface"
      :height="APP_BAR_HEIGHT + safeArea.top.value"
      class="app-bar--safe"
    >
      <v-app-bar-title class="text-h6 font-weight-bold">{{ title }}</v-app-bar-title>
      <template #append>
        <v-btn
          :icon="isDark ? mdiWeatherSunny : mdiWeatherNight"
          variant="text"
          size="default"
          :aria-label="isDark ? 'Passer en thème clair' : 'Passer en thème sombre'"
          @click="toggleTheme"
        />
      </template>
    </v-app-bar>

    <v-main>
      <div class="app-container">
        <RouterView v-slot="{ Component }">
          <!-- `key` sur le chemin : revenir sur un onglet relance son chargement. -->
          <component :is="Component" :key="route.fullPath" />
        </RouterView>
      </div>
    </v-main>

    <v-bottom-navigation
      grow
      color="primary"
      :height="BOTTOM_NAV_HEIGHT + safeArea.bottom.value"
      :elevation="8"
      class="bottom-nav--safe"
    >
      <v-btn to="/" value="home" rounded="0">
        <v-icon :icon="mdiHomeOutline" />
        <span>Accueil</span>
      </v-btn>
      <v-btn to="/card" value="card" rounded="0">
        <v-icon :icon="mdiCardsOutline" />
        <span>Cartes</span>
      </v-btn>
      <v-btn to="/quiz" value="quiz" rounded="0">
        <v-icon :icon="mdiSchoolOutline" />
        <span>Réviser</span>
      </v-btn>
    </v-bottom-navigation>
  </v-app>
</template>

<style scoped>
/* En mode « ajouté à l'écran d'accueil », l'app occupe tout l'écran : le
   contenu des barres se replie dans la zone sûre, la hauteur totale (prop
   `height`) ayant déjà été augmentée de l'inset correspondant. */
.app-bar--safe :deep(.v-toolbar__content) {
  padding-top: var(--safe-area-top);
}

.bottom-nav--safe :deep(.v-btn) {
  margin-bottom: var(--safe-area-bottom);
}
</style>
