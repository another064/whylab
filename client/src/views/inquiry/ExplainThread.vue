<script setup lang="ts">
/** 解释模式（你问 AI）: thread, restate-in-your-words, next questions, composer. */
import { computed, nextTick, ref, watch } from 'vue'

import AppIcon from '@/components/AppIcon.vue'
import MessageBubble from '@/components/MessageBubble.vue'
import StateBlock from '@/components/StateBlock.vue'
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

      <div v-else class="enter-fade">
        <MessageBubble speaker="ai">
          <div class="answer">
            <p v-if="m.meta?.isMock" class="note">模拟响应，不构成知识解释。</p>

            <template v-if="m.meta?.explanation">
              <p class="lead">{{ m.meta.explanation.conclusion }}</p>
              <ol class="steps">
                <li v-for="(reason, i) in m.meta.explanation.reasons" :key="i">{{ reason }}</li>
              </ol>
              <p v-if="m.meta.explanation.premises.length" class="note">
                前提：{{ m.meta.explanation.premises.join(' ') }}
              </p>
              <p v-if="m.meta.explanation.uncertainties.length" class="note">
                不确定：{{ m.meta.explanation.uncertainties.join(' ') }}
              </p>
            </template>
            <template v-else>
              <p v-for="(p, i) in paragraphs(m.content)" :key="i" class="answer-p">{{ p }}</p>
            </template>

            <div v-if="m.id === latest?.id" class="answer-actions">
              <button class="text-action" type="button" :disabled="saved" @click="saved = true">
                {{ saved ? '已收进（示例）' : '收进知识库' }}
              </button>
              <button class="text-action" type="button" :disabled="workspace.sending" @click="send('能换个讲法吗？')">
                换个讲法
              </button>
              <button class="text-action" type="button" :disabled="workspace.sending" @click="send('能举个具体例子吗？')">
                举个例子
              </button>
            </div>
          </div>
        </MessageBubble>
      </div>
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
      <section class="restate" aria-labelledby="restate-label">
        <template v-if="inquiry.restatement">
          <span class="restate-label">你的理解</span>
          <p class="restate-done">{{ inquiry.restatement }}</p>
        </template>
        <form v-else class="restate-form" @submit.prevent="restate">
          <label id="restate-label" for="restate" class="restate-label">用一句你自己的话说说</label>
          <textarea
            id="restate"
            v-model="restateDraft"
            class="textarea textarea-you"
            rows="2"
            placeholder="说错了也没关系"
          />
          <button class="btn btn-primary" type="submit" :disabled="!restateDraft.trim() || inquiry.restating">
            {{ inquiry.restating ? '正在存…' : '存为我的理解' }}
          </button>
          <p v-if="inquiry.restateError" class="error-text" role="alert">{{ inquiry.restateError }}</p>
        </form>
      </section>

      <section v-if="followUps.length" class="next" aria-labelledby="next-title">
        <h2 id="next-title" class="next-title">接着可以问</h2>
        <button v-for="q in followUps" :key="q" class="text-action next-q" type="button" @click="send(q)">
          {{ q }}
        </button>
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
  gap: var(--space-6);
}

.answer {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.lead {
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  font-weight: 700;
}

.steps {
  padding-left: 1.4em;
  list-style: decimal;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  font-size: var(--fs-md);
  line-height: var(--lh-body);
  color: var(--text-body);
}

.answer-p {
  font-size: var(--fs-md);
  line-height: var(--lh-body);
  color: var(--text-body);
  white-space: pre-wrap;
}

.note {
  font-size: var(--fs-xs);
  line-height: 1.7;
  color: var(--text-muted);
}

.text-action {
  min-height: 32px;
  padding: 0;
  border: 0;
  background: none;
  font-size: var(--fs-sm);
  color: var(--text-secondary);
  text-align: left;
}

.text-action:hover:not(:disabled) {
  color: var(--text);
  text-decoration: underline;
}

.answer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
}

.send-failed,
.restate,
.next {
  margin-left: 44px;
}

.send-failed {
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

.restate-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.restate-form .btn {
  align-self: flex-start;
  min-height: 40px;
}

.restate-label {
  font-size: var(--fs-sm);
  font-weight: 700;
  color: var(--you-text-strong);
}

.restate-done {
  margin-top: var(--space-1);
  font-size: var(--fs-md);
  line-height: 1.7;
}

.next {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-1);
}

.next-title {
  font-size: var(--fs-sm);
  font-weight: 700;
}

.next-q {
  min-height: var(--tap);
  color: var(--ai-text);
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
