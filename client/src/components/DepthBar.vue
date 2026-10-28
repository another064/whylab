<script setup lang="ts">
/** Segmented progress: socratic depth (mint) or recall position (ink). */
withDefaults(
  defineProps<{
    value: number
    max: number
    tone?: 'ai' | 'ink'
    /** accessible description, e.g. "第 3 层，共 6 层" */
    label?: string
  }>(),
  { tone: 'ai', label: undefined },
)
</script>

<template>
  <div
    class="depth-bar"
    :data-tone="tone"
    role="progressbar"
    :aria-valuemin="0"
    :aria-valuemax="max"
    :aria-valuenow="value"
    :aria-label="label ?? `${value} / ${max}`"
    :style="{ '--segments': max }"
  >
    <span v-for="i in max" :key="i" class="seg" :class="{ filled: i <= value }" />
  </div>
</template>

<style scoped>
.depth-bar {
  display: grid;
  grid-template-columns: repeat(var(--segments), minmax(0, 1fr));
  gap: var(--space-1);
}

.seg {
  height: 6px;
  border-radius: 3px;
  background: var(--line);
  transition: background var(--dur) var(--ease-out);
}

[data-tone='ink'] .seg {
  background: var(--track);
}

[data-tone='ai'] .seg.filled {
  background: var(--ai);
}

[data-tone='ink'] .seg.filled {
  background: var(--ink);
}
</style>
