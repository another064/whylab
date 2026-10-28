<!--
  AnimatedList — adapted from Vue Bits (https://vue-bits.dev, src/content/Components/AnimatedList),
  MIT + Commons Clause, © 2025 David Haz.
  Local changes: no motion-v, no keyboard selection or scroll gradients — only the
  staggered "items enter one after another" behaviour, done with <TransitionGroup>
  and token durations (instant under prefers-reduced-motion).
-->
<script setup lang="ts" generic="T">
interface Props {
  items: T[]
  itemKey: (item: T, index: number) => string | number
  as?: string
  /** seconds between items */
  stagger?: number
}

const props = withDefaults(defineProps<Props>(), { as: 'ul', stagger: 0.06 })
</script>

<template>
  <TransitionGroup :tag="as" name="alist" appear>
    <li
      v-for="(item, index) in props.items"
      :key="props.itemKey(item, index)"
      :style="{ '--alist-delay': `${index * props.stagger}s` }"
    >
      <slot :item="item" :index="index" />
    </li>
  </TransitionGroup>
</template>

<style scoped>
.alist-enter-active {
  transition:
    opacity var(--dur) var(--ease-out) var(--alist-delay),
    transform var(--dur) var(--ease-out) var(--alist-delay);
}

.alist-leave-active {
  transition: opacity var(--dur-fast) var(--ease-out);
}

.alist-enter-from {
  opacity: 0;
  transform: scale(0.96) translateY(6px);
}

.alist-leave-to {
  opacity: 0;
}
</style>
