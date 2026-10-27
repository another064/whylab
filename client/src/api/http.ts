/**
 * 统一的 API 请求层。
 *
 * 约定：后端所有接口都返回 { success, data } 或 { success, error } 信封结构，
 * 前端只在这里处理 HTTP 状态码与信封解包，页面和 store 拿到的是纯业务数据。
 */

interface SuccessEnvelope<T> {
  success: true
  data: T
}

interface FailureEnvelope {
  success: false
  error: {
    code: string
    message: string
  }
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(message: string, status: number, code = 'UNKNOWN_ERROR') {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

function isFailureEnvelope(value: unknown): value is FailureEnvelope {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as { success?: unknown; error?: unknown }
  if (candidate.success !== false) return false
  const error = candidate.error as { code?: unknown; message?: unknown } | undefined
  return typeof error?.message === 'string'
}

/**
 * 发送请求并解包 data 字段。
 * 网络错误、非 2xx 响应、success:false 都会被转换成 ApiError，便于页面统一提示。
 */
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response

  try {
    response = await fetch(path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers as Record<string, string> | undefined),
      },
    })
  } catch {
    throw new ApiError('无法连接到后端服务，请确认 server 是否已启动。', 0, 'NETWORK_ERROR')
  }

  const raw = await response.text()
  let payload: unknown = null

  if (raw) {
    try {
      payload = JSON.parse(raw) as unknown
    } catch {
      throw new ApiError('后端返回了无法解析的内容。', response.status, 'INVALID_RESPONSE')
    }
  }

  if (!response.ok || isFailureEnvelope(payload)) {
    if (isFailureEnvelope(payload)) {
      throw new ApiError(payload.error.message, response.status, payload.error.code)
    }
    throw new ApiError(`请求失败（HTTP ${response.status}）。`, response.status)
  }

  return (payload as SuccessEnvelope<T>).data
}
