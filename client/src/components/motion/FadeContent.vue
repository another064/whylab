<!--
  FadeContent — adapted from Vue Bits (https://vue-bits.dev, src/content/Animations/FadeContent),
  MIT + Commons Clause, © 2025 David Haz.
  Local changes: no gsap/ScrollTrigger — an IntersectionObserver toggles a CSS
  transition whose duration comes from tokens.css, so prefers-reduced-motion
  turns it into an instant swap.
-->
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'

interface Props {
  as?: string
  /** blur(…) while hidden, like the original's `blur` prop */
  blur?: boolean
  /** seconds */
  delay?: number
  /** translateY in px while hidden */
  rise?: number
}

const props = withDefaults(defineProps<Props>(), { as: 'div', blur: false, delay: 0, rise: 8 })

const el = useTemplateRef<HTMLElement>('el')
const visible = ref(false)
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (!el.value) return
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting) {
        visible.value = true
        observer?.disconnect()
      }
    },
    { threshold: 0 },
  )
  observer.observe(el.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <component
    :is="as"
    ref="el"
    class="fade-content"
    :class="{ 'is-visible': visible, 'with-blur': props.blur }"
    :style="{ '--fade-delay': `${props.delay}s`, '--fade-rise': `${props.rise}px` }"
  >
    <slot />
  </component>
</template>

<style scoped>
.fade-content {
  opacity: 0;
  transform: translateY(var(--fade-rise));
  transition:
    opacity var(--dur-slow) var(--ease-out) var(--fade-delay),
    transform var(--dur-slow) var(--ease-out) var(--fade-delay),
    filter var(--dur-slow) var(--ease-out) var(--fade-delay);
}

.fade-content.with-blur {
  filter: blur(6px);
}

.fade-content.is-visible {
  opacity: 1;
  transform: none;
  filter: none;
}

@media (prefers-reduced-motion: reduce) {
  .fade-content {
    opacity: 1;
    transform: none;
    filter: none;
  }
}
</style>
