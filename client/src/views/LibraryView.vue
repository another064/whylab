<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import {
  fetchNode,
  fetchNodes,
  fetchSpaceCounts,
  type NodeDetail,
  type NodeListItem,
} from '@/api/library'
import { PERFORMANCE_SHORT, type Performance } from '@/api/review'
import AppIcon from '@/components/AppIcon.vue'
import StateBlock from '@/components/StateBlock.vue'
import FadeContent from '@/components/motion/FadeContent.vue'
import { errorMessage } from '@/stores/workspace'

const q = ref('')
const spaceFilter = ref<string | null>(null)
const missingOnly = ref(false)

const counts = ref<{ spaceTitle: string; count: number }[]>([])
const list = ref<NodeListItem[]>([])
const isMock = ref(false)
const listStatus = ref<'loading' | 'ready' | 'failed'>('loading')
const listError = ref('')

const selectedId = ref<string | null>(null)
const detail = ref<NodeDetail | null>(null)
const detailLoading = ref(false)

const hasFilter = computed(() => !!q.value.trim() || !!spaceFilter.value || missingOnly.value)

let searchTimer: ReturnType<typeof setTimeout> | null = null

async function loadList() {
  listStatus.value = 'loading'
  try {
    const result = await fetchNodes({
      q: q.value,
      spaceTitle: spaceFilter.value,
      missingUnderstanding: missingOnly.value,
    })
    list.value = result.items
    isMock.value = result.isMock
    listStatus.value = 'ready'
    if (!list.value.some((n) => n.id === selectedId.value)) select(list.value[0]?.id ?? null)
  } catch (error) {
    listError.value = errorMessage(error, '知识库没加载出来。')
    listStatus.value = 'failed'
  }
}

async function select(id: string | null) {
  selectedId.value = id
  if (!id) {
    detail.value = null
    return
  }
  detailLoading.value = true
  const node = await fetchNode(id)
  if (selectedId.value === id) detail.value = node
  detailLoading.value = false
}

function historyLabel(history: Performance[]): string {
  return `${history.length} 次回忆：${history.map((p) => PERFORMANCE_SHORT[p]).join('、')}`
}

function clearFilters() {
  q.value = ''
  spaceFilter.value = null
  missingOnly.value = false
}

watch([spaceFilter, missingOnly], loadList)
watch(q, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(loadList, 250)
})

onMounted(async () => {
  counts.value = await fetchSpaceCounts()
  await loadList()
})
</script>

<template>
  <div class="library">
    <header class="head">
      <div class="titles">
        <h1>知识库 <span v-if="isMock" class="mock-flag">示例数据</span></h1>
        <p class="secondary">每条知识都从一个问题出发，挂着解释和你自己的理解。</p>
      </div>
      <div class="search">
        <label for="lib-q" class="sr-only">搜索知识</label>
        <AppIcon name="search" :size="18" class="search-icon" />
        <input id="lib-q" v-model="q" class="input" type="search" placeholder="搜索问题、解释或你写过的话" />
      </div>
    </header>

    <div class="filters" role="group" aria-label="筛选">
      <button class="pill" type="button" :aria-pressed="spaceFilter === null" @click="spaceFilter = null">
        全部空间
      </button>
      <button
        v-for="c in counts"
        :key="c.spaceTitle"
        class="pill"
        type="button"
        :aria-pressed="spaceFilter === c.spaceTitle"
        @click="spaceFilter = c.spaceTitle"
      >
        {{ c.spaceTitle }} · <span class="num">{{ c.count }}</span>
      </button>
      <span class="divider" aria-hidden="true" />
      <button class="pill pill-you" type="button" :aria-pressed="missingOnly" @click="missingOnly = !missingOnly">
        只看还没写理解的
      </button>
    </div>

    <StateBlock v-if="listStatus === 'loading' && !list.length" state="loading" :lines="6" />
    <StateBlock v-else-if="listStatus === 'failed'" state="error" :message="listError" @retry="loadList" />
    <StateBlock
      v-else-if="!list.length && hasFilter"
      state="empty"
      title="没有符合条件的知识"
      message="换个关键词，或者清掉筛选看看。"
    >
      <button class="btn btn-outline" type="button" @click="clearFilters">清除筛选</button>
    </StateBlock>
    <StateBlock
      v-else-if="!list.length"
      state="empty"
      title="知识库还是空的"
      message="每次探究后，把解释收进来，或者用一句话写下你的理解。问题、解释和理解会挂在一起。"
    >
      <RouterLink class="btn btn-primary" :to="{ name: 'today', hash: '#ask' }">去问第一个问题</RouterLink>
    </StateBlock>

    <div v-else class="split">
      <ul class="node-list" aria-label="问题列表">
        <li v-for="n in list" :key="n.id">
          <button
            type="button"
            class="node-item"
            :aria-current="n.id === selectedId ? 'true' : undefined"
            @click="select(n.id)"
          >
            <span class="node-q">{{ n.question }}</span>
            <span class="node-tags">
              <span v-if="n.activeRound" class="tag tag-ai">追问中 · 第 {{ n.activeRound.depth }} 层</span>
              <template v-else>
                <span v-if="n.explanationCount" class="tag tag-ai">{{ n.explanationCount }} 条解释</span>
                <span v-if="n.understandingCount" class="tag tag-you">{{ n.understandingCount }} 条我的理解</span>
                <span v-else class="tag tag-you-outline">还没写理解</span>
                <span v-if="n.reviewCount" class="tag tag-neutral">回忆 {{ n.reviewCount }} 次</span>
              </template>
            </span>
          </button>
        </li>
      </ul>

      <StateBlock v-if="detailLoading && !detail" state="loading" class="detail-card" />
      <FadeContent v-else-if="detail" :key="detail.id" as="article" class="detail card" aria-label="知识详情">
        <div class="detail-head">
          <div class="titles">
            <span class="muted small">问题 · {{ detail.spaceTitle }}</span>
            <h2>{{ detail.question }}</h2>
          </div>
          <RouterLink class="btn btn-outline" :to="{ name: 'today', hash: '#ask' }">接着问</RouterLink>
        </div>

        <section class="block block-you">
          <span class="block-title you">我的理解</span>
          <template v-if="detail.understanding">
            <p>{{ detail.understanding.text }}</p>
            <span class="small you-muted">{{ detail.understanding.source }}</span>
          </template>
          <p v-else class="you-muted">还没写。用一句自己的话写下来，它才真正是你的。</p>
        </section>

        <section v-if="detail.explanation" class="block">
          <span class="block-title ai">解释</span>
          <p>{{ detail.explanation }}</p>
          <span v-if="detail.extraExplanations" class="small muted">另有 {{ detail.extraExplanations }} 条换个讲法的解释</span>
        </section>

        <section class="block-row">
          <div class="mini">
            <span class="block-title">依赖</span>
            <span v-for="d in detail.dependsOn" :key="d.title" class="dep">
              {{ d.title }}<span class="muted small">{{ d.mastered ? ' · 你已能讲清' : '' }}</span>
            </span>
          </div>
          <div class="mini">
            <span class="block-title">回忆记录</span>
            <span v-if="!detail.reviewHistory.length" class="muted small">还没回忆过</span>
            <span v-else class="history" :aria-label="historyLabel(detail.reviewHistory)">
              <span v-for="(p, i) in detail.reviewHistory" :key="i" class="history-dot" :data-p="p" />
            </span>
            <span v-if="detail.nextReviewLabel" class="small secondary">下次回忆：{{ detail.nextReviewLabel }}</span>
          </div>
        </section>
      </FadeContent>
    </div>
  </div>
</template>

<style scoped>
.library {
  padding: var(--space-6) var(--space-4) var(--space-14);
  display: flex;
  flex-direction: column;
  gap: 18px;
}

@media (min-width: 768px) {
  .library {
    padding: var(--space-7) clamp(16px, 3vw, 40px) var(--space-14);
  }
}

.head {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  justify-content: space-between;
  align-items: flex-end;
}

.titles {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.titles h1 {
  font-size: var(--fs-h1);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.titles p {
  font-size: var(--fs-sm);
}

.search {
  flex: 0 1 360px;
  position: relative;
}

.search .input {
  padding-left: 40px;
  border-width: 1px;
  border-radius: 12px;
  min-height: 46px;
  font-size: var(--fs-md);
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.pill {
  min-height: 38px;
  padding: 0 14px;
  border-radius: 19px;
  border: 1px solid var(--line-strong);
  background: var(--surface);
  font-size: var(--fs-sm);
}

.pill[aria-pressed='true'] {
  border-color: var(--ink);
  background: var(--ink);
  color: var(--text-on-ink);
}

.pill-you {
  border-color: var(--you-line);
  background: var(--you-soft);
  color: var(--you-text-strong);
}

.divider {
  width: 1px;
  margin: var(--space-1);
  background: var(--line);
}

.split {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-5);
  align-items: flex-start;
}

.node-list {
  flex: 1 1 340px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.node-item {
  width: 100%;
  text-align: left;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color var(--dur-fast) var(--ease-out);
}

.node-item:hover {
  border-color: var(--line-strong);
}

.node-item[aria-current='true'] {
  border: 2px solid var(--ink);
  padding: 15px;
}

.node-q {
  font-size: var(--fs-md);
  font-weight: 700;
  line-height: 1.5;
}

.node-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.node-tags .tag {
  font-weight: 500;
}

.tag-you-outline {
  color: var(--you-text);
  border: 1px dashed var(--you-line-strong);
}

.detail,
.detail-card {
  flex: 1.4 1 420px;
  min-width: 0;
}

.detail {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.detail-head {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  align-items: flex-start;
  flex-wrap: wrap;
}

.detail-head h2 {
  font-size: 20px;
  line-height: 1.4;
}

.small {
  font-size: var(--fs-2xs);
}

.block {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: var(--fs-md);
  line-height: 1.7;
}

.block-you {
  background: var(--you-soft);
  border: 1px solid var(--you-line);
  border-radius: var(--radius-md);
  padding: 14px var(--space-4);
}

.block-title {
  font-size: var(--fs-xs);
  font-weight: 700;
}

.block-title.you {
  color: var(--you-text);
}

.block-title.ai {
  color: var(--ai-text);
}

.you-muted {
  color: var(--you-text-strong);
}

.block-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--line);
}

.mini {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: var(--fs-sm);
}

.history {
  display: flex;
  gap: 6px;
}

.history-dot {
  width: 22px;
  height: 8px;
  border-radius: 4px;
  background: var(--track);
}

.history-dot[data-p='hard'] {
  background: var(--you-line-strong);
}

.history-dot[data-p='good'],
.history-dot[data-p='easy'] {
  background: var(--you);
}
</style>
