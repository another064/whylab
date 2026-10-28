<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import AppIcon from '@/components/AppIcon.vue'
import BrandMark from '@/components/BrandMark.vue'
import { useWorkspaceStore } from '@/stores/workspace'

import { useNav } from './useNav'

const route = useRoute()
const workspace = useWorkspaceStore()
const { items, openSpace } = useNav()

/** On an inquiry page the lower list shows that space's conversations. */
const spaceConversations = computed(() => {
  if (route.name !== 'inquiry') return null
  const spaceId = String(route.params.id)
  return {
    title: workspace.spaces.find((s) => s.id === spaceId)?.title ?? '当前空间',
    spaceId,
    list: workspace.conversationsBySpace[spaceId] ?? [],
  }
})
</script>

<template>
  <nav class="side-nav" aria-label="主导航">
    <BrandMark class="side-brand" />

    <ul class="nav-items">
      <li v-for="item in items" :key="item.key">
        <RouterLink
          :to="item.to"
          class="nav-link"
          :aria-current="route.meta.nav === item.key ? 'page' : undefined"
        >
          <AppIcon :name="item.icon" />
          {{ item.label }}
          <span v-if="item.badge" class="badge num">
            {{ item.badge }}<span class="sr-only"> 个待回忆</span>
          </span>
          <span v-else-if="item.dot" class="dot"><span class="sr-only">有新发现</span></span>
        </RouterLink>
      </li>
    </ul>

    <div class="nav-lower">
      <template v-if="spaceConversations">
        <span class="lower-label">{{ spaceConversations.title }} · 对话</span>
        <RouterLink
          v-for="conv in spaceConversations.list"
          :key="conv.id"
          class="lower-link"
          :to="{ name: 'inquiry', params: { id: conv.spaceId, cid: conv.id } }"
          :aria-current="conv.id === route.params.cid ? 'page' : undefined"
        >
          {{ conv.title }}
        </RouterLink>
        <RouterLink
          class="lower-link lower-new"
          :to="{ name: 'today', query: { space: spaceConversations.spaceId }, hash: '#ask' }"
        >
          + 新的探究
        </RouterLink>
      </template>

      <template v-else>
        <span class="lower-label">学习空间</span>
        <span v-if="workspace.spacesStatus === 'failed'" class="lower-note">{{ workspace.spacesError }}</span>
        <span v-else-if="workspace.spacesStatus === 'ready' && !workspace.spaces.length" class="lower-note">
          还没有空间。第一次提问时会一起建好。
        </span>
        <button
          v-for="space in workspace.spaces"
          :key="space.id"
          type="button"
          class="lower-link"
          @click="openSpace(space.id)"
        >
          {{ space.title }}
        </button>
      </template>
    </div>
  </nav>
</template>

<style scoped>
.side-nav {
  position: sticky;
  top: 0;
  height: 100dvh;
  overflow-y: auto;
  background: var(--surface);
  border-right: 1px solid var(--line);
  padding: var(--space-6) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-7);
}

.side-brand {
  padding: 0 var(--space-2);
}

.nav-items {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.nav-link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--tap);
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: var(--fs-md);
  text-decoration: none;
  transition: background var(--dur-fast) var(--ease-out);
}

.nav-link:hover {
  background: var(--bg);
  color: var(--text);
}

.nav-link[aria-current='page'] {
  background: var(--surface-sunken);
  color: var(--text);
  font-weight: 700;
}

.badge {
  margin-left: auto;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 11px;
  background: var(--ink);
  color: var(--text-on-ink);
  font-size: var(--fs-2xs);
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dot {
  margin-left: auto;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--you);
}

.nav-lower {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 var(--space-2);
}

.lower-label {
  font-size: var(--fs-2xs);
  color: var(--text-muted);
}

.lower-note {
  font-size: var(--fs-xs);
  color: var(--text-muted);
  line-height: 1.6;
}

.lower-link {
  min-height: 32px;
  display: flex;
  align-items: center;
  padding: 0;
  border: 0;
  background: none;
  text-align: left;
  font-size: var(--fs-sm);
  color: var(--text-secondary);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lower-link:hover {
  color: var(--text);
}

.lower-link[aria-current='page'] {
  color: var(--text);
  font-weight: 700;
}

.lower-new {
  color: var(--ai);
}
</style>
