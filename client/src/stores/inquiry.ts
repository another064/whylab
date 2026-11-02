import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

import { fetchDependencies, saveRestatement, type Dependency } from '@/api/inquiry'
import type { Message } from '@/api/workspace'
import { errorMessage, useWorkspaceStore } from '@/stores/workspace'

/**
 * Per-conversation state shared by InquiryView and InquiryAside.
 * The socratic round itself lives on the server; everything about it here is derived.
 */
export const useInquiryStore = defineStore('inquiry', () => {
  const workspace = useWorkspaceStore()

  const restatement = ref<string | null>(null)
  const restating = ref(false)
  const restateError = ref('')

  const dependencies = ref<Dependency[] | null>(null)
  const recallQueued = ref(false)

  const conversationId = computed(() => workspace.conversation?.id ?? null)

  watch(conversationId, (id) => {
    restatement.value = null
    restateError.value = ''
    dependencies.value = null
    recallQueued.value = false
    if (id) void fetchDependencies(id).then((d) => (dependencies.value = d))
  }, { immediate: true })

  const explainMessages = computed(() => workspace.messages.filter((m) => m.mode === 'explain'))

  const latestAnswer = computed<Message | null>(
    () => [...explainMessages.value].reverse().find((m) => m.role === 'assistant') ?? null,
  )

  /** The latest round, active or finished. */
  const round = computed(() => workspace.conversation?.round ?? null)
  const activeRound = computed(() => (round.value?.status === 'active' ? round.value : null))

  const roundMessages = computed(() =>
    round.value ? workspace.messages.filter((m) => m.roundId === round.value?.id) : [],
  )
  /** Earlier rounds and old messages without a round. */
  const otherSocraticMessages = computed(() =>
    workspace.messages.filter((m) => m.mode === 'socratic' && m.roundId !== round.value?.id),
  )

  const currentProbeIndex = computed(() =>
    roundMessages.value.map((m) => m.kind).lastIndexOf('probe'),
  )
  /** The question waiting for an answer. */
  const currentProbe = computed(() => roundMessages.value[currentProbeIndex.value] ?? null)
  /** Hints asked for on the current question. */
  const currentHints = computed(() =>
    roundMessages.value.slice(currentProbeIndex.value + 1).filter((m) => m.kind === 'nudge' || m.kind === 'hint'),
  )
  /** Everything before the current question, without the goal (it has its own bar). */
  const earlierMessages = computed(() =>
    roundMessages.value.slice(0, Math.max(currentProbeIndex.value, 0)).filter((m) => m.kind !== 'goal'),
  )
  const yourAnswers = computed(() => roundMessages.value.filter((m) => m.kind === 'response'))

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

  return {
    restatement,
    restating,
    restateError,
    dependencies,
    recallQueued,
    explainMessages,
    latestAnswer,
    round,
    activeRound,
    roundMessages,
    otherSocraticMessages,
    currentProbe,
    currentHints,
    earlierMessages,
    yourAnswers,
    restate,
  }
})
