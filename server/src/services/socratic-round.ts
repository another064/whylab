import { HttpError, validationError } from '../http/errors.js'

/**
 * 追问轮次状态机（纯函数，不碰数据库和模型）：
 * 目标 → 诊断提问（第 1 层）→ 作答 → 下一层追问 … → 小结。
 * 提示不增加层数；每一层结束时提示级别清零。
 */

export const DEFAULT_MAX_DEPTH = 6

export const HINT_LEVEL = { nudge: 1, hint: 2, reveal: 3 } as const
export type HintLevel = (typeof HINT_LEVEL)[keyof typeof HINT_LEVEL]

export type RoundStatus = 'active' | 'completed' | 'abandoned'

export interface RoundState {
  depth: number
  maxDepth: number
  hintLevel: number
  status: RoundStatus
}

export function roundNotActive(): HttpError {
  return new HttpError(409, 'ROUND_NOT_ACTIVE', '这一轮追问已经结束或发生了变化，请刷新后再试。')
}

function assertActive(state: RoundState): void {
  if (state.status !== 'active') throw roundNotActive()
}

export function startRound(maxDepth = DEFAULT_MAX_DEPTH): RoundState {
  return { depth: 1, maxDepth, hintLevel: 0, status: 'active' }
}

/** 一步走完之后下一步做什么。到达最大层数时不再追问，由小结给出讲解。 */
export function nextAfterAnswer(state: RoundState, goalReached: boolean): 'probe' | 'summary' {
  assertActive(state)
  return goalReached || state.depth >= state.maxDepth ? 'summary' : 'probe'
}

export function advance(state: RoundState): RoundState {
  assertActive(state)
  if (state.depth >= state.maxDepth) throw roundNotActive()
  return { ...state, depth: state.depth + 1, hintLevel: 0 }
}

export function applyHint(state: RoundState, level: HintLevel): RoundState {
  assertActive(state)
  if (level <= state.hintLevel) throw validationError('这一级提示已经用过了。')
  return { ...state, hintLevel: level }
}

export function complete(state: RoundState): RoundState {
  assertActive(state)
  return { ...state, status: 'completed' }
}
