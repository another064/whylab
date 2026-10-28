import express from 'express'
import type { Express } from 'express'

import type { DB } from './db/client.js'
import { createRepositories } from './db/repositories/index.js'
import { errorHandler, notFoundHandler } from './middleware/error-handler.js'
import { chatRouter } from './routes/chat.js'
import { createConversationsRouter } from './routes/conversations.js'
import { healthRouter } from './routes/health.js'
import { createSpacesRouter } from './routes/spaces.js'

/**
 * 只负责组装应用，不监听端口、不打开数据库。
 * 数据库连接由调用方注入：server.ts 传文件库，测试传内存库。
 */
export function createApp(db: DB): Express {
  const app = express()
  const repos = createRepositories(db)

  app.disable('x-powered-by')
  app.use(express.json({ limit: '1mb' }))

  app.use('/api', healthRouter)
  app.use('/api', chatRouter)
  app.use('/api', createSpacesRouter(repos))
  app.use('/api', createConversationsRouter(repos))

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
