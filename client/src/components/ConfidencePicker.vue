<script setup lang="ts">
/** "讲之前，你有多大把握？" — asked before answering a recall card. */
import { useId } from 'vue'

import { CONFIDENCE_LABEL, type Confidence } from '@/api/review'

const value = defineModel<Confidence | null>({ required: true })
const name = `confidence-${useId()}`
const OPTIONS = Object.entries(CONFIDENCE_LABEL) as [Confidence, string][]
</script>

<template>
  <fieldset class="confidence">
    <legend class="legend">讲之前，你有多大把握？</legend>
    <div class="options">
      <label v-for="[key, text] in OPTIONS" :key="key" class="option">
        <input v-model="value" class="sr-only" type="radio" :name="name" :value="key" />
        <span>{{ text }}</span>
      </label>
    </div>
  </fieldset>
</template>

<style scoped>
.confidence {
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.legend {
  padding: 0;
  margin-bottom: var(--space-2);
  font-size: var(--fs-sm);
  font-weight: 700;
}

.options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
}

.option {
  min-height: var(--tap);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: 1px solid var(--line-strong);
  background: var(--surface);
  font-size: var(--fs-sm);
  cursor: pointer;
}

.option:has(input:checked) {
  border: 2px solid var(--ink);
  font-weight: 700;
}

.option:has(input:focus-visible) {
  box-shadow: var(--focus-ring);
}
</style>
