<script setup lang="ts">
/** 解释模式（你问 AI）: thread, restate-in-your-words, next questions, composer. */
import { computed, nextTick, ref, watch } from 'vue'

import { PROMPTED_FOLLOW_UP } from '@/api/inquiry'
import AppIcon from '@/components/AppIcon.vue'
import MessageBubble from '@/components/MessageBubble.vue'
import StateBlock from '@/components/StateBlock.vue'
import FadeContent from '@/components/motion/FadeContent.vue'
import { useInquiryStore } from '@/stores/inquiry'
import { useWorkspaceStore } from '@/stores/workspace'

const workspace = useWorkspaceStore()
const inquiry = useInquiryStore()

const draft = ref('')
const restateDraft = ref('')
const saved = ref(false)
const bottom = ref<HTMLElement | null>(null)

const messages = computed(() => inquiry.explainMessages)
const latest = computed(() => inquiry.latestAnswer)
const followUps = computed(() => latest.value?.meta?.followUpSuggestions ?? [])

function paragraphs(text: string): string[] {
  return text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
}

function send(text = draft.value) {
  if (!text.trim() || workspace.sending) return
  // the text moves into the thread straight away; a failure keeps it there with a retry
  if (text === draft.value) draft.value = ''
  saved.value = false
  void workspace.send(text)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    void send()
  }
}

async function restate() {
  await inquiry.restate(restateDraft.value)
  if (!inquiry.restateError) restateDraft.value = ''
}

watch(
  () => [messages.value.length, workspace.pendingContent],
  async () => {
    await nextTick()
    bottom.value?.scrollIntoView({ block: 'end' })
  },
)
</script>

<template>
  <div class="explain">
    <StateBlock
      v-if="!messages.length && !workspace.pendingContent"
      state="empty"
      title="问出你卡住的那个“为什么”"
      message="写清“为什么”，比写“是什么”更容易得到能讲给别人听的答案。"
    />

    <template v-for="m in messages" :key="m.id">
      <MessageBubble v-if="m.role === 'user'" speaker="you">{{ m.content }}</MessageBubble>

      <FadeContent v-else>
        <MessageBubble speaker="ai">
          <div class="answer">
            <div v-if="m.meta?.isMock" class="mock-box">
              <span class="mock-label">模拟响应</span>
              尚未接入真实模型。以下内容由后端占位接口生成，只用于确认链路，不构成知识解释。
            </div>

            <template v-if="m.meta?.explanation">
              <div class="conclusion">
                <span class="conclusion-label">一句话结论</span>
                <p>{{ m.meta.explanation.conclusion }}</p>
              </div>
              <div class="why">
                <span class="why-title">为什么会这样</span>
                <ol class="why-list">
                  <li v-for="(reason, i) in m.meta.explanation.reasons" :key="i">
                    <span class="why-index num" aria-hidden="true">{{ i + 1 }}</span>
                    <span>{{ reason }}</span>
                  </li>
                </ol>
              </div>
              <div
                v-if="m.meta.explanation.premises.length || m.meta.explanation.uncertainties.length"
                class="caveats"
              >
                <span v-for="(c, i) in m.meta.explanation.premises" :key="`p${i}`" class="chip-outline">
                  前提：{{ c }}
                </span>
                <span v-for="(c, i) in m.meta.explanation.uncertainties" :key="`u${i}`" class="chip-outline">
                  不确定：{{ c }}
                </span>
              </div>
            </template>
            <template v-else>
              <p v-for="(p, i) in paragraphs(m.content)" :key="i" class="answer-p">{{ p }}</p>
            </template>

            <div v-if="m.id === latest?.id" class="answer-actions">
              <button class="btn btn-outline" type="button" :disabled="saved" @click="saved = true">
                <AppIcon name="bookmark" :size="16" />{{ saved ? '已收进（示例）' : '收进知识库' }}
              </button>
              <button class="btn btn-outline" type="button" :disabled="workspace.sending" @click="send('能换个讲法吗？')">
                换个讲法
              </button>
              <button class="btn btn-outline" type="button" :disabled="workspace.sending" @click="send('能举个具体例子吗？')">
                举个例子
              </button>
            </div>
          </div>
        </MessageBubble>
      </FadeContent>
    </template>

    <MessageBubble v-if="workspace.pendingContent" speaker="you">{{ workspace.pendingContent }}</MessageBubble>

    <MessageBubble v-if="workspace.sending && workspace.pendingContent" speaker="ai">
      <StateBlock state="loading" :lines="3" title="WhyLab 正在想" />
    </MessageBubble>

    <div v-else-if="workspace.sendError && workspace.pendingContent" class="send-failed" role="alert">
      <span>{{ workspace.sendError }}你的问题还在。</span>
      <button class="btn btn-outline" type="button" @click="workspace.retry()">重试</button>
    </div>

    <template v-if="latest && !workspace.pendingContent">
      <FadeContent as="section" class="restate card card-you" aria-labelledby="restate-label">
        <template v-if="inquiry.restatement">
          <span class="restate-done-label">你的理解 · 已存</span>
          <p class="restate-done">{{ inquiry.restatement }}</p>
        </template>
        <form v-else class="restate-form" @submit.prevent="restate">
          <label id="restate-label" for="restate" class="restate-label">
            先别往下问——用一句你自己的话说说，刚才这个为什么成立？
          </label>
          <textarea
            id="restate"
            v-model="restateDraft"
            class="textarea textarea-you"
            rows="2"
            placeholder="说错了也没关系，WhyLab 会帮你找到差在哪"
          />
          <div class="restate-foot">
            <span class="restate-hint">自己讲出来的，比读到的记得更久。</span>
            <button class="btn btn-primary" type="submit" :disabled="!restateDraft.trim() || inquiry.restating">
              {{ inquiry.restating ? '正在存…' : '存为我的理解' }}
            </button>
          </div>
          <p v-if="inquiry.restateError" class="error-text" role="alert">{{ inquiry.restateError }}</p>
        </form>
      </FadeContent>

      <section v-if="followUps.length" class="next" aria-labelledby="next-title">
        <h2 id="next-title" class="next-title">接着可以问</h2>
        <div class="next-chips">
          <button class="chip chip-nudge" type="button" @click="send(PROMPTED_FOLLOW_UP)">
            <span class="tag tag-you">你很少问</span>{{ PROMPTED_FOLLOW_UP }}
          </button>
          <button v-for="q in followUps" :key="q" class="chip" type="button" @click="send(q)">{{ q }}</button>
        </div>
      </section>
    </template>

    <p v-if="workspace.sendError && !workspace.pendingContent" class="error-text" role="alert">
      {{ workspace.sendError }}
    </p>

    <form ref="bottom" class="composer" @submit.prevent="send()">
      <label for="next-input" class="sr-only">继续追问</label>
      <textarea
        id="next-input"
        v-model="draft"
        rows="1"
        maxlength="2000"
        :placeholder="messages.length ? '继续追问，或者说说哪里没想通…' : '例如：为什么闭包能访问外部函数的变量？'"
        :disabled="workspace.sending"
        @keydown="onKeydown"
      />
      <button class="btn btn-primary btn-icon" type="submit" aria-label="发送" :disabled="!draft.trim() || workspace.sending">
        <AppIcon name="send" />
      </button>
    </form>
  </div>
</template>

<style scoped>
.explain {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.answer {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.mock-box {
  background: var(--ai-soft);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  font-size: var(--fs-sm);
  line-height: 1.7;
  color: var(--ai-text);
}

.mock-label {
  display: block;
  font-size: var(--fs-2xs);
  font-weight: 700;
  margin-bottom: 2px;
}

.answer-p {
  font-size: var(--fs-md);
  line-height: var(--lh-body);
  color: var(--text-body);
  white-space: pre-wrap;
}

.conclusion {
  background: var(--ai-soft);
  border-radius: var(--radius-md);
  padding: 14px var(--space-4);
}

.conclusion-label {
  display: block;
  font-size: var(--fs-2xs);
  font-weight: 700;
  color: var(--ai-text);
  margin-bottom: var(--space-1);
}

.conclusion p {
  font-size: var(--fs-body);
  line-height: 1.7;
  font-weight: 500;
}

.why {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: var(--fs-md);
  line-height: var(--lh-body);
  color: var(--text-body);
}

.why-title {
  font-size: var(--fs-sm);
  font-weight: 700;
  color: var(--text);
}

.why-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.why-list li {
  display: flex;
  gap: var(--space-3);
}

.why-index {
  flex: 0 0 24px;
  height: 24px;
  margin-top: 2px;
  border-radius: 50%;
  border: 1.5px solid var(--ai);
  color: var(--ai-text);
  font-size: var(--fs-2xs);
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.caveats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
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

.answer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.answer-actions .btn {
  min-height: 40px;
  padding: 0 14px;
}

.restate,
.next {
  margin-left: 44px;
}

.restate {
  padding: var(--space-4);
  border-radius: 16px;
}

.restate-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.restate-label {
  font-size: var(--fs-md);
  font-weight: 700;
  color: var(--you-text-strong);
}

.restate-foot {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
}

.restate-hint {
  font-size: var(--fs-xs);
  color: var(--you-text-strong);
}

.restate-done-label {
  font-size: var(--fs-2xs);
  font-weight: 700;
  color: var(--you-text);
}

.restate-done {
  margin-top: var(--space-1);
  font-size: var(--fs-md);
  line-height: 1.7;
}

.next {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.next-title {
  font-size: var(--fs-sm);
  font-weight: 700;
}

.next-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.chip {
  min-height: 40px;
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid var(--line-strong);
  background: var(--surface);
  font-size: var(--fs-sm);
  text-align: left;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.chip:hover {
  border-color: var(--ink);
}

.chip-nudge {
  border: 1.5px solid var(--you-text);
}

.chip-nudge .tag {
  font-size: var(--fs-3xs);
}

.composer {
  position: sticky;
  bottom: var(--space-4);
  display: flex;
  gap: var(--space-2);
  align-items: flex-end;
  padding: var(--space-2) var(--space-2) var(--space-2) var(--space-4);
  border: 1.5px solid var(--line-strong);
  border-radius: 16px;
  background: var(--surface);
  box-shadow: var(--shadow-float);
}

.composer:focus-within {
  border-color: var(--ai);
}

.composer textarea {
  flex: 1 1 auto;
  min-width: 0;
  border: 0;
  outline: none;
  padding: 10px 0;
  font-size: var(--fs-body);
  line-height: 1.6;
  resize: none;
  background: transparent;
  field-sizing: content;
  max-height: 200px;
}

.composer textarea:focus-visible {
  box-shadow: none;
}

.composer .btn-icon {
  border-radius: 12px;
}

@media (max-width: 767px) {
  .send-failed,
  .restate,
  .next {
    margin-left: 0;
  }
}
</style>
