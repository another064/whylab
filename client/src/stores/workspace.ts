import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { ApiError } from '@/api/http'
import {
  createConversation,
  createSpace as createSpaceApi,
  getConversation,
  listConversations,
  listMessages,
  listSpaces,
  sendMessage as sendMessageApi,
  updateConversation,
  type Conversation,
  type ConversationMode,
  type LearningSpace,
  type Message,
} from '@/api/workspace'

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'failed'

const CONVERSATION_TITLE_LENGTH = 30

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

/**
 * Spaces → conversations → messages, all backed by the real API.
 * The router owns "which conversation is open"; this store only caches data.
 */
export const useWorkspaceStore = defineStore('workspace', () => {
  const spaces = ref<LearningSpace[]>([])
  const spacesStatus = ref<LoadStatus>('idle')
  const spacesError = ref('')

  const conversationsBySpace = ref<Record<string, Conversation[]>>({})

  const conversation = ref<Conversation | null>(null)
  const messages = ref<Message[]>([])
  const conversationStatus = ref<LoadStatus>('idle')
  const conversationError = ref('')

  const sending = ref(false)
  const sendError = ref('')
  /** What's on its way to the model; kept after a failure so it can be retried. */
  const pending = ref<{ conversationId: string; content: string } | null>(null)
  let openRequest = 0

  const pendingContent = computed(() =>
    pending.value && pending.value.conversationId === conversation.value?.id
      ? pending.value.content
      : null,
  )

  const currentSpace = computed(
    () => spaces.value.find((s) => s.id === conversation.value?.spaceId) ?? null,
  )

  async function loadSpaces(force = false): Promise<void> {
    if (spacesStatus.value === 'ready' && !force) return
    spacesStatus.value = 'loading'
    spacesError.value = ''
    try {
      spaces.value = await listSpaces()
      spacesStatus.value = 'ready'
    } catch (error) {
      spacesStatus.value = 'failed'
      spacesError.value = errorMessage(error, '加载学习空间失败。')
    }
  }

  async function createSpace(title: string): Promise<LearningSpace> {
    const space = await createSpaceApi(title)
    spaces.value = [space, ...spaces.value]
    conversationsBySpace.value[space.id] = []
    return space
  }

  async function loadConversations(spaceId: string): Promise<Conversation[]> {
    const list = await listConversations(spaceId)
    conversationsBySpace.value[spaceId] = list
    return list
  }

  /** Open a conversation by id (route param). A newer open wins over a slower older one. */
  async function openConversation(id: string): Promise<void> {
    if (conversation.value?.id === id && conversationStatus.value === 'ready') return
    const request = ++openRequest
    conversationStatus.value = 'loading'
    conversationError.value = ''
    sendError.value = ''
    messages.value = []
    try {
      const [conv, list] = await Promise.all([getConversation(id), listMessages(id)])
      if (request !== openRequest) return
      conversation.value = conv
      messages.value = list
      conversationStatus.value = 'ready'
      if (!conversationsBySpace.value[conv.spaceId]) void loadConversations(conv.spaceId)
    } catch (error) {
      if (request !== openRequest) return
      conversation.value = null
      conversationStatus.value = 'failed'
      conversationError.value = errorMessage(error, '加载对话失败。')
    }
  }

  /** Today's "开始探究": create the conversation and start sending; the caller navigates right away. */
  async function startInquiry(input: {
    spaceId: string
    question: string
    mode: ConversationMode
  }): Promise<Conversation> {
    const created = await createConversation(input.spaceId, {
      title: input.question.slice(0, CONVERSATION_TITLE_LENGTH),
      mode: input.mode,
    })
    openRequest += 1
    conversation.value = created
    messages.value = []
    conversationStatus.value = 'ready'
    const cached = conversationsBySpace.value[input.spaceId]
    if (cached) conversationsBySpace.value[input.spaceId] = [created, ...cached]
    else void loadConversations(input.spaceId) // includes `created`
    void send(input.question)
    return created
  }

  async function send(content: string): Promise<boolean> {
    const conv = conversation.value
    const trimmed = content.trim()
    if (!conv || !trimmed || sending.value) return false

    sending.value = true
    sendError.value = ''
    pending.value = { conversationId: conv.id, content: trimmed }
    try {
      const result = await sendMessageApi(conv.id, trimmed)
      if (conversation.value?.id === conv.id) {
        // reopening mid-flight may already have loaded this pair
        const known = new Set(messages.value.map((m) => m.id))
        messages.value = [
          ...messages.value,
          ...[result.userMessage, result.reply].filter((m) => !known.has(m.id)),
        ]
      }
      pending.value = null
      bumpToTop(conv, result.reply.createdAt)
      return true
    } catch (error) {
      sendError.value = errorMessage(error, '发送失败，请稍后重试。')
      return false
    } finally {
      sending.value = false
    }
  }

  /** Send the failed message again. */
  function retry(): Promise<boolean> {
    return send(pending.value?.content ?? '')
  }

  async function setMode(mode: ConversationMode): Promise<void> {
    const conv = conversation.value
    if (!conv || conv.mode === mode) return
    const previous = conv.mode
    conversation.value = { ...conv, mode } // optimistic: the switch should feel instant
    try {
      conversation.value = await updateConversation(conv.id, { mode })
    } catch (error) {
      if (conversation.value?.id === conv.id) conversation.value = { ...conv, mode: previous }
      sendError.value = errorMessage(error, '切换模式失败。')
    }
  }

  /** Match the server's ordering: the conversation and space with new activity go first. */
  function bumpToTop(conv: Conversation, at: string) {
    const list = conversationsBySpace.value[conv.spaceId] ?? []
    conversationsBySpace.value[conv.spaceId] = [
      { ...conv, updatedAt: at },
      ...list.filter((c) => c.id !== conv.id),
    ]
    const space = spaces.value.find((s) => s.id === conv.spaceId)
    if (space) {
      spaces.value = [{ ...space, updatedAt: at }, ...spaces.value.filter((s) => s.id !== space.id)]
    }
  }

  return {
    spaces,
    spacesStatus,
    spacesError,
    conversationsBySpace,
    conversation,
    messages,
    conversationStatus,
    conversationError,
    sending,
    sendError,
    pendingContent,
    currentSpace,
    loadSpaces,
    createSpace,
    loadConversations,
    openConversation,
    startInquiry,
    send,
    retry,
    setMode,
  }
})
