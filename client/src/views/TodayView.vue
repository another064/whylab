<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { fetchRecentNodes, type NodeSummary } from '@/api/library'
import { setPatternStatus } from '@/api/profile'
import { PERFORMANCE_SHORT } from '@/api/review'
import { formatToday, greetingFor } from '@/api/today'
import type { ConversationMode } from '@/api/workspace'
import AppIcon from '@/components/AppIcon.vue'
import DepthBar from '@/components/DepthBar.vue'
import ModeSwitch from '@/components/ModeSwitch.vue'
import NodeCard from '@/components/NodeCard.vue'
import PatternCard from '@/components/PatternCard.vue'
import StateBlock from '@/components/StateBlock.vue'
import CountUp from '@/components/motion/CountUp.vue'
import DotGrid from '@/components/motion/DotGrid.vue'
import FadeContent from '@/components/motion/FadeContent.vue'
import { useTodayStore } from '@/stores/today'
import { errorMessage, useWorkspaceStore } from '@/stores/workspace'

const NEW_SPACE = '__new__'
const MAX_QUESTION = 2000

const route = useRoute()
const router = useRouter()
const today = useTodayStore()
const workspace = useWorkspaceStore()

const askInput = ref<HTMLTextAreaElement | null>(null)
const question = ref('')
const mode = ref<ConversationMode>('explain')
const spaceChoice = ref<string>('')
const newSpaceTitle = ref('')
const starting = ref(false)
const startError = ref('')

const recent = ref<NodeSummary[]>([])
const recentStatus = ref<'loading' | 'ready' | 'failed'>('loading')
const patternBusy = ref(false)

const summary = computed(() => today.summary)
const remaining = computed(() =>
  summary.value ? summary.value.reviewDue - summary.value.reviewDone : 0,
)
const needsNewSpace = computed(
  () => spaceChoice.value === NEW_SPACE || (workspace.spacesStatus === 'ready' && !workspace.spaces.length),
)
const canStart = computed(
  () =>
    question.value.trim().length > 0 &&
    !starting.value &&
    (!needsNewSpace.value || newSpaceTitle.value.trim().length > 0),
)

const subline = computed(() => {
  const s = summary.value
  if (!s) return ''
  const parts: string[] = []
  if (remaining.value > 0) parts.push(`有 ${remaining.value} 个想法等你重新讲一遍`)
  if (s.openRound) parts.push(`还有一个追问停在第 ${s.openRound.depth} 层`)
  return parts.length ? `${parts.join('，')}。` : '今天没有待办。想弄明白点什么？'
})

// Preselect: ?space=… → otherwise the most recently active space.
watch(
  () => [workspace.spaces, route.query.space] as const,
  ([spaces, wanted]) => {
    if (spaceChoice.value && spaceChoice.value !== NEW_SPACE) return
    const match = spaces.find((s) => s.id === wanted) ?? spaces[0]
    if (match) spaceChoice.value = match.id
  },
  { immediate: true },
)

async function loadRecent() {
  recentStatus.value = 'loading'
  try {
    recent.value = await fetchRecentNodes()
    recentStatus.value = 'ready'
  } catch {
    recentStatus.value = 'failed'
  }
}

async function start() {
  if (!canStart.value) return
  starting.value = true
  startError.value = ''
  try {
    const spaceId = needsNewSpace.value
      ? (await workspace.createSpace(newSpaceTitle.value.trim())).id
      : spaceChoice.value
    const conv = await workspace.startInquiry({ spaceId, question: question.value.trim(), mode: mode.value })
    await router.push({ name: 'inquiry', params: { id: spaceId, cid: conv.id } })
  } catch (error) {
    startError.value = errorMessage(error, '没能开始这次探究，请稍后重试。')
  } finally {
    starting.value = false
  }
}

function onAskKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    void start()
  }
}

async function answerPattern(status: 'confirmed' | 'rejected') {
  const pattern = summary.value?.noticed
  if (!pattern) return
  patternBusy.value = true
  await setPatternStatus(pattern.id, status)
  await today.load(true)
  patternBusy.value = false
}

onMounted(async () => {
  void loadRecent()
  if (route.hash === '#ask') {
    await nextTick()
    askInput.value?.focus()
  }
})
</script>

<template>
  <div class="today">
    <header class="hello">
      <span class="date">{{ formatToday() }}</span>
      <h1>{{ greetingFor() }}{{ summary ? `，${summary.displayName}` : '' }}。</h1>
      <p v-if="summary" class="secondary">{{ subline }}</p>
    </header>

    <DotGrid as="section" id="ask" class="ask card" aria-labelledby="ask-label">
      <form class="ask-form" @submit.prevent="start">
        <label id="ask-label" for="ask-input" class="ask-label">这次想弄明白什么？</label>
        <textarea
          id="ask-input"
          ref="askInput"
          v-model="question"
          class="textarea"
          rows="2"
          :maxlength="MAX_QUESTION"
          placeholder="例如：为什么闭包能访问外部函数的变量？"
          :disabled="starting"
          @keydown="onAskKeydown"
        />

        <div class="ask-row">
          <ModeSwitch v-model="mode" variant="cards" class="ask-modes" :disabled="starting" />

          <div class="ask-actions">
            <label v-if="workspace.spaces.length" class="space-picker">
              <span class="sr-only">放进哪个学习空间</span>
              <span aria-hidden="true">放进：</span>
              <select v-model="spaceChoice" :disabled="starting">
                <option v-for="s in workspace.spaces" :key="s.id" :value="s.id">{{ s.title }}</option>
                <option :value="NEW_SPACE">+ 新建学习空间</option>
              </select>
              <AppIcon name="chevron-down" :size="16" />
            </label>
            <button class="btn btn-primary btn-lg" type="submit" :disabled="!canStart">
              {{ starting ? '正在开始…' : '开始探究' }}
            </button>
          </div>
        </div>

        <div v-if="needsNewSpace" class="new-space">
          <label for="new-space">
            {{ workspace.spaces.length ? '新空间叫什么？' : '先给它一个学习空间，比如“JavaScript 基础”' }}
          </label>
          <input
            id="new-space"
            v-model="newSpaceTitle"
            class="input"
            maxlength="100"
            placeholder="学习空间名称"
            :disabled="starting"
          />
        </div>

        <p v-if="startError" class="error-text" role="alert">{{ startError }}</p>
        <p v-else-if="workspace.spacesStatus === 'failed'" class="error-text" role="alert">
          {{ workspace.spacesError }}
        </p>
      </form>
    </DotGrid>

    <StateBlock v-if="today.status === 'loading'" state="loading" :lines="4" title="正在加载今日概览" />
    <StateBlock
      v-else-if="today.status === 'failed'"
      state="error"
      :message="today.error"
      @retry="today.load(true)"
    />

    <div v-else-if="summary" class="cards">
      <FadeContent as="section" class="recall card" aria-labelledby="recall-title">
        <div class="recall-head">
          <h2 id="recall-title" class="section-title">今日回忆</h2>
          <span class="recall-count num">
            <CountUp :to="summary.reviewDone" /><span class="of"> / {{ summary.reviewDue }}</span>
          </span>
        </div>
        <template v-if="remaining > 0">
          <p class="recall-lede">先别看答案。用自己的话讲一遍——想不起来的那一刻，记忆正在变牢。</p>
          <ul class="recall-list">
            <li v-for="item in summary.reviewPreview" :key="item.id">
              <span>{{ item.prompt.replace(/^不看任何资料，讲讲：/, '') }}</span>
              <span class="recall-last">
                {{ item.lastPerformance ? `上次 · ${PERFORMANCE_SHORT[item.lastPerformance]}` : '新加入' }}
              </span>
            </li>
          </ul>
          <RouterLink class="btn btn-bright btn-lg" :to="{ name: 'review' }">
            开始回忆 · 约 {{ summary.reviewMinutes }} 分钟
          </RouterLink>
        </template>
        <p v-else class="recall-lede">今天的都讲完了。明天见。</p>
        <span v-if="summary.isMock" class="mock-flag on-ink">示例数据</span>
      </FadeContent>

      <FadeContent v-if="summary.openRound" as="section" class="round card" :delay="0.06" aria-labelledby="round-title">
        <div class="round-head">
          <h2 id="round-title" class="section-title">继续上次的追问</h2>
          <span class="muted small">{{ summary.openRound.updatedLabel }}</span>
        </div>
        <p class="round-goal">目标：{{ summary.openRound.goal }}</p>
        <DepthBar
          :value="summary.openRound.depth"
          :max="summary.openRound.maxDepth"
          :label="`第 ${summary.openRound.depth} 层，共 ${summary.openRound.maxDepth} 层`"
        />
        <div class="round-waiting">
          <span class="waiting-label">WhyLab 在等你回答</span>
          “{{ summary.openRound.waitingQuestion }}”
        </div>
        <RouterLink
          v-if="summary.openRound.conversation"
          class="btn btn-ink-outline"
          :to="{ name: 'inquiry', params: { id: summary.openRound.conversation.spaceId, cid: summary.openRound.conversation.id } }"
        >
          接着回答
        </RouterLink>
        <button v-else class="btn btn-ink-outline" type="button" disabled>接着回答</button>
        <span v-if="summary.isMock" class="mock-flag">示例数据 · 追问轮次接口完成后可用</span>
      </FadeContent>

      <FadeContent v-if="summary.noticed" :delay="0.12">
        <PatternCard
          :pattern="summary.noticed"
          compact
          :busy="patternBusy"
          @confirm="answerPattern('confirmed')"
          @reject="answerPattern('rejected')"
        />
      </FadeContent>
    </div>

    <section class="recent" aria-labelledby="recent-title">
      <div class="recent-head">
        <h2 id="recent-title" class="section-title">最近沉淀的理解</h2>
        <RouterLink :to="{ name: 'library' }">全部知识</RouterLink>
      </div>
      <StateBlock v-if="recentStatus === 'loading'" state="loading" />
      <StateBlock v-else-if="recentStatus === 'failed'" state="error" @retry="loadRecent" />
      <StateBlock
        v-else-if="!recent.length"
        state="empty"
        title="还没有沉淀"
        message="探究结束时，把解释收进知识库，或者用一句话写下你的理解，它们会出现在这里。"
      />
      <ul v-else class="recent-grid">
        <li v-for="node in recent" :key="node.id + node.kind"><NodeCard :node="node" /></li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.today {
  max-width: var(--content-max);
  margin: 0 auto;
  padding: var(--space-6) var(--space-4) var(--space-14);
  display: flex;
  flex-direction: column;
  gap: var(--space-7);
}

@media (min-width: 768px) {
  .today {
    padding: var(--space-10) var(--gutter) var(--space-14);
  }
}

.hello {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.date {
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

.hello h1 {
  font-size: var(--fs-display);
  line-height: 1.25;
  letter-spacing: -0.01em;
}

.hello p {
  font-size: var(--fs-body);
}

/* ---- ask ---- */
.ask {
  scroll-margin-top: var(--space-6);
}

.ask-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.ask-label {
  font-size: var(--fs-h2);
  font-weight: 700;
}

.ask-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: stretch;
}

.ask-modes {
  flex: 1 1 420px;
}

.ask-actions {
  flex: 0 1 auto;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
}

.space-picker {
  position: relative;
  display: flex;
  align-items: center;
  gap: 2px;
  min-height: var(--tap);
  padding: 0 var(--space-3) 0 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  font-size: var(--fs-sm);
  color: var(--text-secondary);
}

.space-picker:focus-within {
  box-shadow: var(--focus-ring);
}

.space-picker select {
  appearance: none;
  border: 0;
  background: transparent;
  padding: 0 20px 0 0;
  margin-right: -20px;
  max-width: 180px;
  font-size: var(--fs-sm);
  color: var(--text-secondary);
  cursor: pointer;
}

.space-picker select:focus {
  outline: none;
}

.new-space {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 420px;
  font-size: var(--fs-sm);
  color: var(--text-secondary);
}

/* ---- cards ---- */
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-5);
  align-items: start;
}

.recall {
  background: var(--ink);
  border-color: var(--ink);
  color: var(--text-on-ink);
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.recall-head,
.round-head,
.recent-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-3);
}

.recall-count {
  font-size: 28px;
  font-weight: 700;
}

.recall-count .of {
  font-size: var(--fs-body);
  color: var(--text-on-ink-muted);
}

.recall-lede {
  font-size: var(--fs-sm);
  line-height: 1.7;
  color: var(--text-on-ink-soft);
}

.recall-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.recall-list li {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) 14px;
  border-radius: 12px;
  background: var(--ink-raised);
  font-size: var(--fs-sm);
}

.recall-last {
  color: var(--text-on-ink-muted);
  white-space: nowrap;
}

.mock-flag.on-ink {
  align-self: flex-start;
  color: var(--text-on-ink-muted);
  border-color: var(--text-on-ink-muted);
}

.round {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.round .mock-flag {
  align-self: flex-start;
}

.small {
  font-size: var(--fs-xs);
}

.round-goal {
  font-size: var(--fs-md);
  font-weight: 500;
}

.round-waiting {
  background: var(--ai-soft);
  border-radius: var(--radius-md);
  padding: 14px var(--space-4);
  font-size: var(--fs-md);
  line-height: 1.7;
}

.waiting-label {
  display: block;
  font-size: var(--fs-2xs);
  font-weight: 700;
  color: var(--ai-text);
  margin-bottom: var(--space-1);
}

/* ---- recent ---- */
.recent {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.recent-head a {
  font-size: var(--fs-sm);
}

.recent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--space-3);
}
</style>
