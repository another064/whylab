<script setup lang="ts">
/**
 * Right column of 探究. Explain: what this inquiry produced + what it depends on.
 * Socratic: your reasoning path + why you're the one answering.
 */
import { computed } from 'vue'

import ReasoningStepper, { type ReasoningStep } from '@/components/motion/ReasoningStepper.vue'
import { useInquiryStore } from '@/stores/inquiry'
import { useWorkspaceStore } from '@/stores/workspace'

defineProps<{ id: string; cid: string }>()

const workspace = useWorkspaceStore()
const inquiry = useInquiryStore()

const conv = computed(() => workspace.conversation)
const isSocratic = computed(() => conv.value?.mode === 'socratic')

const DEP_LABEL = { mastered: '你已能讲清', learned: '学过 · 待回忆', missing: '先补一下' } as const

function clip(text: string, max = 28): string {
  const firstLine = text.split('\n').find((l) => l.trim()) ?? ''
  return firstLine.length > max ? `${firstLine.slice(0, max)}…` : firstLine
}

const steps = computed<ReasoningStep[]>(() => {
  if (!inquiry.goal) return []
  const done: ReasoningStep[] = inquiry.yourAnswers.map((m) => ({
    key: m.id,
    title: clip(m.content, 18),
    note: '你自己说出来的',
    state: 'done',
  }))
  const hints = inquiry.hints.length
  return [
    ...done,
    {
      key: 'current',
      title: '这一层',
      note: hints ? `正在想 · 用了 ${hints} 次提示` : '正在想',
      state: 'current',
    },
    { key: 'todo', title: '还有几步，等你走到', state: 'todo' },
  ]
})
</script>

<template>
  <div v-if="conv" class="inq-aside">
    <template v-if="isSocratic">
      <section class="card panel">
        <h2 class="panel-title">你的推理路径</h2>
        <ReasoningStepper v-if="steps.length" :steps="steps" />
        <p v-else class="muted small">写下目标后，你推出的每一步都会记在这里。</p>
      </section>
      <section class="card card-you panel why">
        <span class="why-title">为什么是你来回答</span>
        <p>自己推出来的结论，比读到的更容易在一周后想起来。走完后，WhyLab 会把你说过的话整理成一份理解，存进知识库。</p>
      </section>
    </template>

    <template v-else>
      <section class="card panel">
        <h2 class="panel-title">这次沉淀</h2>
        <ul class="harvest">
          <li><span class="tag tag-neutral">问题</span><span>{{ conv.title }}</span></li>
          <li v-if="inquiry.latestAnswer">
            <span class="tag tag-ai">解释</span><span>{{ clip(inquiry.latestAnswer.content) }}</span>
          </li>
          <li :class="{ muted: !inquiry.restatement }">
            <span class="tag tag-you">我的理解</span>
            <span>{{ inquiry.restatement ?? '还没写——写下来才算你的' }}</span>
          </li>
        </ul>
      </section>

      <section class="card panel">
        <div class="panel-head">
          <h2 class="panel-title">这个问题依赖</h2>
          <span class="mock-flag">示例数据</span>
        </div>
        <p v-if="!inquiry.dependencies" class="muted small">正在整理…</p>
        <ul v-else class="deps">
          <li v-for="d in inquiry.dependencies" :key="d.title">
            <span>{{ d.title }}</span>
            <span class="dep-state" :data-state="d.state">{{ DEP_LABEL[d.state] }}</span>
          </li>
        </ul>
      </section>

      <button
        class="btn btn-primary btn-lg"
        type="button"
        :disabled="!inquiry.latestAnswer || inquiry.recallQueued"
        @click="inquiry.recallQueued = true"
      >
        {{ inquiry.recallQueued ? '已加入回忆（示例）' : '把这次探究变成回忆题' }}
      </button>
      <p class="muted small">明天 WhyLab 会请你不看答案讲一遍。</p>
    </template>
  </div>
</template>

<style scoped>
.inq-aside {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.panel {
  padding: 18px;
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
}

.panel-title {
  font-size: var(--fs-h3);
}

.small {
  font-size: var(--fs-2xs);
  line-height: 1.6;
}

.harvest {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.harvest li {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-size: var(--fs-sm);
  line-height: 1.6;
}

.harvest .tag {
  font-size: var(--fs-3xs);
  flex: 0 0 auto;
}

.deps {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  font-size: var(--fs-sm);
}

.deps li {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
}

.dep-state {
  font-size: var(--fs-2xs);
  color: var(--text-secondary);
}

.dep-state[data-state='missing'] {
  color: var(--ai);
}

.why {
  padding: var(--space-4);
  gap: var(--space-2);
}

.why-title {
  font-size: var(--fs-xs);
  font-weight: 700;
  color: var(--you-text);
}

.why p {
  font-size: var(--fs-xs);
  line-height: 1.7;
  color: var(--you-text-deep);
}
</style>
