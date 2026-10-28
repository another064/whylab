<!--
  DotGrid — named after Vue Bits "Dot Grid" (https://vue-bits.dev, src/content/Backgrounds/DotGrid).
  Not a copy: the original is an interactive canvas with gsap inertia. The design asks
  for "low contrast, mostly still, only behind Today's ask box", so this is a static
  CSS dot pattern behind slotted content — nothing moves, nothing to reduce.
-->
<script setup lang="ts">
withDefaults(defineProps<{ as?: string; gap?: number }>(), { as: 'div', gap: 18 })
</script>

<template>
  <component :is="as" class="dot-grid" :style="{ '--dot-gap': `${gap}px` }">
    <slot />
  </component>
</template>

<style scoped>
.dot-grid {
  background-image: radial-gradient(var(--ai-dot) 1px, transparent 1px);
  background-size: var(--dot-gap) var(--dot-gap);
  background-position: right -6px top -6px;
}
</style>
