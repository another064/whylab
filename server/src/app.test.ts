import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { createApp } from './app.js'
import { createTestDatabase } from './test/helpers.js'

const app = createApp(createTestDatabase())

describe('GET /api/health', () => {
  it('返回约定的成功结构', async () => {
    const response = await request(app).get('/api/health')

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      success: true,
      message: 'WhyLab API is running',
    })
    expect(response.body.data.status).toBe('ok')
    expect(typeof response.body.data.uptimeSeconds).toBe('number')
    expect(typeof response.body.data.timestamp).toBe('string')
  })

  it('声明为 JSON 响应', async () => {
    const response = await request(app).get('/api/health')

    expect(response.headers['content-type']).toMatch(/application\/json/)
  })
})

describe('POST /api/chat', () => {
  it('接受合法问题并返回明确标记的模拟解释', async () => {
    const response = await request(app)
      .post('/api/chat')
      .send({ question: '为什么闭包能访问外部函数的变量？' })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.isMock).toBe(true)
    expect(response.body.data.answer).toContain('闭包')
    expect(response.body.data.followUpSuggestions.length).toBeGreaterThan(0)
  })

  it('拒绝空问题并给出可读错误码', async () => {
    const response = await request(app).post('/api/chat').send({ question: '   ' })

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
    expect(response.body.error.code).toBe('INVALID_QUESTION')
  })

  it('拒绝超长问题', async () => {
    const response = await request(app)
      .post('/api/chat')
      .send({ question: 'a'.repeat(2001) })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('QUESTION_TOO_LONG')
  })
})

describe('未知路由', () => {
  it('返回 JSON 格式的 404，而不是 HTML 页面', async () => {
    const response = await request(app).get('/api/not-exist')

    expect(response.status).toBe(404)
    expect(response.headers['content-type']).toMatch(/application\/json/)
    expect(response.body.error.code).toBe('NOT_FOUND')
  })
})
