import { validationError } from './errors.js'

interface StringRule {
  label: string
  max: number
  required?: boolean
}

/**
 * 读取并 trim 一个字符串字段。
 * 缺省/空串：required 时报错，否则返回 null；非字符串一律报错。
 */
export function readString(value: unknown, rule: StringRule): string | null {
  if (value === undefined || value === null) {
    if (rule.required) throw validationError(`${rule.label}不能为空。`)
    return null
  }
  if (typeof value !== 'string') throw validationError(`${rule.label}必须是字符串。`)

  const trimmed = value.trim()
  if (!trimmed) {
    if (rule.required) throw validationError(`${rule.label}不能为空。`)
    return null
  }
  if (trimmed.length > rule.max) {
    throw validationError(`${rule.label}长度不能超过 ${rule.max} 个字符。`)
  }
  return trimmed
}

export function readBody(body: unknown): Record<string, unknown> {
  return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {}
}
