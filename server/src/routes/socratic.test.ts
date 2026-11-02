import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Express } from 'express'

import { createApp } from '../app.js'
import type { ChatMessage, ChatModel } from '../services/ai/model.js'
import { checkProbe } from '../services/socratic.js'
import { createTestDatabase } from '../test/helpers.js'

const probe = (question = '你觉得变量存在哪里？') =>
  JSON.stringify({
    assessment: { correctPoints: ['说对了作用域'], gaps: ['没提到引用'] },
    goalReached: false,
    question,
  })
const diagnostic = (question = '你现在怎么理解闭包？') => JSON.stringify({ question })
const SUMMARY = JSON.stringify({
  userInsights: ['函数记住了环境'],
  stuckAt: ['环境为什么不被回收'],
  conclusion: '环境被引用，所以变量还在。',
})

let completeJson: ReturnType<typeof vi.fn<(messages: ChatMessage[]) => Promise<string>>>
let app: Express

beforeEach(() => {
  completeJson = vi.fn<(messages: ChatMessage[]) => Promise<string>>()
  const model: ChatModel = { completeJson }
  app = createApp(createTestDatabase(), model)
})

async function conversation(mode: 'explain' | 'socratic' = 'socratic') {
  const space = await request(app).post('/api/spaces').send({ title: 'JS' })
  const conv = await request(app)
    .post(`/api/spaces/${space.body.data.id}/conversations`)
    .send({ mode })
  return conv.body.data.id as string
}

const send = (id: string, content: string) =>
  request(app).post(`/api/conversations/${id}/messages`).send({ content })
const reveal = (id: string, body: object = {}) =>
  request(app).post(`/api/conversations/${id}/reveal`).send(body)
const end = (id: string) => request(app).post(`/api/conversations/${id}/end`).send({})
const history = async (id: string) =>
  (await request(app).get(`/api/conversations/${id}/messages`)).body.data as {
    kind: string
    mode: string
    roundId: string | null
    meta: Record<string, never> | null
    content: string
  }[]

describe('checkProbe：追问不能直接给答案，必须是问句', () => {
  it('接受一个带少量铺垫的问句', () => {
    expect(checkProbe('你说对了一半。那变量存在哪里？')).toBeNull()
    expect(checkProbe('这里的原因是什么？')).toBeNull()
    expect(checkProbe('答案是不是和引用有关？')).toBeNull()
  })

  it('拒绝不是问句的、给出答案的和像讲解的', () => {
    expect(checkProbe('')).not.toBeNull()
    expect(checkProbe('闭包保存了词法环境。')).not.toBeNull()
    expect(checkProbe('答案是词法环境，你明白吗？')).not.toBeNull()
    expect(checkProbe('原因在于环境被引用，对吧？')).not.toBeNull()
    expect(checkProbe('第一点。第二点。那你怎么看？')).not.toBeNull()
    expect(checkProbe(`${'很长的铺垫'.repeat(50)}？`)).not.toBeNull()
  })
})

describe('开始一轮（TC-15）', () => {
  it('学习目标开启新一轮，AI 先问诊断问题，不直接给答案', async () => {
    completeJson.mockResolvedValue(diagnostic())
    const id = await conversation()

    const res = await send(id, '我想弄懂闭包')
    expect(res.status).toBe(201)
    expect(res.body.data.userMessage.kind).toBe('goal')
    expect(res.body.data.reply).toMatchObject({ kind: 'probe', content: '你现在怎么理解闭包？' })
    expect(res.body.data.round).toMatchObject({ goal: '我想弄懂闭包', depth: 1, maxDepth: 6, status: 'active' })
    expect(res.body.data.isMock).toBe(false)
  })

  it('模型给了答案时带修复提示重试，不合格的内容不会写库', async () => {
    completeJson
      .mockResolvedValueOnce(diagnostic('答案是词法环境，你明白吗？'))
      .mockResolvedValueOnce(diagnostic())
    const id = await conversation()

    expect((await send(id, '目标')).status).toBe(201)
    expect(completeJson).toHaveBeenCalledTimes(2)
    expect(completeJson.mock.calls[1][0].at(-1)?.content).toContain('不要给出答案')
    expect((await history(id)).map((m) => m.content)).not.toContain('答案是词法环境，你明白吗？')
  })

  it('一直不合格返回 AI_INVALID_OUTPUT，不会留下轮次', async () => {
    completeJson.mockResolvedValue(diagnostic('这不是问句。'))
    const id = await conversation()

    const res = await send(id, '目标')
    expect(res.status).toBe(502)
    expect(res.body.error.code).toBe('AI_INVALID_OUTPUT')
    expect(completeJson).toHaveBeenCalledTimes(3)
    expect((await request(app).get(`/api/conversations/${id}`)).body.data.round).toBeNull()
    expect(await history(id)).toEqual([])
  })
})

describe('逐层追问', () => {
  it('作答后进入下一层，带上对这次回答的评估', async () => {
    completeJson.mockResolvedValueOnce(diagnostic()).mockResolvedValueOnce(probe())
    const id = await conversation()
    await send(id, '目标')

    const res = await send(id, '函数记住了作用域')
    expect(res.body.data.userMessage.kind).toBe('response')
    expect(res.body.data.reply.kind).toBe('probe')
    expect(res.body.data.round.depth).toBe(2)
    expect(res.body.data.assessment.gaps).toEqual(['没提到引用'])
    expect(res.body.data.reply.meta.assessment.correctPoints).toEqual(['说对了作用域'])
  })

  it('目标达成时直接小结，轮次结束', async () => {
    completeJson
      .mockResolvedValueOnce(diagnostic())
      .mockResolvedValueOnce(JSON.stringify({ assessment: {}, goalReached: true, question: '' }))
      .mockResolvedValueOnce(SUMMARY)
    const id = await conversation()
    await send(id, '目标')

    const res = await send(id, '环境被引用所以没回收')
    expect(res.body.data.reply.kind).toBe('summary')
    expect(res.body.data.round.status).toBe('completed')
    expect(res.body.data.round.summary.conclusion).toContain('环境被引用')
  })

  it('超过最大层数自动小结，不会有第 7 问（TC-17）', async () => {
    completeJson.mockImplementation(async (messages) => {
      const system = messages[0].content
      if (system.includes('本轮小结')) return SUMMARY
      if (system.includes('goalReached')) return probe()
      return diagnostic()
    })
    const id = await conversation()
    await send(id, '目标')
    for (let i = 0; i < 5; i += 1) await send(id, `第 ${i + 1} 次作答`)

    const last = await send(id, '第 6 次作答')
    expect(last.body.data.reply.kind).toBe('summary')
    expect(last.body.data.reply.meta.summary.conclusion).toBeTruthy()
    expect(last.body.data.round).toMatchObject({ depth: 6, status: 'completed' })

    const kinds = (await history(id)).map((m) => m.kind)
    expect(kinds.filter((k) => k === 'probe')).toHaveLength(6)
    expect(kinds.at(-1)).toBe('summary')
  })

  it('一轮结束后，下一条消息开启新一轮', async () => {
    completeJson
      .mockResolvedValueOnce(diagnostic())
      .mockResolvedValueOnce(SUMMARY)
      .mockResolvedValueOnce(diagnostic('新一轮的问题？'))
    const id = await conversation()
    const first = await send(id, '目标一')
    await end(id)

    const second = await send(id, '目标二')
    expect(second.body.data.userMessage.kind).toBe('goal')
    expect(second.body.data.round.goal).toBe('目标二')
    expect(second.body.data.round.id).not.toBe(first.body.data.round.id)
  })

  it('模型失败时什么都不写，可以重试', async () => {
    completeJson
      .mockResolvedValueOnce(diagnostic())
      .mockResolvedValueOnce('garbage')
      .mockResolvedValueOnce('garbage')
      .mockResolvedValueOnce('garbage')
      .mockResolvedValueOnce(probe())
    const id = await conversation()
    await send(id, '目标')

    expect((await send(id, '作答')).status).toBe(502)
    expect(await history(id)).toHaveLength(2)
    const retry = await send(id, '作答')
    expect(retry.status).toBe(201)
    expect(retry.body.data.round.depth).toBe(2)
  })
})

describe('POST /reveal（TC-16）', () => {
  async function started() {
    completeJson.mockResolvedValueOnce(diagnostic())
    const id = await conversation()
    await send(id, '目标')
    return id
  }

  it('直接告诉我：讲清这一步，记卡点证据，并进入下一层', async () => {
    const id = await started()
    completeJson.mockResolvedValueOnce(
      JSON.stringify({ explanation: '函数保存了环境引用。', goalReached: false, nextQuestion: '那环境何时回收？' }),
    )

    const res = await reveal(id)
    expect(res.status).toBe(201)
    expect(res.body.data.replies.map((m: { kind: string }) => m.kind)).toEqual(['reveal', 'probe'])
    expect(res.body.data.replies[0].meta.stuck).toEqual({
      depth: 1,
      level: 3,
      question: '你现在怎么理解闭包？',
    })
    expect(res.body.data.round).toMatchObject({ depth: 2, hintLevel: 0, status: 'active' })
  })

  it('方向和线索不增加层数，逐级加强，不能重复要同一级', async () => {
    const id = await started()
    completeJson.mockResolvedValue(JSON.stringify({ content: '想想引用。' }))

    const nudge = await reveal(id, { level: 1 })
    expect(nudge.body.data.reply.kind).toBe('nudge')
    expect(nudge.body.data.reply.meta.stuck.level).toBe(1)
    expect(nudge.body.data.round).toMatchObject({ depth: 1, hintLevel: 1 })

    expect((await reveal(id, { level: 1 })).status).toBe(400)

    const hint = await reveal(id, { level: 2 })
    expect(hint.body.data.reply.kind).toBe('hint')
    expect(hint.body.data.round).toMatchObject({ depth: 1, hintLevel: 2 })
  })

  it('最后一层点直接告诉我：讲解后直接小结', async () => {
    completeJson.mockImplementation(async (messages) => {
      const system = messages[0].content
      if (system.includes('本轮小结')) return SUMMARY
      if (system.includes('直接告诉我')) return JSON.stringify({ explanation: '讲解', goalReached: false, nextQuestion: '' })
      if (system.includes('goalReached')) return probe()
      return diagnostic()
    })
    const id = await conversation()
    await send(id, '目标')
    for (let i = 0; i < 5; i += 1) await send(id, `作答 ${i}`)

    const res = await reveal(id)
    expect(res.status).toBe(201)
    expect(res.body.data.replies.map((m: { kind: string }) => m.kind)).toEqual(['reveal', 'summary'])
    expect(res.body.data.round.status).toBe('completed')
  })

  it('非法 level 返回 400；没有进行中的轮次返回 ROUND_NOT_ACTIVE', async () => {
    const id = await conversation()
    expect((await reveal(id, { level: 9 })).status).toBe(400)

    const res = await reveal(id)
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('ROUND_NOT_ACTIVE')
    expect(completeJson).not.toHaveBeenCalled()
  })
})

describe('POST /end', () => {
  it('结束并做小结，内容落库，刷新后能读回', async () => {
    completeJson.mockResolvedValueOnce(diagnostic()).mockResolvedValueOnce(SUMMARY)
    const id = await conversation()
    await send(id, '目标')

    const res = await end(id)
    expect(res.status).toBe(201)
    expect(res.body.data.reply.kind).toBe('summary')
    expect(res.body.data.round.status).toBe('completed')

    const conv = await request(app).get(`/api/conversations/${id}`)
    expect(conv.body.data.round.summary.userInsights).toEqual(['函数记住了环境'])
    expect((await history(id)).at(-1)?.kind).toBe('summary')
  })

  it('没有进行中的轮次返回 ROUND_NOT_ACTIVE，已结束的不能再结束', async () => {
    const id = await conversation()
    expect((await end(id)).status).toBe(409)

    completeJson.mockResolvedValueOnce(diagnostic()).mockResolvedValueOnce(SUMMARY)
    await send(id, '目标')
    expect((await end(id)).status).toBe(201)
    expect((await end(id)).status).toBe(409)
  })
})

describe('切换模式（TC-18）', () => {
  it('之后的回合按新模式进行，历史消息的模式标记不变，轮次可以接着走', async () => {
    completeJson.mockImplementation(async (messages) => {
      const system = messages[0].content
      if (system.includes('讲解者')) {
        return JSON.stringify({ conclusion: '结论', reasons: ['理由'] })
      }
      if (system.includes('goalReached')) return probe()
      return diagnostic()
    })
    const id = await conversation('explain')
    await send(id, '解释模式的问题')

    await request(app).patch(`/api/conversations/${id}`).send({ mode: 'socratic' })
    const goal = await send(id, '追问目标')
    expect(goal.body.data.reply.kind).toBe('probe')

    await request(app).patch(`/api/conversations/${id}`).send({ mode: 'explain' })
    const back = await send(id, '切回来再问')
    expect(back.body.data.reply.kind).toBe('answer')
    expect((await reveal(id)).status).toBe(409)

    const patched = await request(app).patch(`/api/conversations/${id}`).send({ mode: 'socratic' })
    expect(patched.body.data.round).toMatchObject({ goal: '追问目标', status: 'active', depth: 1 })
    expect((await send(id, '接着作答')).body.data.round.depth).toBe(2)

    const marks = (await history(id)).map((m) => `${m.mode}:${m.kind}`)
    expect(marks).toEqual([
      'explain:question',
      'explain:answer',
      'socratic:goal',
      'socratic:probe',
      'explain:question',
      'explain:answer',
      'socratic:response',
      'socratic:probe',
    ])
  })
})

describe('未配置模型', () => {
  it('追问流程照常走通，所有回复都标记为模拟', async () => {
    const mockApp = createApp(createTestDatabase(), null)
    const space = await request(mockApp).post('/api/spaces').send({ title: 'JS' })
    const conv = await request(mockApp)
      .post(`/api/spaces/${space.body.data.id}/conversations`)
      .send({ mode: 'socratic' })
    const id = conv.body.data.id as string

    const start = await request(mockApp).post(`/api/conversations/${id}/messages`).send({ content: '目标' })
    expect(start.body.data.isMock).toBe(true)
    const help = await request(mockApp).post(`/api/conversations/${id}/reveal`).send({})
    expect(help.body.data.replies[0].meta.isMock).toBe(true)
    const done = await request(mockApp).post(`/api/conversations/${id}/end`).send({})
    expect(done.body.data.round.status).toBe('completed')
    expect(done.body.data.reply.meta.isMock).toBe(true)
  })
})
