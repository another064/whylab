<script setup lang="ts">
/**
 * 追问模式（AI 问你）: goal → layered questions → summary, all driven by the server.
 * The current AI question is the hero of the page (20px, typed out).
 */
import { computed, ref } from 'vue'

import type { HintLevel } from '@/api/inquiry'
import DepthBar from '@/components/DepthBar.vue'
import HintLadder from '@/components/HintLadder.vue'
import MessageBubble from '@/components/MessageBubble.vue'
import StateBlock from '@/components/StateBlock.vue'
import TextType from '@/components/motion/TextType.vue'
import { useInquiryStore } from '@/stores/inquiry'
import { useWorkspaceStore } from '@/stores/workspace'

import RoundTimeline from './RoundTimeline.vue'

const VISIBLE_EARLIER = 3
const HINT_TAG: Record<string, string> = { nudge: '方向', hint: '线索' }

const workspace = useWorkspaceStore()
const inquiry = useInquiryStore()

const goalDraft = ref('')
const answer = ref('')

const collapsedEarlier = computed(() => inquiry.earlierMessages.slice(0, -VISIBLE_EARLIER))
const visibleEarlier = computed(() => inquiry.earlierMessages.slice(-VISIBLE_EARLIER))
const summary = computed(() => inquiry.round?.summary ?? null)
/** Finished round: everything except the summary itself, for the "这一轮的过程" fold. */
const finishedProcess = computed(() =>
  inquiry.roundMessages.filter((m) => m.kind !== 'goal' && m.kind !== 'summary'),
)
const summaryIsMock = computed(() => inquiry.roundMessages.at(-1)?.meta?.isMock ?? false)
/** The very first message of a round is on its way (or failed). */
const startingGoal = computed(() => (inquiry.activeRound ? null : workspace.pendingContent))

function typingSpeed(text: string): number {
  return Math.max(10, Math.min(38, Math.round(3000 / Math.max(text.length, 1))))
}

async function startRound() {
  if (await workspace.send(goalDraft.value)) goalDraft.value = ''
}

async function submit() {
  if (await workspace.send(answer.value)) answer.value = ''
}

function requestHelp(level: HintLevel) {
  void workspace.helpRound(level)
}
</script>

<template>
  <div class="socratic">
    <details v-if="inquiry.otherSocraticMessages.length" class="fold">
      <summary>更早的追问记录（{{ inquiry.otherSocraticMessages.length }} 条）</summary>
      <RoundTimeline class="fold-body" :messages="inquiry.otherSocraticMessages" />
    </details>

    <!-- active round -->
    <template v-if="inquiry.activeRound">
      <div class="goal-bar card">
        <div class="goal-text">
          <span class="muted tiny">你的目标</span>
          <span class="goal">{{ inquiry.activeRound.goal }}</span>
        </div>
        <div class="goal-depth">
          <DepthBar
            class="goal-bar-track"
            :value="inquiry.activeRound.depth"
            :max="inquiry.activeRound.maxDepth"
            :label="`第 ${inquiry.activeRound.depth} 层，共 ${inquiry.activeRound.maxDepth} 层`"
          />
          <span class="secondary small nowrap">
            第 {{ inquiry.activeRound.depth }} 层 / 最多 {{ inquiry.activeRound.maxDepth }} 层
          </span>
        </div>
      </div>

      <details v-if="collapsedEarlier.length" class="fold">
        <summary>前面的 {{ collapsedEarlier.length }} 条</summary>
        <RoundTimeline class="fold-body" :messages="collapsedEarlier" />
      </details>
      <RoundTimeline v-if="visibleEarlier.length" :messages="visibleEarlier" />

      <section v-if="inquiry.currentProbe" class="current" aria-labelledby="current-label">
        <p v-if="inquiry.currentProbe.meta?.assessment?.correctPoints.length" class="assess you">
          说对了：{{ inquiry.currentProbe.meta.assessment.correctPoints.join(' ') }}
        </p>
        <p v-if="inquiry.currentProbe.meta?.assessment?.gaps.length" class="assess">
          还差一点：{{ inquiry.currentProbe.meta.assessment.gaps.join(' ') }}
        </p>

        <div class="current-q">
          <span class="current-avatar" aria-hidden="true">W</span>
          <div class="current-text">
            <span id="current-label" class="current-label">第 {{ inquiry.activeRound.depth }} 层追问</span>
            <span v-if="inquiry.currentProbe.meta?.isMock" class="mock-flag">模拟响应</span>
            <TextType
              :key="inquiry.currentProbe.id"
              as="p"
              class="current-ask"
              :text="inquiry.currentProbe.content"
              :typing-speed="typingSpeed(inquiry.currentProbe.content)"
            />
          </div>
        </div>

        <div v-for="h in inquiry.currentHints" :key="h.id" class="hint-box">
          <span class="tag tag-neutral">{{ HINT_TAG[h.kind] }}</span>
          <span>{{ h.content }}</span>
        </div>

        <form class="answer-form" @submit.prevent="submit">
          <label for="myanswer" class="answer-label">你的想法</label>
          <textarea
            id="myanswer"
            v-model="answer"
            class="textarea textarea-you"
            rows="4"
            maxlength="2000"
            placeholder="先自己推一推，写下半句也行"
            :disabled="workspace.sending"
          />
          <div class="answer-foot">
            <HintLadder
              :used="inquiry.activeRound.hintLevel"
              :loading="workspace.sending"
              @request="requestHelp"
            />
            <button class="btn btn-primary btn-lg" type="submit" :disabled="!answer.trim() || workspace.sending">
              {{ workspace.sending ? 'WhyLab 正在想…' : '我想好了' }}
            </button>
          </div>
        </form>
        <p class="muted tiny">看提示不扣分。WhyLab 只记下你在哪一步需要帮助，下次会在这里多陪你走一步。</p>
      </section>

      <p v-if="workspace.sendError" class="error-text" role="alert">{{ workspace.sendError }}</p>

      <div class="wrap-up">
        <button class="btn-link" type="button" :disabled="workspace.sending" @click="workspace.endRound()">
          今天先到这，帮我做个小结
        </button>
      </div>
    </template>

    <!-- first message on its way -->
    <template v-else-if="startingGoal">
      <MessageBubble speaker="you">{{ startingGoal }}</MessageBubble>
      <MessageBubble v-if="workspace.sending" speaker="ai">
        <StateBlock state="loading" :lines="2" title="WhyLab 正在想第一个问题" />
      </MessageBubble>
      <div v-else-if="workspace.sendError" class="send-failed" role="alert">
        <span>{{ workspace.sendError }}你的目标还在。</span>
        <button class="btn btn-outline" type="button" @click="workspace.retry()">重试</button>
      </div>
    </template>

    <!-- no round running: the last summary, then ask for the next goal -->
    <template v-else>
      <section v-if="summary" class="summary card" aria-labelledby="summary-title">
        <h2 id="summary-title" class="summary-title">这一轮的小结</h2>
        <span v-if="summaryIsMock" class="mock-flag">模拟响应</span>
        <p class="muted small">目标：{{ inquiry.round?.goal }}</p>
        <p class="conclusion">{{ summary.conclusion }}</p>
        <div v-if="summary.userInsights.length" class="summary-block">
          <h3 class="block-title you">你自己讲对的</h3>
          <ul class="plain-list">
            <li v-for="item in summary.userInsights" :key="item">{{ item }}</li>
          </ul>
        </div>
        <div v-if="summary.stuckAt.length" class="summary-block">
          <h3 class="block-title">卡住的地方</h3>
          <ul class="plain-list">
            <li v-for="item in summary.stuckAt" :key="item">{{ item }}</li>
          </ul>
        </div>
        <details v-if="finishedProcess.length" class="fold">
          <summary>这一轮的过程</summary>
          <RoundTimeline class="fold-body" :messages="finishedProcess" />
        </details>
      </section>

      <form class="goal-form card" @submit.prevent="startRound">
        <label for="goal" class="goal-label">{{ summary ? '下一轮想弄懂什么？' : '这一轮想自己弄懂什么？' }}</label>
        <p class="secondary small">WhyLab 不直接给答案，会一层层问你，直到你自己推出来。</p>
        <textarea
          id="goal"
          v-model="goalDraft"
          class="textarea textarea-you"
          rows="2"
          maxlength="2000"
          placeholder="例如：自己推出为什么 Promise.then 总比 setTimeout(0) 先跑"
          :disabled="workspace.sending"
        />
        <button class="btn btn-primary btn-lg" type="submit" :disabled="!goalDraft.trim() || workspace.sending">
          开始追问
        </button>
        <p v-if="workspace.sendError" class="error-text" role="alert">{{ workspace.sendError }}</p>
      </form>
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

.fold summary {
  cursor: pointer;
  min-height: 32px;
  display: flex;
  align-items: center;
  font-size: var(--fs-sm);
  color: var(--text-secondary);
}

.fold-body {
  padding-top: var(--space-2);
}

.goal-form,
.summary {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.goal-form .btn,
.summary .mock-flag {
  align-self: flex-start;
}

.goal-label {
  font-size: var(--fs-h2);
  font-weight: 700;
}

.summary-title {
  font-size: var(--fs-h2);
}

.conclusion {
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  font-weight: 500;
}

.summary-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.block-title {
  font-size: var(--fs-sm);
}

.block-title.you {
  color: var(--you-text);
}

.plain-list {
  padding-left: 1.2em;
  list-style: disc;
  font-size: var(--fs-md);
  line-height: 1.7;
  color: var(--text-body);
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

.assess {
  margin-bottom: calc(var(--space-2) * -1);
  font-size: var(--fs-xs);
  line-height: 1.7;
  color: var(--text-muted);
}

.assess.you {
  color: var(--you-text);
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

.send-failed {
  margin-left: 44px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--danger);
  border-radius: var(--radius-md);
  background: var(--danger-soft);
  color: var(--danger);
  font-size: var(--fs-sm);
}

@media (max-width: 767px) {
  .current {
    padding: var(--space-4);
  }

  .answer-foot .btn-lg {
    width: 100%;
  }

  .send-failed {
    margin-left: 0;
  }
}
</style>
