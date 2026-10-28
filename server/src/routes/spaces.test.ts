import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Express } from 'express'

import { createApp } from '../app.js'
import { createTestDatabase } from '../test/helpers.js'

let app: Express

beforeEach(() => {
  app = createApp(createTestDatabase())
})

async function createSpace(title = 'JavaScript') {
  const res = await request(app).post('/api/spaces').send({ title })
  expect(res.status).toBe(201)
  return res.body.data as { id: string; title: string }
}

async function createConversation(spaceId: string, body: object = {}) {
  const res = await request(app).post(`/api/spaces/${spaceId}/conversations`).send(body)
  expect(res.status).toBe(201)
  return res.body.data as { id: string; mode: string; title: string }
}

describe('/api/spaces', () => {
  it('创建后能在列表和详情中读到（TC-01）', async () => {
    const space = await createSpace('  JavaScript  ')
    expect(space.title).toBe('JavaScript')

    const list = await request(app).get('/api/spaces')
    expect(list.status).toBe(200)
    expect(list.body.data.map((s: { id: string }) => s.id)).toEqual([space.id])

    const detail = await request(app).get(`/api/spaces/${space.id}`)
    expect(detail.body.data).toMatchObject({ id: space.id, title: 'JavaScript' })
  })

  it('拒绝空名称与超长名称', async () => {
    for (const title of ['   ', undefined, 123, 'a'.repeat(101)]) {
      const res = await request(app).post('/api/spaces').send({ title })
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
    }
  })

  it('不存在的空间返回 404', async () => {
    const res = await request(app).get('/api/spaces/missing/conversations')
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })

  it('删除空间后其对话与消息一起消失', async () => {
    const space = await createSpace()
    const conv = await createConversation(space.id)
    await request(app).post(`/api/conversations/${conv.id}/messages`).send({ content: '为什么？' })

    const del = await request(app).delete(`/api/spaces/${space.id}`)
    expect(del.status).toBe(200)

    expect((await request(app).get('/api/spaces')).body.data).toEqual([])
    const msgs = await request(app).get(`/api/conversations/${conv.id}/messages`)
    expect(msgs.status).toBe(404)
  })
})

describe('/api/spaces/:id/conversations', () => {
  it('mode 默认 explain，可指定 socratic', async () => {
    const space = await createSpace()
    expect((await createConversation(space.id)).mode).toBe('explain')
    expect((await createConversation(space.id, { mode: 'socratic' })).mode).toBe('socratic')

    const list = await request(app).get(`/api/spaces/${space.id}/conversations`)
    expect(list.body.data).toHaveLength(2)
  })

  it('PATCH 切换模式只影响之后的消息', async () => {
    const space = await createSpace()
    const conv = await createConversation(space.id)
    await request(app).post(`/api/conversations/${conv.id}/messages`).send({ content: 'q1' })

    const patched = await request(app)
      .patch(`/api/conversations/${conv.id}`)
      .send({ mode: 'socratic' })
    expect(patched.status).toBe(200)
    expect(patched.body.data.mode).toBe('socratic')

    await request(app).post(`/api/conversations/${conv.id}/messages`).send({ content: 'q2' })
    const history = await request(app).get(`/api/conversations/${conv.id}/messages`)
    expect(history.body.data.map((m: { mode: string }) => m.mode)).toEqual([
      'explain',
      'explain',
      'socratic',
      'socratic',
    ])

    const bad = await request(app).patch(`/api/conversations/${conv.id}`).send({ mode: 'chat' })
    expect(bad.status).toBe(400)
  })

  it('拒绝非法 mode', async () => {
    const space = await createSpace()
    const res = await request(app)
      .post(`/api/spaces/${space.id}/conversations`)
      .send({ mode: 'chat' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('/api/conversations/:id/messages', () => {
  it('发送后返回问答两条消息，并可从历史中原样读回（TC-12）', async () => {
    const space = await createSpace()
    const conv = await createConversation(space.id, { title: '闭包' })

    const sent = await request(app)
      .post(`/api/conversations/${conv.id}/messages`)
      .send({ content: '为什么闭包能访问外部变量？' })
    expect(sent.status).toBe(201)
    expect(sent.body.data.isMock).toBe(true)
    expect(sent.body.data.userMessage).toMatchObject({ role: 'user', mode: 'explain', kind: 'question' })
    expect(sent.body.data.reply).toMatchObject({ role: 'assistant', mode: 'explain', kind: 'answer' })
    expect(sent.body.data.followUpSuggestions.length).toBeGreaterThan(0)

    const history = await request(app).get(`/api/conversations/${conv.id}/messages`)
    expect(history.body.data.map((m: { kind: string }) => m.kind)).toEqual(['question', 'answer'])
    expect(history.body.data[0].content).toBe('为什么闭包能访问外部变量？')
    expect(history.body.data[1].meta.isMock).toBe(true)
  })

  it('消息 mode 记录发送时对话的模式', async () => {
    const space = await createSpace()
    const conv = await createConversation(space.id, { mode: 'socratic' })
    const sent = await request(app)
      .post(`/api/conversations/${conv.id}/messages`)
      .send({ content: '我想弄懂闭包' })
    expect(sent.body.data.userMessage).toMatchObject({ mode: 'socratic', kind: 'goal' })
    expect(sent.body.data.reply).toMatchObject({ mode: 'socratic', kind: 'probe' })
  })

  it('发消息会把对话和空间顶到列表最前', async () => {
    const space = await createSpace('旧空间')
    const conv = await createConversation(space.id)
    const newer = await createSpace('新空间')
    await new Promise((r) => setTimeout(r, 5))

    await request(app).post(`/api/conversations/${conv.id}/messages`).send({ content: 'q' })
    const list = await request(app).get('/api/spaces')
    expect(list.body.data.map((s: { id: string }) => s.id)).toEqual([space.id, newer.id])
  })

  it('拒绝空消息和超长消息', async () => {
    const space = await createSpace()
    const conv = await createConversation(space.id)
    const empty = await request(app).post(`/api/conversations/${conv.id}/messages`).send({ content: ' ' })
    expect(empty.body.error.code).toBe('INVALID_QUESTION')
    const long = await request(app)
      .post(`/api/conversations/${conv.id}/messages`)
      .send({ content: 'a'.repeat(2001) })
    expect(long.body.error.code).toBe('QUESTION_TOO_LONG')
  })

  it('不存在的对话返回 404', async () => {
    const res = await request(app).post('/api/conversations/missing/messages').send({ content: 'q' })
    expect(res.status).toBe(404)
  })

  it('非法 JSON 返回 400 而不是 500', async () => {
    const res = await request(app)
      .post('/api/spaces')
      .set('Content-Type', 'application/json')
      .send('{bad')
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })
})
