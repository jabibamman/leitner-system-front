import { onMounted, onUnmounted, ref } from 'vue'

/**
 * Les composants de layout Vuetify calculent leur décalage à partir de leur
 * prop `height`, pas de leur taille réelle dans le DOM : une simple marge CSS
 * ferait donc passer le contenu sous la barre. On lit les safe-areas iOS en
 * JavaScript pour pouvoir les ajouter à ces hauteurs.
 */
export function useSafeArea() {
  const top = ref(0)
  const bottom = ref(0)

  const read = () => {
    const styles = getComputedStyle(document.documentElement)
    top.value = parseFloat(styles.getPropertyValue('--safe-area-top')) || 0
    bottom.value = parseFloat(styles.getPropertyValue('--safe-area-bottom')) || 0
  }

  onMounted(() => {
    read()
    window.addEventListener('resize', read)
    window.addEventListener('orientationchange', read)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', read)
    window.removeEventListener('orientationchange', read)
  })

  return { top, bottom }
}
