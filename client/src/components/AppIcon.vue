<script setup lang="ts">
/** Stroke icons drawn from the design canvas. Decorative by default (aria-hidden). */
export type IconName =
  | 'today'
  | 'inquire'
  | 'review'
  | 'library'
  | 'mind'
  | 'chevron-down'
  | 'back'
  | 'send'
  | 'bookmark'
  | 'close'
  | 'check'
  | 'gap'
  | 'more'
  | 'plus'
  | 'search'

defineProps<{ name: IconName; size?: number }>()
</script>

<template>
  <svg
    :width="size ?? 20"
    :height="size ?? 20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <template v-if="name === 'today'">
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
    </template>
    <template v-else-if="name === 'inquire' || name === 'search'">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </template>
    <template v-else-if="name === 'review'">
      <path d="M20 12a8 8 0 1 1-2.4-5.7L20 8.5" />
      <path d="M20 3.5v5h-5" />
    </template>
    <template v-else-if="name === 'library'">
      <path d="M5 4h9a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4z" />
      <path d="M9 9h5" />
    </template>
    <template v-else-if="name === 'mind'">
      <path
        d="M12 3a6 6 0 0 0-6 6c0 2.2 1.2 3.7 2.5 4.8V17h7v-3.2C16.8 12.7 18 11.2 18 9a6 6 0 0 0-6-6z"
      />
      <path d="M9.5 21h5" />
    </template>
    <template v-else-if="name === 'chevron-down'">
      <path d="m6 9 6 6 6-6" />
    </template>
    <template v-else-if="name === 'back'">
      <path d="m15 6-6 6 6 6" />
    </template>
    <template v-else-if="name === 'send'">
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </template>
    <template v-else-if="name === 'bookmark'">
      <path d="M6 3h12v18l-6-4-6 4z" />
    </template>
    <template v-else-if="name === 'close'">
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </template>
    <template v-else-if="name === 'check'">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </template>
    <template v-else-if="name === 'gap'">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5" />
      <path d="M12 16.5v.01" />
    </template>
    <template v-else-if="name === 'more'">
      <path d="M5 12h.01M12 12h.01M19 12h.01" stroke-width="3" />
    </template>
    <template v-else-if="name === 'plus'">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </template>
  </svg>
</template>
