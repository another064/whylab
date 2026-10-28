<script setup lang="ts">
/**
 * Recall self-rating. Each option shows when the card comes back
 * (from the interval-preview endpoint) so the choice has visible consequences.
 */
import { useId } from 'vue'

import {
  PERFORMANCE_LABEL,
  PERFORMANCE_SHORT,
  formatInterval,
  type IntervalPreview,
  type Performance,
} from '@/api/review'

defineProps<{ intervals: IntervalPreview | null; suggested?: Performance | null }>()
const value = defineModel<Performance | null>({ required: true })
const name = `rating-${useId()}`
const ORDER: Performance[] = ['again', 'hard', 'good', 'easy']
</script>

<template>
  <fieldset class="rating">
    <div class="rating-head">
      <legend class="legend">这次回忆，你觉得怎么样？</legend>
      <span v-if="suggested" class="suggested">WhyLab 的看法：{{ PERFORMANCE_SHORT[suggested] }}</span>
    </div>
    <div class="options">
      <label v-for="key in ORDER" :key="key" class="option">
        <input v-model="value" class="sr-only" type="radio" :name="name" :value="key" />
        <span class="option-label">{{ PERFORMANCE_LABEL[key] }}</span>
        <span class="option-interval">{{ intervals ? formatInterval(intervals[key]) : '…' }}</span>
      </label>
    </div>
  </fieldset>
</template>

<style scoped>
.rating {
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rating-head {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  justify-content: space-between;
  align-items: baseline;
}

.legend {
  float: left; /* lets the legend sit inside the flex row */
  padding: 0;
  font-size: var(--fs-md);
  font-weight: 700;
}

.suggested {
  font-size: var(--fs-xs);
  color: var(--text-muted);
}

.options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: var(--space-2);
}

.option {
  min-height: 60px;
  border-radius: var(--radius-md);
  border: 1px solid var(--line-strong);
  background: var(--surface);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: pointer;
}

.option:has(input:checked) {
  border: 2px solid var(--ink);
  background: var(--bg);
}

.option:has(input:focus-visible) {
  box-shadow: var(--focus-ring);
}

.option-label {
  font-size: var(--fs-md);
  font-weight: 700;
}

.option-interval {
  font-size: var(--fs-2xs);
  color: var(--text-muted);
}
</style>
