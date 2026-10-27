import { Router } from 'express'
import type { Request, Response } from 'express'

import { isAiConfigured } from '../config/env.js'

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
      followUpSuggestions: [
        '这个结论依赖哪些前提？如果去掉其中一个，会发生什么？',
        '有没有反例或边界情况，让这个解释不再成立？',
        '能否用一个具体例子把推导过程走一遍？',
      ],
    },
  })
})

function buildMockAnswer(question: string): string {
  return [
    `你问的是：「${question}」`,
    '',
    '这是 WhyLab 后端占位接口返回的文本，尚未调用任何大模型，因此不包含真实的知识解释。',
    '',
    '它存在的目的只有一个：验证「前端输入 → Vite 代理 → Express 路由 → 结构化响应 → 页面渲染」这条链路是通的。',
    '',
    '接入真实模型后，这里会替换为：核心解释、推导过程、适用条件与不确定性提示。',
  ].join('\n')
}
