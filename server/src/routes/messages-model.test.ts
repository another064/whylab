import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Express } from 'express'

import { createApp } from '../app.js'
import { aiUnavailable, type ChatMessage, type ChatModel } from '../services/ai/model.js'
import { createTestDatabase } from '../test/helpers.js'

const GOOD = JSON.stringify({
  conclusion: '环境还被引用',
  reasons: ['函数记住词法环境', '被引用的不回收'],
  premises: ['词法作用域'],
  uncertainties: ['回收时机由引擎决定'],
  followUpSuggestions: ['什么时候不成立？'],
  observations: [{ category: 'questioning', statement: '追问机制', excerpt: '为什么' }],
})

let completeJson: ReturnType<typeof vi.fn<(messages: ChatMessage[]) => Promise<string>>>
let app: Express

beforeEach(() => {
  completeJson = vi.fn<(messages: ChatMessage[]) => Promise<string>>()
  const model: ChatModel = { completeJson }
  app = createApp(createTestDatabase(), model)
})

async function conversation(mode: 'explain' | 'socratic' = 'explain') {
  const space = await request(app).post('/api/spaces').send({ title: 'JS' })
  const conv = await request(app)
    .post(`/api/spaces/${space.body.data.id}/conversations`)
    .send({ mode })
  return conv.body.data.id as string
}

const send = (id: string, content = '为什么变量还在？') =>
  request(app).post(`/api/conversations/${id}/messages`).send({ content })
const history = (id: string) => request(app).get(`/api/conversations/${id}/messages`)

describe('解释模式接真实模型', () => {
  it('结构化回复落库，刷新后原样读回，且不标记为模拟', async () => {
    completeJson.mockResolvedValue(GOOD)
    const id = await conversation()

    const res = await send(id)
    expect(res.status).toBe(201)
    expect(res.body.data.isMock).toBe(false)
    expect(res.body.data.followUpSuggestions).toEqual(['什么时候不成立？'])

    const reply = (await history(id)).body.data[1]
    expect(reply.content).toContain('环境还被引用')
    expect(reply.meta.isMock).toBe(false)
    expect(reply.meta.explanation.reasons).toHaveLength(2)
    expect(reply.meta.observations).toHaveLength(1)
  })

  it('第二问会带上之前的问答作为上下文', async () => {
    completeJson.mockResolvedValue(GOOD)
    const id = await conversation()
    await send(id, '第一问')
    await send(id, '第二问')

    const messages = completeJson.mock.calls[1][0]
    expect(messages[0].role).toBe('system')
    expect(messages.slice(1).map((m) => m.role)).toEqual(['user', 'assistant', 'user'])
    expect(messages.at(-1)?.content).toBe('第二问')
  })

  it('输出不合格时带修复提示重试，成功后只写一组问答', async () => {
    completeJson.mockResolvedValueOnce('{"conclusion":""}').mockResolvedValueOnce(GOOD)
    const id = await conversation()

    expect((await send(id)).status).toBe(201)
    expect(completeJson).toHaveBeenCalledTimes(2)
    expect((await history(id)).body.data).toHaveLength(2)
  })

  it('重试仍不合格返回 AI_INVALID_OUTPUT，什么都不写', async () => {
    completeJson.mockResolvedValue('garbage')
    const id = await conversation()

    const res = await send(id)
    expect(res.status).toBe(502)
    expect(res.body.error.code).toBe('AI_INVALID_OUTPUT')
    expect(completeJson).toHaveBeenCalledTimes(3)
    expect((await history(id)).body.data).toEqual([])
  })

  it('模型不可用返回 AI_UNAVAILABLE 且不重试，之后可以重新发送（TC-11）', async () => {
    completeJson.mockRejectedValueOnce(aiUnavailable()).mockResolvedValueOnce(GOOD)
    const id = await conversation()

    const failed = await send(id)
    expect(failed.status).toBe(502)
    expect(failed.body.error.code).toBe('AI_UNAVAILABLE')
    expect(completeJson).toHaveBeenCalledTimes(1)
    expect((await history(id)).body.data).toEqual([])

    expect((await send(id)).status).toBe(201)
    expect((await history(id)).body.data).toHaveLength(2)
  })

  it('等模型期间对话被删除时返回 404，不写孤儿消息', async () => {
    const id = await conversation()
    completeJson.mockImplementation(async () => {
      await request(app).delete(`/api/conversations/${id}`)
      return GOOD
    })

    expect((await send(id)).status).toBe(404)
  })

  it('空问题不调用模型', async () => {
    const id = await conversation()
    expect((await send(id, '  ')).status).toBe(400)
    expect(completeJson).not.toHaveBeenCalled()
  })

  it('追问模式还不调用模型，并如实标记为模拟', async () => {
    const id = await conversation('socratic')
    const res = await send(id)
    expect(res.body.data.isMock).toBe(true)
    expect(completeJson).not.toHaveBeenCalled()
  })
})
