import { Router } from 'express'
import type { Request, Response } from 'express'

const startedAt = Date.now()

export const healthRouter = Router()

/**
 * GET /api/health
 * 最小健康检查：证明 Express 已启动、路由可用，并附带进程运行时长。
 */
healthRouter.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'WhyLab API is running',
    data: {
      status: 'ok',
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString(),
    },
  })
})
