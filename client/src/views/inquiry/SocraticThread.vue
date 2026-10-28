<script setup lang="ts">
/**
 * 追问模式（AI 问你）: goal → layered questions → you answer, with a 3-step hint ladder.
 * The current AI question is the hero of the page (20px, typed out).
 *
 * Until socratic_rounds lands on the backend, depth is derived from the number of
 * AI questions in this mode, and hints / summary are mocked.
 */
import { computed, ref } from 'vue'

import type { HintLevel } from '@/api/inquiry'
import DepthBar from '@/components/DepthBar.vue'
import HintLadder from '@/components/HintLadder.vue'
import MessageBubble from '@/components/MessageBubble.vue'
import StateBlock from '@/components/StateBlock.vue'
import FadeContent from '@/components/motion/FadeContent.vue'
import TextType from '@/components/motion/TextType.vue'
import { MAX_DEPTH, useInquiryStore } from '@/stores/inquiry'
import { useWorkspaceStore } from '@/stores/workspace'

const workspace = useWorkspaceStore()
const inquiry = useInquiryStore()

const goalDraft = ref('')
const answer = ref('')

const HINT_TAG: Record<HintLevel, string> = { 1: '方向', 2: '线索', 3: '这一步' }

const current = computed(() => inquiry.probes.at(-1) ?? null)

/** Earlier (question, your answer) pairs, oldest first. */
const earlier = computed(() =>
  inquiry.probes.slice(0, -1).map((probe, i) => ({ probe, answer: inquiry.yourAnswers[i] ?? null })),
)
const lastPair = computed(() => earlier.value.at(-1) ?? null)
const olderPairs = computed(() => earlier.value.slice(0, -1))

function typingSpeed(text: string): number {
  return Math.max(10, Math.min(38, Math.round(3000 / Math.max(text.length, 1))))
}

async function startRound() {
  if (await workspace.send(goalDraft.value)) goalDraft.value = ''
}

async function submit() {
  if (await workspace.send(answer.value)) answer.value = ''
}
</script>

<template>
  <div class="socratic">
    <!-- no goal yet: ask for one -->
    <form v-if="!inquiry.goal" class="goal-form card" @submit.prevent="startRound">
      <label for="goal" class="goal-label">这一轮想自己弄懂什么？</label>
      <p class="secondary small">WhyLab 不直接给答案，会一层层问你，直到你自己推出来。</p>
      <textarea
        id="goal"
        v-model="goalDraft"
        class="textarea textarea-you"
        rows="2"
        placeholder="例如：自己推出为什么 Promise.then 总比 setTimeout(0) 先跑"
        :disabled="workspace.sending"
      />
      <button class="btn btn-primary btn-lg" type="submit" :disabled="!goalDraft.trim() || workspace.sending">
        {{ workspace.sending ? '正在准备第一个问题…' : '开始追问' }}
      </button>
    </form>

    <template v-else>
      <div class="goal-bar card">
        <div class="goal-text">
          <span class="muted tiny">你的目标</span>
          <span class="goal">{{ inquiry.goal }}</span>
        </div>
        <div class="goal-depth">
          <DepthBar
            class="goal-bar-track"
            :value="inquiry.depth"
            :max="MAX_DEPTH"
            :label="`第 ${inquiry.depth} 层，共 ${MAX_DEPTH} 层`"
          />
          <span class="secondary small nowrap">第 {{ inquiry.depth }} 层 / 最多 {{ MAX_DEPTH }} 层</span>
        </div>
      </div>

      <details v-if="olderPairs.length" class="older">
        <summary>前几层：你已经回答了 {{ olderPairs.length }} 个问题</summary>
        <div class="older-list">
          <template v-for="pair in olderPairs" :key="pair.probe.id">
            <MessageBubble speaker="ai" variant="quiet" small>{{ pair.probe.content }}</MessageBubble>
            <MessageBubble v-if="pair.answer" speaker="you" small>{{ pair.answer.content }}</MessageBubble>
          </template>
        </div>
      </details>

      <div v-if="lastPair" class="last-pair">
        <MessageBubble speaker="ai" variant="quiet">{{ lastPair.probe.content }}</MessageBubble>
        <MessageBubble v-if="lastPair.answer" speaker="you">{{ lastPair.answer.content }}</MessageBubble>
      </div>

      <section v-if="current" class="current" aria-labelledby="current-label">
        <div class="current-q">
          <span class="current-avatar" aria-hidden="true">W</span>
          <div class="current-text">
            <span id="current-label" class="current-label">第 {{ inquiry.depth }} 层追问</span>
            <span v-if="current.meta?.isMock" class="mock-flag">模拟响应 · 追问逻辑待接入</span>
            <TextType
              :key="current.id"
              as="p"
              class="current-ask"
              :text="current.content"
              :typing-speed="typingSpeed(current.content)"
            />
          </div>
        </div>

        <FadeContent v-for="h in inquiry.hints" :key="h.level" class="hint-box">
          <span class="tag tag-neutral">{{ HINT_TAG[h.level] }}</span>
          <span>{{ h.text }}</span>
        </FadeContent>

        <form class="answer-form" @submit.prevent="submit">
          <label for="myanswer" class="answer-label">你的想法</label>
          <textarea
            id="myanswer"
            v-model="answer"
            class="textarea textarea-you"
            rows="4"
            placeholder="先自己推一推，写下半句也行"
            :disabled="workspace.sending"
          />
          <div class="answer-foot">
            <HintLadder
              :used="inquiry.hints.length"
              :loading="inquiry.hintLoading"
              @request="inquiry.hint"
            />
            <button class="btn btn-primary btn-lg" type="submit" :disabled="!answer.trim() || workspace.sending">
              {{ workspace.sending ? '正在想下一问…' : '我想好了' }}
            </button>
          </div>
        </form>
        <p class="muted tiny">看提示不扣分。WhyLab 只记下你在哪一步需要帮助，下次会在这里多陪你走一步。</p>
      </section>

      <StateBlock v-else-if="workspace.sending" state="loading" title="WhyLab 正在想第一个问题" />

      <p v-if="workspace.sendError" class="error-text" role="alert">{{ workspace.sendError }}</p>

      <div class="wrap-up">
        <button class="btn-link" type="button" disabled title="追问轮次接口完成后可用">
          今天先到这，帮我做个小结
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.socratic {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.small {
  font-size: var(--fs-sm);
}

.tiny {
  font-size: var(--fs-2xs);
}

.nowrap {
  white-space: nowrap;
}

.goal-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.goal-form .btn {
  align-self: flex-start;
}

.goal-label {
  font-size: var(--fs-h2);
  font-weight: 700;
}

.goal-bar {
  padding: 14px var(--space-4);
  border-radius: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3) var(--space-5);
  align-items: center;
  justify-content: space-between;
}

.goal-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.goal {
  font-size: var(--fs-md);
  font-weight: 500;
}

.goal-depth {
  display: flex;
  align-items: center;
  gap: 10px;
}

.goal-bar-track {
  width: 132px;
}

.older summary {
  cursor: pointer;
  min-height: 32px;
  display: flex;
  align-items: center;
  font-size: var(--fs-sm);
  color: var(--text-secondary);
}

.older-list,
.last-pair {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.older-list {
  padding-top: var(--space-2);
}

.current {
  background: var(--surface);
  border: 1.5px solid var(--ai);
  border-radius: var(--radius-lg);
  box-shadow: 0 0 0 6px var(--ai-soft);
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.current-q {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
}

.current-avatar {
  flex: 0 0 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--ai);
  color: var(--text-on-ink);
  font-family: var(--font-num);
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.current-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.current-label {
  font-size: var(--fs-2xs);
  font-weight: 700;
  color: var(--ai-text);
}

.current-ask {
  font-size: var(--fs-ask);
  line-height: 1.6;
  font-weight: 700;
}

.hint-box {
  background: var(--bg);
  border-radius: 12px;
  padding: var(--space-3) 14px;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-size: var(--fs-sm);
  line-height: 1.7;
  color: var(--text-secondary);
}

.hint-box .tag {
  background: var(--surface);
  border: 1px solid var(--line);
}

.answer-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.answer-label {
  font-size: var(--fs-sm);
  font-weight: 700;
  color: var(--you-text-strong);
}

.answer-foot {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  justify-content: space-between;
  align-items: center;
}

.wrap-up {
  display: flex;
  justify-content: center;
}

@media (max-width: 767px) {
  .current {
    padding: var(--space-4);
  }

  .answer-foot .btn-lg {
    width: 100%;
  }
}
</style>
