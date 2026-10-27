<script setup lang="ts">
import { useChatStore } from '@/stores/chat'

const chat = useChatStore()

const SAMPLE_QUESTIONS = [
  '为什么 JavaScript 闭包能访问外部函数的变量？',
  '为什么卷积神经网络要使用局部连接和权值共享？',
  '为什么热力学第二定律不允许熵自发减少？',
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
  // Ctrl/Cmd + Enter 提交，避免和输入换行冲突
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    handleSubmit()
  }
}
</script>

<template>
  <section class="card ask-card" aria-labelledby="ask-title">
    <header class="card-head">
      <h2 id="ask-title">提出一个学习问题</h2>
      <span class="hint">Ctrl / ⌘ + Enter 提交</span>
    </header>

    <label class="sr-only" for="question-input">学习问题</label>
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

    <div class="sample-row">
      <span class="sample-label">不知道问什么？</span>
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
      <button class="btn btn-primary" type="button" :disabled="!chat.canSubmit" @click="handleSubmit">
        <span v-if="chat.isAsking" class="spinner" aria-hidden="true" />
        {{ chat.isAsking ? '正在生成解释…' : '提交问题' }}
      </button>
      <span class="char-count">{{ chat.question.length }} / 2000</span>
    </div>

    <p v-if="chat.status === 'failed'" class="alert alert-error" role="alert">
      {{ chat.errorMessage }}
    </p>

    <article v-if="chat.answer" class="answer" aria-live="polite">
      <header class="answer-head">
        <h3>解释</h3>
        <span v-if="chat.answer.isMock" class="badge badge-mock">模拟响应</span>
      </header>

      <p v-if="chat.answer.isMock" class="answer-note">
        当前尚未接入真实模型，以下内容由后端占位接口生成，仅用于打通前后端链路，不代表 AI 的真实解释。
      </p>

      <p class="answer-body">{{ chat.answer.answer }}</p>

      <div v-if="chat.answer.followUpSuggestions.length" class="follow-ups">
        <h4>可以继续追问</h4>
        <ul>
          <li v-for="item in chat.answer.followUpSuggestions" :key="item">{{ item }}</li>
        </ul>
      </div>
    </article>
  </section>
</template>
