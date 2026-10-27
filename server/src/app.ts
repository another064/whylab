import express from 'express'
import type { Express } from 'express'

import { errorHandler, notFoundHandler } from './middleware/error-handler.js'
import { chatRouter } from './routes/chat.js'
import { healthRouter } from './routes/health.js'

/**
 * 只负责组装应用，不监听端口。
 * 这样测试可以直接把 app 交给 supertest，不需要真实占用端口。
 */
export function createApp(): Express {
  const app = express()

  app.disable('x-powered-by')
  app.use(express.json({ limit: '1mb' }))

  app.use('/api', healthRouter)
  app.use('/api', chatRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
