<script setup lang="ts">
import { useChatStore } from '@/stores/chat'

const chat = useChatStore()

const SAMPLE_QUESTIONS = [
  '为什么 JavaScript 闭包能访问外部函数的变量？',
  '为什么卷积网络要局部连接和权值共享？',
  '为什么熵不会自发减少？',
]

function handleInput(event: Event): void {
  chat.setQuestion((event.target as HTMLTextAreaElement).value)
}

function useSample(sample: string): void {
  chat.setQuestion(sample)
}

function handleSubmit(): void {
  void chat.ask()
}

function handleKeydown(event: KeyboardEvent): void {
  // Ctrl / Cmd + Enter 提交，把回车留给换行
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    handleSubmit()
  }
}
</script>

<template>
  <section class="panel" aria-labelledby="ask-title">
    <header class="panel-head">
      <h2 id="ask-title">提出一个学习问题</h2>
      <span class="panel-meta">01 / 输入</span>
    </header>

    <div class="field">
      <div class="field-label-row">
        <label for="question-input">问题</label>
        <span class="field-hint num">{{ chat.question.length }} / 2000</span>
      </div>

      <textarea
        id="question-input"
        class="ask-input"
        :value="chat.question"
        rows="4"
        maxlength="2000"
        placeholder="例如：为什么闭包能够访问外部函数的变量？它依赖哪些前提？"
        :disabled="chat.isAsking"
        @input="handleInput"
        @keydown="handleKeydown"
      />

      <p class="field-help">写清「为什么」，比写「是什么」更容易得到可以复习的答案。</p>
    </div>

    <div class="sample-row">
      <span class="sample-label">示例</span>
      <button
        v-for="sample in SAMPLE_QUESTIONS"
        :key="sample"
        class="chip"
        type="button"
        :disabled="chat.isAsking"
        @click="useSample(sample)"
      >
        {{ sample }}
      </button>
    </div>

    <div class="ask-actions">
      <span class="kbd-hint">
        <kbd>Ctrl</kbd>
        <span>+</span>
        <kbd>Enter</kbd>
        <span>提交</span>
      </span>

      <button class="btn btn-primary" type="button" :disabled="!chat.canSubmit" @click="handleSubmit">
        {{ chat.isAsking ? '正在生成' : '提交问题' }}
        <span v-if="!chat.isAsking" class="btn-arrow" aria-hidden="true">-&gt;</span>
      </button>
    </div>

    <p v-if="chat.status === 'failed'" class="error-inline" role="alert">
      {{ chat.errorMessage }}
    </p>

    <div class="answer-zone" aria-live="polite">
      <div v-if="chat.isAsking" aria-busy="true">
        <p class="sr-only">正在生成解释</p>
        <div class="skeleton" aria-hidden="true">
          <div class="skeleton-line w-92" />
          <div class="skeleton-line w-78" />
          <div class="skeleton-line w-92" />
          <div class="skeleton-line w-64" />
        </div>
      </div>

      <div v-else-if="!chat.answer" class="empty">
        <span class="empty-label">还没有内容</span>
        <p>
          把卡住你的那个「为什么」写下来。提交后会在这里出现解释、追问方向，以及可保存为知识节点的片段。
        </p>
      </div>

      <article v-else>
        <header class="answer-head">
          <h3>解释</h3>
          <span v-if="chat.answer.isMock" class="badge badge-mock">模拟响应</span>
        </header>

        <p v-if="chat.answer.isMock" class="answer-note">
          尚未接入真实模型。以下内容由后端占位接口生成，只用于确认链路，不构成知识解释。
        </p>

        <p class="answer-body">{{ chat.answer.answer }}</p>

        <div v-if="chat.answer.followUpSuggestions.length" class="follow-ups">
          <h4>可以继续追问</h4>
          <ul>
            <li v-for="item in chat.answer.followUpSuggestions" :key="item">{{ item }}</li>
          </ul>
        </div>
      </article>
    </div>
  </section>
</template>
