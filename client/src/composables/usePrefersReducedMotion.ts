import { onBeforeUnmount, ref, type Ref } from 'vue'

const QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Reactive mirror of the OS "reduce motion" setting.
 * CSS motion is already neutralised in tokens.css; JS-driven motion
 * (typing, counting) must check this and jump straight to the end state.
 */
export function usePrefersReducedMotion(): Ref<boolean> {
  const media = typeof window !== 'undefined' ? window.matchMedia(QUERY) : null
  const reduced = ref(media?.matches ?? false)
  const onChange = (event: MediaQueryListEvent) => {
    reduced.value = event.matches
  }
  media?.addEventListener('change', onChange)
  onBeforeUnmount(() => media?.removeEventListener('change', onChange))
  return reduced
}
