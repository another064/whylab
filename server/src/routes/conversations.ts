import { Router } from 'express'

import type { Repositories } from '../db/repositories/index.js'
import { isConversationMode, type ConversationMode } from '../db/repositories/conversations.js'
import type { MessageKind, MessageMeta } from '../db/repositories/messages.js'
import { LOCAL_USER_ID } from '../db/migrate.js'
import { HttpError, notFound, validationError } from '../http/errors.js'
import { readBody, readString } from '../http/validate.js'
import { CONVERSATION_TITLE_MAX } from './spaces.js'
import type { ChatModel } from '../services/ai/model.js'
import { explanationToText, generateExplanation } from '../services/explain.js'
import { buildMockAnswer, MOCK_FOLLOW_UPS } from '../services/mock-reply.js'

export const MESSAGE_CONTENT_MAX = 2000
const MESSAGE_LIST_MAX = 200

/**
 * 解释模式配置了模型就走真实服务；追问模式还是 mock，
 * 轮次（socratic_rounds）和提示词在第 3 步接入，这里暂不创建。
 */
const KINDS_BY_MODE: Record<'explain' | 'socratic', { user: MessageKind; reply: MessageKind }> = {
  explain: { user: 'question', reply: 'answer' },
  socratic: { user: 'goal', reply: 'probe' },
}

export function createConversationsRouter(repos: Repositories, model: ChatModel | null): Router {
  const router = Router()

  function requireConversation(id: string) {
    const conversation = repos.conversations.findById(id)
    const space = conversation ? repos.spaces.findById(conversation.spaceId) : null
    if (!conversation || !space || space.userId !== LOCAL_USER_ID) {
      throw notFound('对话不存在或已被删除。')
    }
    return conversation
  }

  router.get('/conversations/:id', (req, res) => {
    res.json({ success: true, data: requireConversation(req.params.id) })
  })

  router.patch('/conversations/:id', (req, res) => {
    requireConversation(req.params.id)
    const body = readBody(req.body)
    const title = readString(body.title, { label: '对话标题', max: CONVERSATION_TITLE_MAX })
    if (body.mode !== undefined && !isConversationMode(body.mode)) {
      throw validationError("mode 只能是 'explain' 或 'socratic'。")
    }
    const updated = repos.conversations.update(req.params.id, {
      title: title ?? undefined,
      mode: body.mode as ConversationMode | undefined,
    })
    res.json({ success: true, data: updated })
  })

  router.delete('/conversations/:id', (req, res) => {
    requireConversation(req.params.id)
    repos.conversations.delete(req.params.id)
    res.json({ success: true, data: { id: req.params.id } })
  })

  router.get('/conversations/:id/messages', (req, res) => {
    requireConversation(req.params.id)
    const parsed = Number.parseInt(String(req.query.limit ?? ''), 10)
    const limit = Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, MESSAGE_LIST_MAX) : MESSAGE_LIST_MAX
    res.json({ success: true, data: repos.messages.listByConversation(req.params.id, limit) })
  })

  router.post('/conversations/:id/messages', async (req, res) => {
    const conversation = requireConversation(req.params.id)
    const body = readBody(req.body)
    // 与 /api/chat 保持同样的错误码，前端提示逻辑可复用。
    const content = typeof body.content === 'string' ? body.content.trim() : ''
    if (!content) {
      throw new HttpError(400, 'INVALID_QUESTION', '问题不能为空，请先输入想弄明白的内容。')
    }
    if (content.length > MESSAGE_CONTENT_MAX) {
      throw new HttpError(
        400,
        'QUESTION_TOO_LONG',
        `问题长度不能超过 ${MESSAGE_CONTENT_MAX} 个字符。`,
      )
    }

    const kinds = KINDS_BY_MODE[conversation.mode]

    // 先拿到回复再落库：模型失败时什么都不写，用户重试不会留下重复的问题。
    let replyContent: string
    let replyMeta: MessageMeta
    if (conversation.mode === 'explain' && model) {
      const history = repos.messages.listByConversation(conversation.id, MESSAGE_LIST_MAX)
      const explanation = await generateExplanation(model, history, content)
      replyContent = explanationToText(explanation)
      replyMeta = {
        isMock: false,
        followUpSuggestions: explanation.followUpSuggestions,
        explanation: {
          conclusion: explanation.conclusion,
          reasons: explanation.reasons,
          premises: explanation.premises,
          uncertainties: explanation.uncertainties,
        },
        observations: explanation.observations,
      }
      // 等模型的这段时间里对话可能已被删除
      requireConversation(conversation.id)
    } else {
      replyContent = buildMockAnswer(content)
      replyMeta = { isMock: true, followUpSuggestions: MOCK_FOLLOW_UPS }
    }

    const result = repos.db.transaction(() => {
      const now = new Date().toISOString()
      const userMessage = repos.messages.create({
        conversationId: conversation.id,
        role: 'user',
        mode: conversation.mode,
        kind: kinds.user,
        content,
        createdAt: now,
      })
      const reply = repos.messages.create({
        conversationId: conversation.id,
        role: 'assistant',
        mode: conversation.mode,
        kind: kinds.reply,
        content: replyContent,
        meta: replyMeta,
        createdAt: now,
      })
      repos.conversations.touch(conversation.id, now)
      repos.spaces.touch(conversation.spaceId, now)
      return { userMessage, reply }
    })()

    res.status(201).json({
      success: true,
      data: {
        ...result,
        followUpSuggestions: replyMeta.followUpSuggestions ?? [],
        isMock: replyMeta.isMock ?? false,
      },
    })
  })

  return router
}
