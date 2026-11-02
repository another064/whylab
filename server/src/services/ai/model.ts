import { env, isAiConfigured } from '../../config/env.js'
import { HttpError } from '../../http/errors.js'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** 业务代码只依赖这个接口，测试里换成假实现，绝不碰真实服务。 */
export interface ChatModel {
  completeJson(messages: ChatMessage[]): Promise<string>
}

/** 模型回了内容但不可用（截断、为空、结构不对），可以重试。 */
export class ModelOutputError extends Error {}

export function aiUnavailable(): HttpError {
  return new HttpError(502, 'AI_UNAVAILABLE', '模型服务暂时不可用，请稍后重试。')
}

export function aiInvalidOutput(): HttpError {
  return new HttpError(502, 'AI_INVALID_OUTPUT', '模型这次的回答不完整，请重试。')
}

interface OpenAiCompatibleOptions {
  baseUrl: string
  apiKey: string
  model: string
  timeoutMs: number
  fetchImpl?: typeof fetch
}

// 思考内容也占输出额度，留得太少会被截断成 finish_reason = length。
const MAX_OUTPUT_TOKENS = 4000

export function createOpenAiCompatibleModel(options: OpenAiCompatibleOptions): ChatModel {
  const fetchImpl = options.fetchImpl ?? fetch
  const url = `${options.baseUrl.replace(/\/+$/, '')}/chat/completions`

  return {
    async completeJson(messages) {
      let response: Response
      try {
        response = await fetchImpl(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${options.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: options.model,
            messages,
            max_tokens: MAX_OUTPUT_TOKENS,
            response_format: { type: 'json_object' },
          }),
          signal: AbortSignal.timeout(options.timeoutMs),
        })
      } catch (error) {
        console.error('[whylab] model request failed:', (error as Error).name)
        throw aiUnavailable()
      }

      if (!response.ok) {
        console.error('[whylab] model responded with HTTP', response.status)
        throw aiUnavailable()
      }

      let payload: { choices?: { message?: { content?: unknown }; finish_reason?: unknown }[] }
      try {
        payload = (await response.json()) as typeof payload
      } catch {
        throw aiUnavailable()
      }

      const choice = payload.choices?.[0]
      const content = choice?.message?.content
      if (choice?.finish_reason === 'length' || typeof content !== 'string' || !content.trim()) {
        throw new ModelOutputError('empty or truncated output')
      }
      return content
    },
  }
}

/** 未配置时返回 null，调用方走 mock 并标记 isMock。 */
export function createModelFromEnv(): ChatModel | null {
  if (!isAiConfigured()) return null
  return createOpenAiCompatibleModel({
    baseUrl: env.aiBaseUrl,
    apiKey: env.aiApiKey,
    model: env.aiModel,
    timeoutMs: env.aiTimeoutMs,
  })
}
