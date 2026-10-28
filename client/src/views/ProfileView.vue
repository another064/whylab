<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import {
  CATEGORY_LABEL,
  clearProfile,
  fetchProfile,
  setPatternStatus,
  setProfileEnabled,
  updatePatternStatement,
  type Profile,
} from '@/api/profile'
import PatternCard from '@/components/PatternCard.vue'
import StateBlock from '@/components/StateBlock.vue'
import AnimatedList from '@/components/motion/AnimatedList.vue'
import { useTodayStore } from '@/stores/today'
import { errorMessage } from '@/stores/workspace'

const today = useTodayStore()

const profile = ref<Profile | null>(null)
const status = ref<'loading' | 'ready' | 'failed'>('loading')
const loadError = ref('')
const busyId = ref<string | null>(null)
const confirmingClear = ref(false)

const pending = computed(() => profile.value?.patterns.filter((p) => p.status === 'proposed') ?? [])
const confirmed = computed(() => profile.value?.patterns.filter((p) => p.status === 'confirmed') ?? [])
const overcome = computed(() => profile.value?.patterns.filter((p) => p.status === 'maybe_overcome') ?? [])

async function load() {
  status.value = 'loading'
  try {
    profile.value = await fetchProfile()
    status.value = 'ready'
  } catch (error) {
    loadError.value = errorMessage(error, '思维档案没加载出来。')
    status.value = 'failed'
  }
}

async function act(id: string, run: () => Promise<void>) {
  busyId.value = id
  await run()
  await load()
  void today.load(true) // the Today card and nav dot follow
  busyId.value = null
}

async function toggleEnabled() {
  if (!profile.value) return
  const next = !profile.value.enabled
  profile.value.enabled = next
  await setProfileEnabled(next)
}

async function clearAll() {
  await clearProfile()
  confirmingClear.value = false
  await load()
  void today.load(true)
}

onMounted(load)
</script>

<template>
  <div class="profile">
    <header class="head">
      <div class="intro">
        <h1>我的思维档案 <span v-if="profile?.isMock" class="mock-flag">示例数据</span></h1>
        <p class="secondary">
          WhyLab 从你的提问和回答里，记下你思考时的习惯。每一条都有依据，都能改、能删。它只用来让讲解更对你的路子，不打分，也不给任何人看。
        </p>
      </div>
      <div v-if="profile" class="switch-box">
        <span id="rec-label">{{ profile.enabled ? '正在记录' : '已暂停' }}</span>
        <button
          class="switch"
          type="button"
          role="switch"
          :aria-checked="profile.enabled"
          aria-labelledby="rec-label"
          @click="toggleEnabled"
        >
          <span class="knob" />
        </button>
      </div>
    </header>

    <StateBlock v-if="status === 'loading'" state="loading" :lines="6" />
    <StateBlock v-else-if="status === 'failed'" state="error" :message="loadError" @retry="load" />

    <template v-else-if="profile">
      <StateBlock
        v-if="!profile.patterns.length"
        state="empty"
        title="档案还是空的"
        message="多问几次、多回忆几次，WhyLab 才有依据。每一条都会先拿来给你确认。"
      />

      <section v-if="pending.length" class="group" aria-labelledby="pending-title">
        <h2 id="pending-title" class="section-title">等你确认 <span class="num you-num">{{ pending.length }}</span></h2>
        <AnimatedList :items="pending" :item-key="(p) => p.id" class="grid">
          <template #default="{ item }">
            <PatternCard
              :pattern="item"
              :busy="busyId === item.id"
              @confirm="act(item.id, () => setPatternStatus(item.id, 'confirmed'))"
              @reject="act(item.id, () => setPatternStatus(item.id, 'rejected'))"
              @edit="(s) => act(item.id, () => updatePatternStatement(item.id, s))"
            />
          </template>
        </AnimatedList>
      </section>

      <section v-if="confirmed.length || profile.mastered.length" class="group" aria-labelledby="known-title">
        <h2 id="known-title" class="section-title">WhyLab 记住的你</h2>
        <ul class="grid">
          <li v-for="p in confirmed" :key="p.id" class="known card">
            <span class="known-cat">{{ CATEGORY_LABEL[p.category] }}</span>
            <p>{{ p.statement }}</p>
            <span class="muted tiny">{{ p.evidenceCount }} 次依据 · {{ p.effect }}</span>
          </li>
          <li v-if="profile.mastered.length" class="known card">
            <span class="known-cat">已经能讲清的</span>
            <div class="mastered">
              <span v-for="m in profile.mastered" :key="m" class="tag tag-ai">{{ m }}</span>
            </div>
            <span class="muted tiny">讲新知识时会直接借用，不再重复</span>
          </li>
        </ul>
      </section>

      <section v-for="p in overcome" :key="p.id" class="overcome card" aria-label="可能已经克服">
        <div>
          <span class="known-cat">可能已经克服</span>
          <p>{{ p.statement }}</p>
        </div>
        <div class="row">
          <button class="btn btn-primary" type="button" :disabled="busyId === p.id" @click="act(p.id, () => setPatternStatus(p.id, 'archived'))">
            收进“已克服”
          </button>
          <button class="btn btn-outline" type="button" :disabled="busyId === p.id" @click="act(p.id, () => setPatternStatus(p.id, 'confirmed'))">
            再观察看看
          </button>
        </div>
      </section>

      <footer class="foot">
        <span class="muted">删除档案不会影响你的知识库和回忆记录。</span>
        <div v-if="confirmingClear" class="row" role="alert">
          <span>确定清空全部档案？不能撤销。</span>
          <button class="btn btn-danger" type="button" @click="clearAll">清空</button>
          <button class="btn btn-outline" type="button" @click="confirmingClear = false">算了</button>
        </div>
        <button v-else class="btn-link danger-link" type="button" @click="confirmingClear = true">清空思维档案</button>
      </footer>
    </template>
  </div>
</template>

<style scoped>
.profile {
  max-width: 1000px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-4) var(--space-14);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

@media (min-width: 768px) {
  .profile {
    padding: var(--space-7) var(--gutter) var(--space-14);
  }
}

.head {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  justify-content: space-between;
  align-items: flex-end;
}

.intro {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 600px;
}

.intro h1 {
  font-size: 28px;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.intro p {
  font-size: var(--fs-md);
  line-height: 1.7;
}

.switch-box {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: var(--space-2) var(--space-3);
  font-size: var(--fs-sm);
}

.switch {
  position: relative;
  width: 44px;
  height: 26px;
  padding: 0;
  border: 0;
  border-radius: 13px;
  background: var(--track);
  transition: background var(--dur-fast) var(--ease-out);
}

.switch[aria-checked='true'] {
  background: var(--ink);
}

.knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--surface);
  transition: transform var(--dur-fast) var(--ease-out);
}

.switch[aria-checked='true'] .knob {
  transform: translateX(18px);
}

.group {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.you-num {
  color: var(--you-text);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-3);
  align-items: start;
}

.known {
  padding: 18px;
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.known p {
  font-size: var(--fs-md);
  line-height: 1.65;
}

.known-cat {
  font-size: var(--fs-2xs);
  font-weight: 700;
  color: var(--text-secondary);
}

.tiny {
  font-size: var(--fs-2xs);
}

.mastered {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.overcome {
  padding: 18px;
  border-radius: 18px;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3) var(--space-5);
  justify-content: space-between;
  align-items: center;
  border-style: dashed;
}

.overcome p {
  font-size: var(--fs-md);
  margin-top: var(--space-1);
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
  font-size: var(--fs-sm);
}

.foot {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  justify-content: space-between;
  align-items: center;
  padding-top: var(--space-5);
  border-top: 1px solid var(--line);
  font-size: var(--fs-sm);
}

.danger-link {
  color: var(--danger);
}

.btn-danger {
  background: var(--danger);
  color: var(--text-on-ink);
  font-weight: 700;
}
</style>
