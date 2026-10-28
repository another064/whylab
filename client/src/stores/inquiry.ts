import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

import {
  fetchDependencies,
  requestHint,
  saveRestatement,
  type Dependency,
  type HintLevel,
} from '@/api/inquiry'
import type { Message } from '@/api/workspace'
import { errorMessage, useWorkspaceStore } from '@/stores/workspace'

/** Socratic depth cap, mirrors socratic_rounds.max_depth default. */
export const MAX_DEPTH = 6

/**
 * Per-conversation state shared by InquiryView and InquiryAside:
 * restatement, hints used in the current step, dependencies.
 * Reset whenever the open conversation changes.
 */
export const useInquiryStore = defineStore('inquiry', () => {
  const workspace = useWorkspaceStore()

  const restatement = ref<string | null>(null)
  const restating = ref(false)
  const restateError = ref('')

  const hints = ref<{ level: HintLevel; text: string }[]>([])
  const hintLoading = ref(false)

  const dependencies = ref<Dependency[] | null>(null)
  const recallQueued = ref(false)

  const conversationId = computed(() => workspace.conversation?.id ?? null)

  watch(conversationId, (id) => {
    restatement.value = null
    restateError.value = ''
    hints.value = []
    dependencies.value = null
    recallQueued.value = false
    if (id) void fetchDependencies(id).then((d) => (dependencies.value = d))
  }, { immediate: true })

  // a new AI question starts a new step: the hint ladder resets
  watch(
    () => workspace.messages.length,
    () => (hints.value = []),
  )

  const explainMessages = computed(() => workspace.messages.filter((m) => m.mode === 'explain'))
  const socraticMessages = computed(() => workspace.messages.filter((m) => m.mode === 'socratic'))

  const latestAnswer = computed<Message | null>(
    () => [...explainMessages.value].reverse().find((m) => m.role === 'assistant') ?? null,
  )

  /** Socratic: the goal is the first thing you said in this mode. */
  const goal = computed(() => socraticMessages.value.find((m) => m.role === 'user')?.content ?? null)
  const probes = computed(() => socraticMessages.value.filter((m) => m.role === 'assistant'))
  const depth = computed(() => Math.min(probes.value.length, MAX_DEPTH))
  const yourAnswers = computed(() =>
    socraticMessages.value.filter((m) => m.role === 'user').slice(1),
  )

  async function restate(text: string): Promise<void> {
    const id = conversationId.value
    if (!id || !text.trim()) return
    restating.value = true
    restateError.value = ''
    try {
      restatement.value = (await saveRestatement(id, text.trim())).text
    } catch (error) {
      restateError.value = errorMessage(error, '没存上，请稍后重试。')
    } finally {
      restating.value = false
    }
  }

  async function hint(level: HintLevel): Promise<void> {
    const id = conversationId.value
    if (!id) return
    hintLoading.value = true
    try {
      hints.value = [...hints.value, { level, text: await requestHint(id, level) }]
    } finally {
      hintLoading.value = false
    }
  }

  return {
    restatement,
    restating,
    restateError,
    hints,
    hintLoading,
    dependencies,
    recallQueued,
    explainMessages,
    socraticMessages,
    latestAnswer,
    goal,
    probes,
    depth,
    yourAnswers,
    restate,
    hint,
  }
})
