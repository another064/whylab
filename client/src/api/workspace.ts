import { request } from './http'

export type ConversationMode = 'explain' | 'socratic'

export interface LearningSpace {
  id: string
  title: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface RoundSummary {
  userInsights: string[]
  stuckAt: string[]
  conclusion: string
}

/** A socratic round: goal → layered questions → summary. */
export interface Round {
  id: string
  goal: string
  depth: number
  maxDepth: number
  /** strongest hint used on the current question: 0 none, 1 方向, 2 线索, 3 讲解 */
  hintLevel: number
  status: 'active' | 'completed' | 'abandoned'
  summary: RoundSummary | null
}

export interface Conversation {
  id: string
  spaceId: string
  title: string
  mode: ConversationMode
  /** Latest round; only present on detail responses. */
  round?: Round | null
  createdAt: string
  updatedAt: string
}

export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  mode: ConversationMode
  kind: string
  roundId: string | null
  content: string
  meta: {
    followUpSuggestions?: string[]
    isMock?: boolean
    /** Structured answer from the model; absent on mock and older replies. */
    explanation?: {
      conclusion: string
      reasons: string[]
      premises: string[]
      uncertainties: string[]
    }
    assessment?: { correctPoints: string[]; gaps: string[] }
    summary?: RoundSummary
  } | null
  createdAt: string
}

export interface SendMessageResult {
  userMessage?: Message
  reply: Message
  /** Socratic turns can return more than one reply (explanation + next question). */
  replies?: Message[]
  round?: Round
  followUpSuggestions?: string[]
  /** 后端未调用真实模型时为 true，界面必须据此展示「模拟响应」标记。 */
  isMock: boolean
}

export function listSpaces(): Promise<LearningSpace[]> {
  return request<LearningSpace[]>('/api/spaces')
}

export function createSpace(title: string): Promise<LearningSpace> {
  return request<LearningSpace>('/api/spaces', {
    method: 'POST',
    body: JSON.stringify({ title }),
  })
}

export function listConversations(spaceId: string): Promise<Conversation[]> {
  return request<Conversation[]>(`/api/spaces/${encodeURIComponent(spaceId)}/conversations`)
}

export function createConversation(
  spaceId: string,
  input: { title?: string; mode?: ConversationMode } = {},
): Promise<Conversation> {
  return request<Conversation>(`/api/spaces/${encodeURIComponent(spaceId)}/conversations`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function getConversation(conversationId: string): Promise<Conversation> {
  return request<Conversation>(`/api/conversations/${encodeURIComponent(conversationId)}`)
}

/** PATCH /api/conversations/:id —— 改标题或切换模式；历史消息保留发送时的 mode。 */
export function updateConversation(
  conversationId: string,
  input: { title?: string; mode?: ConversationMode },
): Promise<Conversation> {
  return request<Conversation>(`/api/conversations/${encodeURIComponent(conversationId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function listMessages(conversationId: string): Promise<Message[]> {
  return request<Message[]>(`/api/conversations/${encodeURIComponent(conversationId)}/messages`)
}

export function sendMessage(conversationId: string, content: string): Promise<SendMessageResult> {
  return request<SendMessageResult>(
    `/api/conversations/${encodeURIComponent(conversationId)}/messages`,
    { method: 'POST', body: JSON.stringify({ content }) },
  )
}

/** POST /api/conversations/:id/reveal —— level 1 方向、2 线索、3 直接告诉我。 */
export function revealStep(conversationId: string, level: 1 | 2 | 3): Promise<SendMessageResult> {
  return request<SendMessageResult>(`/api/conversations/${encodeURIComponent(conversationId)}/reveal`, {
    method: 'POST',
    body: JSON.stringify({ level }),
  })
}

/** POST /api/conversations/:id/end —— 结束这一轮并生成小结。 */
export function endRound(conversationId: string): Promise<SendMessageResult> {
  return request<SendMessageResult>(`/api/conversations/${encodeURIComponent(conversationId)}/end`, {
    method: 'POST',
    body: '{}',
  })
}
