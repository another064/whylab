<script setup lang="ts">
/**
 * Responsive frame for every non-focus page.
 *   < 768      bottom tab bar, single column, the aside falls below the content
 *   768–1199   left nav, the aside falls below the content
 *   ≥ 1200     left nav + content + right aside
 * A route supplies its aside as the named view "aside".
 */
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'

import { useTodayStore } from '@/stores/today'
import { useWorkspaceStore } from '@/stores/workspace'

import SideNav from './SideNav.vue'
import TabBar from './TabBar.vue'

const route = useRoute()
const workspace = useWorkspaceStore()
const today = useTodayStore()

const hasAside = computed(() => !!route.matched.at(-1)?.components?.aside)
/** The inquiry page has its own back bar and composer on phones (design: 追问模式 · 手机). */
const hideTabsOnPhone = computed(() => route.name === 'inquiry')

onMounted(() => {
  void workspace.loadSpaces()
  void today.load()
})
</script>

<template>
  <div class="shell" :class="{ 'has-aside': hasAside, 'hide-tabs': hideTabsOnPhone }">
    <a class="skip-link" href="#main">跳到主要内容</a>
    <SideNav class="shell-nav" />

    <main id="main" class="shell-main" tabindex="-1">
      <RouterView v-slot="{ Component, route: r }">
        <component :is="Component" :key="r.path" class="enter-rise" />
      </RouterView>
    </main>

    <aside v-if="hasAside" class="shell-aside" aria-label="补充信息">
      <RouterView name="aside" />
    </aside>

    <TabBar class="shell-tabs" />
  </div>
</template>

<style scoped>
.shell {
  min-height: 100dvh;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
}

.shell-nav {
  display: none;
}

.shell-main {
  min-width: 0;
  outline: none;
}

.shell-aside {
  min-width: 0;
  padding: 0 var(--space-4) var(--space-8);
}

/* < 768: tab bar */
.shell {
  padding-bottom: calc(72px + env(safe-area-inset-bottom));
}

.shell.hide-tabs {
  padding-bottom: 0;
}

.shell.hide-tabs .shell-tabs {
  display: none;
}

/* 768–1199: left nav, aside under content */
@media (min-width: 768px) {
  .shell,
  .shell.hide-tabs {
    grid-template-columns: var(--nav-w) minmax(0, 1fr);
    padding-bottom: 0;
  }

  .shell-nav {
    display: flex;
    grid-row: 1 / span 2;
  }

  .shell-tabs,
  .shell.hide-tabs .shell-tabs {
    display: none;
  }

  .shell-aside {
    grid-column: 2;
    padding: 0 var(--gutter) var(--space-10);
  }
}

/* ≥ 1200: three columns */
@media (min-width: 1200px) {
  .shell.has-aside {
    grid-template-columns: var(--nav-w) minmax(0, 1fr) var(--aside-w);
  }

  .shell.has-aside .shell-aside {
    grid-column: 3;
    grid-row: 1;
    padding: var(--space-6) var(--space-6) var(--space-6) 0;
  }
}

.skip-link {
  position: absolute;
  z-index: 50;
  left: var(--space-4);
  top: -60px;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--ink);
  color: var(--text-on-ink);
}

.skip-link:focus {
  top: var(--space-4);
}
</style>
