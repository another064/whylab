import { describe, expect, it, vi } from 'vitest'

import type { Message } from '../db/repositories/messages.js'
import { ModelOutputError, createOpenAiCompatibleModel } from './ai/model.js'
import { CONTEXT_MESSAGE_LIMIT, buildContext, parseExplanation } from './explain.js'

const VALID = { conclusion: '因为环境还被引用', reasons: ['函数记住词法环境', '被引用的不回收'] }

function message(i: number, role: Message['role'], isMock = false): Message {
  return {
    id: String(i),
    conversationId: 'c',
    role,
    mode: 'explain',
    kind: role === 'user' ? 'question' : 'answer',
    roundId: null,
    content: `m${i}`,
    meta: role === 'assistant' ? { isMock } : null,
    createdAt: '',
  }
}

describe('parseExplanation', () => {
  it('缺结论、缺理由或不是 JSON 都判为无效', () => {
    expect(() => parseExplanation('not json', 'q')).toThrow(ModelOutputError)
    expect(() => parseExplanation('{"reasons":["a"]}', 'q')).toThrow(ModelOutputError)
    expect(() => parseExplanation('{"conclusion":"a","reasons":[]}', 'q')).toThrow(ModelOutputError)
    expect(() => parseExplanation('null', 'q')).toThrow(ModelOutputError)
  })

  it('追问建议最多 3 条，可选字段缺失时为空', () => {
    const parsed = parseExplanation(
      JSON.stringify({ ...VALID, followUpSuggestions: ['1', '2', '3', '4'] }),
      'q',
    )
    expect(parsed.followUpSuggestions).toHaveLength(3)
    expect(parsed.premises).toEqual([])
    expect(parsed.observations).toEqual([])
  })

  it('observations 只保留枚举合法、不评价能力、摘录真实出现在提问里的', () => {
    const question = '为什么变量还在？'
    const ok = { category: 'questioning', statement: '追问机制', excerpt: '变量还在' }
    const parsed = parseExplanation(
      JSON.stringify({
        ...VALID,
        observations: [
          ok,
          { ...ok, category: 'iq' },
          { ...ok, statement: '不擅长抽象思考' },
          { ...ok, excerpt: '模型编的原话' },
          null,
        ],
      }),
      question,
    )
    expect(parsed.observations).toEqual([ok])
  })
})

describe('buildContext', () => {
  it('去掉占位回复，只保留最近几条', () => {
    const history = [message(1, 'user'), message(2, 'assistant', true)]
    for (let i = 3; i < 20; i += 1) history.push(message(i, i % 2 ? 'user' : 'assistant'))
    const context = buildContext(history)

    expect(context).toHaveLength(CONTEXT_MESSAGE_LIMIT)
    expect(context.at(-1)?.content).toBe('m19')
    expect(buildContext(history.slice(0, 2)).map((m) => m.content)).toEqual(['m1'])
  })
})

describe('createOpenAiCompatibleModel', () => {
  const options = { baseUrl: 'https://x.test/', apiKey: 'secret-key', model: 'm', timeoutMs: 1000 }

  it('请求带 key 和 JSON 模式，返回正文', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ choices: [{ message: { content: '{"a":1}' }, finish_reason: 'stop' }] }),
    )
    const model = createOpenAiCompatibleModel({ ...options, fetchImpl: fetchImpl as typeof fetch })

    await expect(model.completeJson([{ role: 'user', content: 'q' }])).resolves.toBe('{"a":1}')
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://x.test/chat/completions')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer secret-key')
    expect(JSON.parse(init.body as string).response_format).toEqual({ type: 'json_object' })
  })

  it('网络错误和非 2xx 转成 AI_UNAVAILABLE，错误信息不含 key', async () => {
    for (const impl of [
      async () => {
        throw new Error('boom')
      },
      async () => new Response('nope', { status: 500 }),
    ]) {
      const model = createOpenAiCompatibleModel({ ...options, fetchImpl: impl as typeof fetch })
      const error = await model.completeJson([]).catch((e: unknown) => e)
      expect(error).toMatchObject({ status: 502, code: 'AI_UNAVAILABLE' })
      expect(String((error as Error).message)).not.toContain('secret-key')
    }
  })

  it('被截断或为空的输出判为可重试', async () => {
    const truncated = async () =>
      Response.json({ choices: [{ message: { content: '{"a"' }, finish_reason: 'length' }] })
    const model = createOpenAiCompatibleModel({ ...options, fetchImpl: truncated as typeof fetch })
    await expect(model.completeJson([])).rejects.toBeInstanceOf(ModelOutputError)
  })
})
