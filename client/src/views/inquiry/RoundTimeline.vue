<script setup lang="ts">
/** The back-and-forth of a socratic round: questions, your answers, hints, explanations. */
import type { Message } from '@/api/workspace'
import MessageBubble from '@/components/MessageBubble.vue'

defineProps<{ messages: Message[] }>()

const HINT_LABEL: Record<string, string> = { nudge: '方向', hint: '线索' }
</script>

<template>
  <div class="timeline">
    <template v-for="m in messages" :key="m.id">
      <MessageBubble v-if="m.role === 'user'" speaker="you">{{ m.content }}</MessageBubble>

      <p v-else-if="m.kind === 'nudge' || m.kind === 'hint'" class="aside-line">
        {{ HINT_LABEL[m.kind] }}：{{ m.content }}
      </p>

      <MessageBubble v-else-if="m.kind === 'reveal'" speaker="ai">
        <span class="reveal-label">这一步的讲解</span>
        {{ m.content }}
      </MessageBubble>

      <template v-else>
        <p v-if="m.meta?.assessment?.correctPoints.length" class="aside-line you">
          说对了：{{ m.meta.assessment.correctPoints.join(' ') }}
        </p>
        <p v-if="m.meta?.assessment?.gaps.length" class="aside-line">
          还差一点：{{ m.meta.assessment.gaps.join(' ') }}
        </p>
        <MessageBubble speaker="ai" variant="quiet">{{ m.content }}</MessageBubble>
      </template>
    </template>
  </div>
</template>

<style scoped>
.timeline {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.aside-line {
  margin-left: 44px;
  font-size: var(--fs-xs);
  line-height: 1.7;
  color: var(--text-muted);
}

.aside-line.you {
  color: var(--you-text);
}

.reveal-label {
  display: block;
  font-size: var(--fs-2xs);
  font-weight: 700;
  color: var(--ai-text);
}

@media (max-width: 767px) {
  .aside-line {
    margin-left: 0;
  }
}
</style>
