import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import 'vuetify/styles'

export const THEME_STORAGE_KEY = 'leitner.theme'

const brand = {
  primary: '#FF5722',
  secondary: '#FF9800',
  accent: '#FFC107',
  error: '#E53935',
  warning: '#FB8C00',
  info: '#03A9F4',
  success: '#43A047',
}

/**
 * Thème initial : celui choisi par l'utilisateur, sinon celui du système.
 * Lu en dehors d'un try/catch nu car Safari en navigation privée peut
 * refuser l'accès à localStorage.
 */
export function getInitialTheme(): 'light' | 'dark' {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    /* localStorage indisponible : on retombe sur la préférence système. */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const vuetify = createVuetify({
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
  theme: {
    defaultTheme: getInitialTheme(),
    themes: {
      light: {
        dark: false,
        colors: {
          ...brand,
          background: '#F6F6F8',
          surface: '#FFFFFF',
        },
      },
      dark: {
        dark: true,
        colors: {
          ...brand,
          background: '#121212',
          surface: '#1E1E1E',
        },
      },
    },
  },
  defaults: {
    VBtn: {
      // Boutons confortables au pouce par défaut.
      size: 'large',
      rounded: 'lg',
    },
    VTextField: {
      variant: 'outlined',
      density: 'comfortable',
      hideDetails: 'auto',
    },
    VCard: {
      rounded: 'xl',
    },
  },
})

export default vuetify
