<script setup lang="ts">
/**
 * 解释模式 / 追问模式.
 * `cards` = Today's two descriptive options; `segment` = compact toggle in the
 * inquiry header. Implemented as a radio group so arrow keys work natively.
 */
import { useId } from 'vue'

import type { ConversationMode } from '@/api/workspace'

withDefaults(defineProps<{ variant?: 'cards' | 'segment'; disabled?: boolean }>(), {
  variant: 'segment',
  disabled: false,
})
const mode = defineModel<ConversationMode>({ required: true })
const name = `mode-${useId()}`

const OPTIONS: { value: ConversationMode; label: string; hint: string }[] = [
  { value: 'explain', label: '我来问', hint: 'AI 讲原理，你随时追问' },
  { value: 'socratic', label: '你来问我', hint: 'AI 不给答案，一步步问到你想通' },
]
</script>

<template>
  <fieldset class="mode-switch" :data-variant="variant" :disabled="disabled">
    <legend class="sr-only">探究方式</legend>
    <label v-for="opt in OPTIONS" :key="opt.value" class="mode-option">
      <input v-model="mode" class="sr-only" type="radio" :name="name" :value="opt.value" />
      <span class="mode-label">{{ opt.label }}</span>
      <span v-if="variant === 'cards'" class="mode-hint">{{ opt.hint }}</span>
    </label>
  </fieldset>
</template>

<style scoped>
.mode-switch {
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}

.mode-option {
  cursor: pointer;
  display: flex;
}

.mode-option:has(input:focus-visible) {
  box-shadow: var(--focus-ring);
}

/* ---- cards ---- */
[data-variant='cards'] {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
}

[data-variant='cards'] .mode-option {
  flex-direction: column;
  gap: 2px;
  min-height: var(--tap);
  padding: 10px 14px;
  border: 1.5px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  transition:
    border-color var(--dur-fast) var(--ease-out),
    background var(--dur-fast) var(--ease-out);
}

[data-variant='cards'] .mode-label {
  font-size: var(--fs-md);
  font-weight: 700;
}

[data-variant='cards'] .mode-hint {
  font-size: var(--fs-xs);
  color: var(--text-secondary);
}

[data-variant='cards'] .mode-option:has(input:checked) {
  border-color: var(--ai);
  background: var(--ai-soft);
}

[data-variant='cards'] .mode-option:has(input:checked) .mode-label {
  color: var(--ai-text);
}

/* ---- segment ---- */
[data-variant='segment'] {
  display: inline-flex;
  gap: var(--space-1);
  padding: var(--space-1);
  border-radius: 12px;
  background: var(--segment-bg);
}

[data-variant='segment'] .mode-option {
  align-items: center;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 9px;
  font-size: var(--fs-sm);
  color: var(--text-secondary);
  transition: background var(--dur-fast) var(--ease-out);
}

[data-variant='segment'] .mode-option:has(input:checked) {
  background: var(--surface);
  color: var(--text);
  font-weight: 700;
  box-shadow: var(--shadow-segment);
}

@media (max-width: 480px) {
  [data-variant='cards'] {
    grid-template-columns: 1fr;
  }
}
</style>
