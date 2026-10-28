<script setup lang="ts">
/** A knowledge card: kind tag (问题 / 解释 / 我的理解), text, source + time. */
import { NODE_KIND_LABEL, type NodeSummary } from '@/api/library'

defineProps<{ node: NodeSummary }>()

const TAG_CLASS = { question: 'tag-neutral', explanation: 'tag-ai', understanding: 'tag-you' } as const
</script>

<template>
  <article class="node-card">
    <span class="tag" :class="TAG_CLASS[node.kind]">{{ NODE_KIND_LABEL[node.kind] }}</span>
    <p class="text">{{ node.text }}</p>
    <span class="meta">{{ node.spaceTitle }} · {{ node.when }}</span>
  </article>
</template>

<style scoped>
.node-card {
  height: 100%;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.text {
  font-size: var(--fs-md);
  line-height: 1.6;
}

.meta {
  margin-top: auto;
  font-size: var(--fs-2xs);
  color: var(--text-muted);
}
</style>
