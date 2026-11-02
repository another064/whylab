<script setup lang="ts">
/**
 * 探究: one page for both modes. The conversation's `mode` picks the body —
 * explain (you ask, AI explains) or socratic (AI asks, you reason it out).
 */
import { computed, watch } from 'vue'

import type { ConversationMode } from '@/api/workspace'
import AppIcon from '@/components/AppIcon.vue'
import ModeSwitch from '@/components/ModeSwitch.vue'
import StateBlock from '@/components/StateBlock.vue'
import { useInquiryStore } from '@/stores/inquiry'
import { useWorkspaceStore } from '@/stores/workspace'

import ExplainThread from './ExplainThread.vue'
import SocraticThread from './SocraticThread.vue'

const props = defineProps<{ id: string; cid: string }>()

const workspace = useWorkspaceStore()
const inquiry = useInquiryStore()

watch(
  () => props.cid,
  (cid) => void workspace.openConversation(cid),
  { immediate: true },
)

const conv = computed(() => (workspace.conversation?.id === props.cid ? workspace.conversation : null))
const spaceTitle = computed(
  () => workspace.spaces.find((s) => s.id === props.id)?.title ?? '学习空间',
)

const mode = computed<ConversationMode>({
  get: () => conv.value?.mode ?? 'explain',
  set: (value) => void workspace.setMode(value),
})

const phoneSubtitle = computed(() =>
  mode.value === 'socratic'
    ? inquiry.activeRound
      ? `你来问我 · 第 ${inquiry.activeRound.depth} / ${inquiry.activeRound.maxDepth} 层`
      : `你来问我 · ${spaceTitle.value}`
    : `我来问 · ${spaceTitle.value}`,
)
</script>

<template>
  <div class="inquiry">
    <!-- phones: back bar instead of the tab bar (design: 追问模式 · 手机) -->
    <header class="phone-bar">
      <RouterLink class="btn btn-icon back" :to="{ name: 'today' }" aria-label="返回今日">
        <AppIcon name="back" :size="22" />
      </RouterLink>
      <div class="phone-titles">
        <span class="phone-sub">{{ phoneSubtitle }}</span>
        <span class="phone-title">{{ conv?.title ?? '…' }}</span>
      </div>
    </header>

    <header class="head">
      <div class="titles">
        <span class="muted space-line">
          {{ spaceTitle }}{{ mode === 'socratic' ? ' · 追问中' : '' }}
        </span>
        <h1>{{ conv?.title ?? '…' }}</h1>
      </div>
      <ModeSwitch v-if="conv" v-model="mode" variant="segment" :disabled="workspace.sending" />
    </header>

    <StateBlock
      v-if="workspace.conversationStatus === 'loading'"
      state="loading"
      :lines="5"
      title="正在加载对话"
    />
    <StateBlock
      v-else-if="workspace.conversationStatus === 'failed'"
      state="error"
      title="这段对话打不开"
      :message="workspace.conversationError"
      @retry="workspace.openConversation(cid)"
    />
    <template v-else-if="conv">
      <SocraticThread v-if="mode === 'socratic'" key="socratic" class="enter-fade" />
      <ExplainThread v-else key="explain" class="enter-fade" />
    </template>
  </div>
</template>

<style scoped>
.inquiry {
  max-width: 860px;
  margin: 0 auto;
  padding: 0 var(--space-4) var(--space-8);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.phone-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  margin: 0 calc(var(--space-4) * -1);
  padding: var(--space-2) var(--space-4) var(--space-2) var(--space-1);
  display: flex;
  align-items: center;
  gap: var(--space-1);
  background: var(--bg);
  border-bottom: 1px solid var(--line);
}

.back {
  color: var(--text);
}

.phone-titles {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.phone-sub {
  font-size: var(--fs-2xs);
  font-weight: 700;
  color: var(--ai-text);
}

.phone-title {
  font-size: var(--fs-sm);
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.head {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  justify-content: space-between;
  align-items: center;
}

.titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.space-line {
  font-size: var(--fs-xs);
}

.head h1 {
  font-size: var(--fs-h1-sm);
}

@media (max-width: 767px) {
  .titles {
    display: none;
  }
}

@media (min-width: 768px) {
  .inquiry {
    padding: var(--space-6) clamp(16px, 3vw, 40px) var(--space-8);
  }

  .phone-bar {
    display: none;
  }
}
</style>
