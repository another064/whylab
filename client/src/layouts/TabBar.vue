<script setup lang="ts">
import { useRoute } from 'vue-router'

import AppIcon from '@/components/AppIcon.vue'

import { useNav } from './useNav'

const route = useRoute()
const { items } = useNav()
</script>

<template>
  <nav class="tab-bar" aria-label="主导航">
    <RouterLink
      v-for="item in items"
      :key="item.key"
      :to="item.to"
      class="tab"
      :aria-current="route.meta.nav === item.key ? 'page' : undefined"
    >
      <AppIcon :name="item.icon" :size="22" />
      {{ item.label }}
      <span v-if="item.badge" class="badge num">
        {{ item.badge }}<span class="sr-only"> 个待回忆</span>
      </span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.tab-bar {
  position: fixed;
  z-index: 20;
  inset: auto 0 0 0;
  background: var(--surface);
  border-top: 1px solid var(--line);
  padding: 6px var(--space-1) max(6px, env(safe-area-inset-bottom));
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.tab {
  position: relative;
  min-height: 52px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  font-size: var(--fs-3xs);
  color: var(--text-muted);
  text-decoration: none;
}

.tab[aria-current='page'] {
  color: var(--text);
  font-weight: 700;
}

.badge {
  position: absolute;
  top: 4px;
  left: calc(50% + 6px);
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: var(--ink);
  color: var(--text-on-ink);
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
