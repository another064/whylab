<script setup lang="ts">
/**
 * Focus pages (recall): no navigation at all — the page renders its own
 * close button and progress. Only one thing on screen: the card in front of you.
 */
import { onMounted } from 'vue'

import { useTodayStore } from '@/stores/today'

const today = useTodayStore()
onMounted(() => void today.load())
</script>

<template>
  <div class="focus">
    <main id="main" class="focus-main">
      <RouterView v-slot="{ Component }">
        <component :is="Component" class="enter-rise" />
      </RouterView>
    </main>
  </div>
</template>

<style scoped>
.focus {
  min-height: 100dvh;
  background: var(--bg);
}

.focus-main {
  max-width: 880px;
  margin: 0 auto;
  padding: var(--space-3) var(--space-4) var(--space-10);
}

@media (min-width: 768px) {
  .focus-main {
    padding: var(--space-7) var(--gutter) var(--space-14);
  }
}
</style>
