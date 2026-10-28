<script setup lang="ts">
/**
 * 回忆 (focus page, no navigation): one card at a time.
 * confidence → answer in your own words → feedback (what you got, what's missing,
 * matched thinking-profile entries) → rate, seeing when the card comes back.
 */
import { computed, onMounted, ref } from 'vue'

import {
  CONFIDENCE_LABEL,
  PERFORMANCE_SHORT,
  fetchIntervalPreview,
  fetchReviewQueue,
  rateAttempt,
  submitAttempt,
  type AttemptFeedback,
  type Confidence,
  type IntervalPreview,
  type Performance,
  type ReviewItem,
} from '@/api/review'
import AppIcon from '@/components/AppIcon.vue'
import ConfidencePicker from '@/components/ConfidencePicker.vue'
import DepthBar from '@/components/DepthBar.vue'
import RatingButtons from '@/components/RatingButtons.vue'
import StateBlock from '@/components/StateBlock.vue'
import AnimatedList from '@/components/motion/AnimatedList.vue'
import CountUp from '@/components/motion/CountUp.vue'
import FadeContent from '@/components/motion/FadeContent.vue'
import StackCards from '@/components/motion/StackCards.vue'
import { useTodayStore } from '@/stores/today'
import { errorMessage } from '@/stores/workspace'

const today = useTodayStore()

const items = ref<ReviewItem[]>([])
const isMock = ref(false)
const status = ref<'loading' | 'ready' | 'failed'>('loading')
const loadError = ref('')

const index = ref(0)
const phase = ref<'answering' | 'feedback'>('answering')
const confidence = ref<Confidence | null>(null)
const answer = ref('')
const submitting = ref(false)
const submitError = ref('')
const feedback = ref<AttemptFeedback | null>(null)
const intervals = ref<IntervalPreview | null>(null)
const rating = ref<Performance | null>(null)
const showReference = ref(false)
const finished = ref(0)

const item = computed(() => items.value[index.value] ?? null)
const done = computed(() => status.value === 'ready' && index.value >= items.value.length)

async function load() {
  status.value = 'loading'
  try {
    const result = await fetchReviewQueue()
    items.value = result.items
    isMock.value = result.isMock
    status.value = 'ready'
  } catch (error) {
    loadError.value = errorMessage(error, '没能取到今天的回忆题。')
    status.value = 'failed'
  }
}

async function submit(gaveUp = false) {
  if (!item.value) return
  submitting.value = true
  submitError.value = ''
  try {
    const [fb, iv] = await Promise.all([
      submitAttempt(item.value.id, {
        answer: gaveUp ? '' : answer.value.trim(),
        confidence: confidence.value,
      }),
      fetchIntervalPreview(item.value.id),
    ])
    feedback.value = fb
    intervals.value = iv
    rating.value = gaveUp ? 'again' : fb.suggestedPerformance
    phase.value = 'feedback'
  } catch (error) {
    submitError.value = errorMessage(error, '提交失败，你的回答还在，稍后再试。')
  } finally {
    submitting.value = false
  }
}

async function next() {
  if (!item.value || !rating.value) return
  submitting.value = true
  await rateAttempt(item.value.id, rating.value)
  submitting.value = false
  finished.value += 1
  if (today.summary) today.summary.reviewDone = finished.value
  index.value += 1
  phase.value = 'answering'
  confidence.value = null
  answer.value = ''
  feedback.value = null
  intervals.value = null
  rating.value = null
  showReference.value = false
}

/** Bold the emphasised phrase inside a feedback sentence without v-html. */
function split(body: string, emphasis: string): [string, string, string] {
  const at = emphasis ? body.indexOf(emphasis) : -1
  return at < 0 ? [body, '', ''] : [body.slice(0, at), emphasis, body.slice(at + emphasis.length)]
}

onMounted(load)
</script>

<template>
  <div class="review">
    <header class="bar">
      <RouterLink class="btn btn-icon close" :to="{ name: 'today' }" aria-label="结束回忆">
        <AppIcon name="close" :size="22" />
      </RouterLink>
      <div class="titles">
        <h1>今日回忆</h1>
        <span v-if="items.length && !done" class="secondary small">
          第 {{ index + 1 }} 个 · 共 {{ items.length }} 个
        </span>
      </div>
      <DepthBar
        v-if="items.length"
        class="progress"
        tone="ink"
        :value="Math.min(index + (done ? 0 : 1), items.length)"
        :max="items.length"
        :label="`第 ${index + 1} 个，共 ${items.length} 个`"
      />
      <span v-if="isMock" class="mock-flag">示例数据</span>
    </header>

    <StateBlock v-if="status === 'loading'" state="loading" :lines="5" title="正在取今天的回忆题" />
    <StateBlock v-else-if="status === 'failed'" state="error" :message="loadError" @retry="load" />

    <StateBlock
      v-else-if="!items.length"
      state="empty"
      title="今天没有要回忆的"
      message="探究之后把它“变成回忆题”，WhyLab 会在快要忘的时候请你讲一遍。"
    >
      <RouterLink class="btn btn-primary" :to="{ name: 'today' }">回到今日</RouterLink>
    </StateBlock>

    <FadeContent v-else-if="done" class="done card">
      <span class="done-count num"><CountUp :to="finished" /></span>
      <h2>今天的 {{ finished }} 个都讲完了</h2>
      <p class="secondary">回答已保存为证据，不是成绩。下一次的时间已经按你的表现排好了。</p>
      <RouterLink class="btn btn-primary btn-lg" :to="{ name: 'today' }">回到今日</RouterLink>
    </FadeContent>

    <StackCards v-else-if="item" :index="index" :remaining="items.length - index - 1">
      <section class="recall-card card" aria-label="回忆卡">
        <div class="meta">
          <span>
            {{ item.spaceTitle }} ·
            {{ item.attemptCount ? `第 ${item.attemptCount + 1} 次回忆` : '第一次回忆' }}
          </span>
          <span v-if="item.lastPerformance">
            上次：{{ PERFORMANCE_SHORT[item.lastPerformance] }} · {{ item.lastReviewedLabel }}
          </span>
        </div>
        <h2 class="prompt">{{ item.prompt }}</h2>

        <!-- 1. answering -->
        <form v-if="phase === 'answering'" class="answer-form" @submit.prevent="submit()">
          <ConfidencePicker v-model="confidence" />
          <label for="recall-answer" class="answer-label">用你自己的话讲</label>
          <textarea
            id="recall-answer"
            v-model="answer"
            class="textarea textarea-you"
            rows="6"
            placeholder="想到哪写到哪，关键词也行。写不出来，就写下卡在哪里。"
            :disabled="submitting"
          />
          <p v-if="submitError" class="error-text" role="alert">{{ submitError }}</p>
          <div class="answer-actions">
            <button class="btn-link" type="button" :disabled="submitting" @click="submit(true)">实在想不起来</button>
            <button class="btn btn-primary btn-lg" type="submit" :disabled="!answer.trim() || submitting">
              {{ submitting ? '正在对照…' : '讲完了，对照一下' }}
            </button>
          </div>
        </form>

        <!-- 2. feedback -->
        <FadeContent v-else-if="feedback" class="feedback">
          <div class="yours card-you">
            <div class="yours-head">
              <span class="yours-title">你刚才的回答</span>
              <span v-if="confidence" class="yours-conf">作答前把握：{{ CONFIDENCE_LABEL[confidence] }}</span>
            </div>
            <p>{{ answer.trim() || '（这次没想起来）' }}</p>
          </div>

          <div class="points">
            <div v-if="feedback.correctPoints.length" class="point-box">
              <span class="point-title">你讲到了</span>
              <AnimatedList :items="feedback.correctPoints" :item-key="(p) => p" class="point-list">
                <template #default="{ item: p }">
                  <span class="point ok"><AppIcon name="check" :size="18" />{{ p }}</span>
                </template>
              </AnimatedList>
            </div>
            <div v-if="feedback.missingPoints.length" class="point-box">
              <span class="point-title">还差一块</span>
              <AnimatedList :items="feedback.missingPoints" :item-key="(p) => p" class="point-list">
                <template #default="{ item: p }">
                  <span class="point gap"><AppIcon name="gap" :size="18" />{{ p }}</span>
                </template>
              </AnimatedList>
            </div>
          </div>

          <div v-for="mp in feedback.matchedPatterns" :key="mp.patternId" class="matched">
            <span class="matched-title">{{ mp.title }}</span>
            <p>
              <template v-for="(part, i) in split(mp.body, mp.emphasis)" :key="i">
                <b v-if="i === 1">{{ part }}</b><template v-else>{{ part }}</template>
              </template>
            </p>
            <RouterLink :to="{ name: 'today', hash: '#ask' }">用追问模式把这点弄清楚</RouterLink>
          </div>

          <div v-if="showReference" class="reference">
            <span class="point-title">参考解释</span>
            <p>{{ feedback.referenceAnswer }}</p>
          </div>

          <RatingButtons v-model="rating" :intervals="intervals" :suggested="feedback.suggestedPerformance" />

          <div class="answer-actions">
            <button class="btn-link" type="button" @click="showReference = !showReference">
              {{ showReference ? '收起参考解释' : '看完整的参考解释' }}
            </button>
            <button class="btn btn-primary btn-lg" type="button" :disabled="!rating || submitting" @click="next">
              {{ index + 1 < items.length ? '下一个' : '完成' }}
            </button>
          </div>
        </FadeContent>
      </section>
    </StackCards>

    <p v-if="item && !done" class="footnote">回答被保存为证据，不是成绩。只有你自己讲出来的，才会让下次的间隔变长。</p>
  </div>
</template>

<style scoped>
.review {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.close {
  color: var(--text);
  margin-left: calc(var(--space-3) * -1);
}

.titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.titles h1 {
  font-size: var(--fs-h1-sm);
}

.small {
  font-size: var(--fs-sm);
}

.progress {
  flex: 1 1 120px;
  max-width: 180px;
  margin-left: auto;
}

.recall-card {
  border-radius: 22px;
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.meta {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
  font-size: var(--fs-xs);
  color: var(--text-muted);
}

.prompt {
  font-size: var(--fs-card-q);
  line-height: 1.5;
}

.answer-form,
.feedback {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.answer-label {
  font-size: var(--fs-sm);
  font-weight: 700;
  color: var(--you-text-strong);
}

.answer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  justify-content: space-between;
  align-items: center;
}

.yours {
  border: 1px solid var(--you-line);
  border-radius: 16px;
  padding: var(--space-4) 18px;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.yours-head {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.yours-title {
  font-size: var(--fs-xs);
  font-weight: 700;
  color: var(--you-text);
}

.yours-conf {
  font-size: var(--fs-xs);
  color: var(--you-text-strong);
}

.yours p {
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  white-space: pre-wrap;
}

.points {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--space-3);
}

.point-box,
.reference {
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  padding: 14px var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.point-title {
  font-size: var(--fs-xs);
  font-weight: 700;
}

.point-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.point {
  display: flex;
  gap: var(--space-2);
  font-size: var(--fs-sm);
  line-height: 1.6;
}

.point svg {
  flex: 0 0 auto;
  margin-top: 2px;
}

.point.ok svg {
  color: var(--you);
}

.point.gap svg {
  color: var(--ai);
}

.reference p {
  font-size: var(--fs-sm);
  line-height: 1.7;
  color: var(--text-body);
}

.matched {
  background: var(--ai-soft);
  border-radius: var(--radius-md);
  padding: 14px var(--space-4);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.matched-title {
  font-size: var(--fs-xs);
  font-weight: 700;
  color: var(--ai-text);
}

.matched p {
  font-size: var(--fs-sm);
  line-height: 1.7;
}

.matched a {
  font-size: var(--fs-sm);
  font-weight: 700;
}

.done {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-10) var(--space-6);
}

.done-count {
  font-size: 56px;
  font-weight: 700;
  line-height: 1;
}

.footnote {
  text-align: center;
  font-size: var(--fs-xs);
  color: var(--text-muted);
}

@media (max-width: 767px) {
  .recall-card {
    padding: 18px;
  }

  .prompt {
    font-size: var(--fs-ask);
  }

  .answer-actions {
    flex-direction: column-reverse;
    align-items: stretch;
  }
}
</style>
