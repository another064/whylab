import { Router } from 'express'
import type { Request, Response } from 'express'

import { isAiConfigured } from '../config/env.js'
import { buildMockAnswer, MOCK_FOLLOW_UPS } from '../services/mock-reply.js'

export const chatRouter = Router()

const MAX_QUESTION_LENGTH = 2000

interface ChatRequestBody {
  question?: unknown
}

/**
 * POST /api/chat
 *
 * 当前阶段只做两件事：校验输入 + 返回明确标记的模拟解释。
 * 真实模型调用（流式、上下文、来源引用）在下一阶段替换 buildMockAnswer，
 * 页面与 API 契约保持不变，因此前端不需要改动。
 */
chatRouter.post('/chat', (req: Request, res: Response) => {
  const body = (req.body ?? {}) as ChatRequestBody
  const question = typeof body.question === 'string' ? body.question.trim() : ''

  if (!question) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_QUESTION', message: '问题不能为空，请先输入想弄明白的内容。' },
    })
    return
  }

  if (question.length > MAX_QUESTION_LENGTH) {
    res.status(400).json({
      success: false,
      error: {
        code: 'QUESTION_TOO_LONG',
        message: `问题长度不能超过 ${MAX_QUESTION_LENGTH} 个字符。`,
      },
    })
    return
  }

  res.status(200).json({
    success: true,
    data: {
      question,
      answer: buildMockAnswer(question),
      // 明确告知前端这是占位内容，界面必须据此展示「模拟响应」标记。
      isMock: !isAiConfigured(),
      followUpSuggestions: MOCK_FOLLOW_UPS,
    },
  })
})

