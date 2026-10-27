import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { askQuestion, type AskAnswer } from '@/api/chat'
import { ApiError } from '@/api/http'

export type AskStatus = 'idle' | 'asking' | 'answered' | 'failed'

export const useChatStore = defineStore('chat', () => {
  const question = ref('')
  const answer = ref<AskAnswer | null>(null)
  const status = ref<AskStatus>('idle')
  const errorMessage = ref('')

  const isAsking = computed(() => status.value === 'asking')
  const canSubmit = computed(() => question.value.trim().length > 0 && !isAsking.value)

  function setQuestion(value: string): void {
    question.value = value
  }

  function reset(): void {
    answer.value = null
    errorMessage.value = ''
    status.value = 'idle'
  }

  async function ask(): Promise<void> {
    const trimmed = question.value.trim()

    if (!trimmed || isAsking.value) return

    status.value = 'asking'
    errorMessage.value = ''

    try {
      answer.value = await askQuestion(trimmed)
      status.value = 'answered'
    } catch (error) {
      answer.value = null
      status.value = 'failed'
      errorMessage.value =
        error instanceof ApiError ? error.message : '提交失败，请稍后重试。'
    }
  }

  return {
    question,
    answer,
    status,
    errorMessage,
    isAsking,
    canSubmit,
    setQuestion,
    reset,
    ask,
  }
})
