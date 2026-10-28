<!--
  StackCards — modelled on Vue Bits "Stack" (https://vue-bits.dev, src/content/Components/Stack),
  MIT + Commons Clause, © 2025 David Haz.
  Not a copy: the original is a drag-to-swipe deck built on motion-v. WhyLab only
  needs "cards stacked; finishing one slides it away", so this keeps the stacked
  look and animates the top card out with CSS when `index` advances.
-->
<script setup lang="ts">
defineProps<{
  /** current card position; changing it slides the old card out */
  index: number
  /** how many cards remain behind the current one (0–2 drawn) */
  remaining: number
}>()
</script>

<template>
  <div class="stack" :data-behind="Math.min(remaining, 2)">
    <div class="stack-shadow stack-shadow-2" aria-hidden="true" />
    <div class="stack-shadow stack-shadow-1" aria-hidden="true" />
    <Transition name="stack">
      <div :key="index" class="stack-top">
        <slot />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.stack {
  position: relative;
  padding-bottom: 14px;
}

.stack-shadow {
  position: absolute;
  bottom: 0;
  height: 40px;
  border-radius: var(--radius-lg);
}

.stack-shadow-2 {
  left: 28px;
  right: 28px;
  background: var(--stack-2);
}

.stack-shadow-1 {
  left: 14px;
  right: 14px;
  bottom: 7px;
  background: var(--stack-1);
}

.stack[data-behind='1'] .stack-shadow-2,
.stack[data-behind='0'] .stack-shadow {
  display: none;
}

.stack[data-behind='0'] {
  padding-bottom: 0;
}

.stack-top {
  position: relative;
}

.stack-leave-active {
  /* the next card renders immediately underneath; this one slides off on top */
  position: absolute;
  inset: 0 0 14px;
  z-index: 1;
}

.stack-enter-active,
.stack-leave-active {
  transition:
    opacity var(--dur) var(--ease-out),
    transform var(--dur) var(--ease-out);
}

.stack-leave-to {
  opacity: 0;
  transform: translateX(-48px) rotate(-2deg);
}

.stack-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}
</style>
