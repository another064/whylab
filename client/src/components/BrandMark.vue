<script setup lang="ts">
defineProps<{ compact?: boolean }>()
</script>

<template>
  <RouterLink class="brand" :to="{ name: 'today' }" aria-label="WhyLab 首页">
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="var(--ink)" />
      <path
        d="M12 12.5a4 4 0 1 1 5.6 3.7c-1 .5-1.6 1.3-1.6 2.3v.5"
        fill="none"
        stroke="var(--text-on-ink)"
        stroke-width="2.4"
        stroke-linecap="round"
      />
      <circle cx="16" cy="23" r="1.6" fill="var(--ai-bright)" />
    </svg>
    <span v-if="!compact" class="brand-word">WhyLab</span>
  </RouterLink>
</template>

<style scoped>
.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--text);
  text-decoration: none;
}

.brand:hover {
  color: var(--text);
}

.brand-word {
  font-family: var(--font-num);
  font-weight: 700;
  font-size: 20px;
  letter-spacing: -0.02em;
}
</style>
