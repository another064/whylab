import express from 'express'
import type { Express } from 'express'

import type { DB } from './db/client.js'
import { createRepositories } from './db/repositories/index.js'
import { errorHandler, notFoundHandler } from './middleware/error-handler.js'
import { createConversationsRouter } from './routes/conversations.js'
import { healthRouter } from './routes/health.js'
import { createSpacesRouter } from './routes/spaces.js'
import { createModelFromEnv, type ChatModel } from './services/ai/model.js'

/**
 * 只负责组装应用，不监听端口、不打开数据库。
 * 数据库连接由调用方注入：server.ts 传文件库，测试传内存库。
 * 模型同理，默认按环境变量创建，未配置时为 null（走 mock）。
 */
export function createApp(db: DB, model: ChatModel | null = createModelFromEnv()): Express {
  const app = express()
  const repos = createRepositories(db)

  app.disable('x-powered-by')
  app.use(express.json({ limit: '1mb' }))

  app.use('/api', healthRouter)
  app.use('/api', createSpacesRouter(repos))
  app.use('/api', createConversationsRouter(repos, model))

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
