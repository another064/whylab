import type { NextFunction, Request, Response } from 'express'

/** 未命中任何路由时，返回与业务接口一致的 JSON 信封，而不是 Express 默认 HTML。 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `接口不存在：${req.method} ${req.originalUrl}`,
    },
  })
}

/** 兜底错误处理：内部细节只写日志，响应里只给可读信息。 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error('[whylab] unhandled error:', error)

  if (res.headersSent) return

  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: '服务端出现异常，请稍后重试。' },
  })
}
