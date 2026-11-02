<script setup lang="ts">
/**
 * Three escalating hints: 方向 → 线索 → 直接告诉我这一步.
 * Any stronger level can be used at any time; used levels are disabled.
 */
import { HINT_LABEL, type HintLevel } from '@/api/inquiry'

const props = withDefaults(
  defineProps<{ used: number; loading?: boolean; compact?: boolean }>(),
  { loading: false, compact: false },
)
const emit = defineEmits<{ request: [level: HintLevel] }>()

const LEVELS: HintLevel[] = [1, 2, 3]
const COMPACT_LABEL: Record<HintLevel, string> = { 1: '方向', 2: '给条线索', 3: '直接告诉我' }

function label(level: HintLevel): string {
  const base = props.compact ? COMPACT_LABEL[level] : HINT_LABEL[level]
  return level <= props.used ? `${base} · 已用` : base
}
</script>

<template>
  <div class="hint-ladder" role="group" aria-label="需要帮助">
    <button
      v-for="level in LEVELS"
      :key="level"
      type="button"
      class="hint"
      :class="{ used: level <= used }"
      :disabled="level <= used || loading"
      @click="emit('request', level)"
    >
      {{ label(level) }}
    </button>
  </div>
</template>

<style scoped>
.hint-ladder {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
}

.hint {
  min-height: 40px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--line-strong);
  background: var(--surface);
  font-size: var(--fs-xs);
  color: var(--text);
}

.hint:hover:not(:disabled) {
  border-color: var(--ink);
}

.hint.used {
  border-style: dashed;
  background: transparent;
  color: var(--text-muted);
}

.hint:disabled:not(.used) {
  color: var(--text-muted);
}
</style>
