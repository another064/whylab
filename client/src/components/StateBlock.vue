<script setup lang="ts">
/**
 * Loading / error / empty placeholder.
 * The design has no art for these yet; this is a neutral, token-only version
 * so every page handles all three states the requirements ask for.
 */
withDefaults(
  defineProps<{
    state: 'loading' | 'error' | 'empty'
    title?: string
    message?: string
    /** loading: number of skeleton lines */
    lines?: number
  }>(),
  { title: undefined, message: undefined, lines: 3 },
)
const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <div v-if="state === 'loading'" class="state state-loading" aria-busy="true">
    <span class="sr-only">{{ title ?? '正在加载' }}</span>
    <span
      v-for="i in lines"
      :key="i"
      class="skeleton"
      :style="{ width: `${[92, 76, 84, 60][(i - 1) % 4]}%` }"
      aria-hidden="true"
    />
  </div>

  <div v-else-if="state === 'error'" class="state state-error" role="alert">
    <p class="title">{{ title ?? '没加载出来' }}</p>
    <p v-if="message" class="message">{{ message }}</p>
    <button class="btn btn-outline" type="button" @click="emit('retry')">重试</button>
  </div>

  <div v-else class="state state-empty">
    <p class="title">{{ title }}</p>
    <p v-if="message" class="message">{{ message }}</p>
    <slot />
  </div>
</template>

<style scoped>
.state {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton {
  display: block;
  height: 14px;
  border-radius: 7px;
  background: linear-gradient(90deg, var(--surface-sunken) 0%, var(--line) 50%, var(--surface-sunken) 100%);
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}

@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
  }
}

.state-error,
.state-empty {
  align-items: flex-start;
  padding: var(--space-5);
  border-radius: var(--radius-md);
  border: 1px dashed var(--line-strong);
  background: var(--surface);
}

.state-error {
  border-color: var(--danger);
  background: var(--danger-soft);
}

.title {
  font-size: var(--fs-md);
  font-weight: 700;
}

.state-error .title {
  color: var(--danger);
}

.message {
  font-size: var(--fs-sm);
  line-height: 1.7;
  color: var(--text-secondary);
}
</style>
