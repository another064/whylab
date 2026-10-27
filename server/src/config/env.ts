import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { config } from 'dotenv'

// 统一从仓库根目录读取 .env，避免 client/ 与 server/ 各放一份配置造成不同步。
const serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
config({ path: resolve(serverRoot, '.env') })

function readPort(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) && parsed > 0 && parsed < 65536 ? parsed : fallback
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: readPort(process.env.PORT, 3001),
  /** 第一阶段固定为 mock：不调用任何外部模型。 */
  aiProvider: process.env.AI_PROVIDER ?? 'mock',
  aiBaseUrl: process.env.AI_BASE_URL ?? 'https://api.openai.com/v1',
  aiApiKey: process.env.AI_API_KEY ?? '',
  aiModel: process.env.AI_MODEL ?? '',
} as const

/** 只有同时配置了 key 和 model 才认为外部模型可用；密钥始终只存在于服务端。 */
export function isAiConfigured(): boolean {
  return env.aiProvider !== 'mock' && env.aiApiKey.length > 0 && env.aiModel.length > 0
}
