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

describe('未知路由', () => {
  it('旧的 POST /api/chat 已移除', async () => {
    const response = await request(app).post('/api/chat').send({ question: 'q' })

    expect(response.status).toBe(404)
  })

  it('返回 JSON 格式的 404，而不是 HTML 页面', async () => {
    const response = await request(app).get('/api/not-exist')

    expect(response.status).toBe(404)
    expect(response.headers['content-type']).toMatch(/application\/json/)
    expect(response.body.error.code).toBe('NOT_FOUND')
  })
})
