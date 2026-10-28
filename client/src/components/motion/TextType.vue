<!--
  TextType — adapted from Vue Bits (https://vue-bits.dev, src/content/TextAnimations/TextType),
  MIT + Commons Clause, © 2025 David Haz.
  Local changes: no gsap (cursor blink is CSS), single sentence only (no delete/loop),
  shows the full text at once under prefers-reduced-motion, and exposes the full
  text to screen readers instead of announcing each character.
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { usePrefersReducedMotion } from '@/composables/usePrefersReducedMotion'

interface Props {
  text: string
  as?: string
  typingSpeed?: number
  initialDelay?: number
  showCursor?: boolean
  /** keep the cursor blinking after typing ends ("the cursor waits for you") */
  keepCursor?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  as: 'span',
  typingSpeed: 38,
  initialDelay: 120,
  showCursor: true,
  keepCursor: true,
})

const emit = defineEmits<{ done: [] }>()

const reducedMotion = usePrefersReducedMotion()
const displayed = ref('')
let timer: ReturnType<typeof setTimeout> | null = null

const typing = computed(() => displayed.value.length < props.text.length)
const cursorVisible = computed(() => props.showCursor && (typing.value || props.keepCursor))

function clear() {
  if (timer) clearTimeout(timer)
  timer = null
}

function typeNext() {
  if (displayed.value.length >= props.text.length) {
    emit('done')
    return
  }
  // Array.from keeps surrogate pairs intact
  const chars = Array.from(props.text)
  displayed.value = chars.slice(0, Array.from(displayed.value).length + 1).join('')
  timer = setTimeout(typeNext, props.typingSpeed)
}

watch(
  [() => props.text, reducedMotion],
  () => {
    clear()
    if (reducedMotion.value) {
      displayed.value = props.text
      emit('done')
      return
    }
    displayed.value = ''
    timer = setTimeout(typeNext, props.initialDelay)
  },
  { immediate: true },
)

onBeforeUnmount(clear)
</script>

<template>
  <component :is="as" class="text-type">
    <span class="sr-only">{{ text }}</span>
    <span aria-hidden="true">{{ displayed }}</span>
    <span v-if="cursorVisible" class="text-type-cursor" aria-hidden="true" />
  </component>
</template>

<style scoped>
.text-type {
  white-space: pre-wrap;
}

.text-type-cursor {
  display: inline-block;
  width: 2px;
  height: 1.1em;
  margin-left: 2px;
  vertical-align: -0.2em;
  background: var(--ai);
  animation: blink 1s steps(1) infinite;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .text-type-cursor {
    animation: none;
  }
}
</style>
