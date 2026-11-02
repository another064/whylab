import { describe, expect, it } from 'vitest'

import {
  HINT_LEVEL,
  advance,
  applyHint,
  complete,
  nextAfterAnswer,
  startRound,
  type RoundState,
} from './socratic-round.js'

const at = (depth: number, extra: Partial<RoundState> = {}): RoundState => ({
  ...startRound(),
  depth,
  ...extra,
})

describe('startRound', () => {
  it('诊断问题算第 1 层，默认最多 6 层', () => {
    expect(startRound()).toEqual({ depth: 1, maxDepth: 6, hintLevel: 0, status: 'active' })
    expect(startRound(3).maxDepth).toBe(3)
  })
})

describe('nextAfterAnswer', () => {
  it('没到上限且目标未达成：继续追问', () => {
    expect(nextAfterAnswer(at(1), false)).toBe('probe')
    expect(nextAfterAnswer(at(5), false)).toBe('probe')
  })

  it('目标达成：小结', () => {
    expect(nextAfterAnswer(at(2), true)).toBe('summary')
  })

  it('到达最大层数：无论是否达成都小结，不会有第 7 问（TC-17）', () => {
    expect(nextAfterAnswer(at(6), false)).toBe('summary')
  })

  it('轮次已结束时拒绝', () => {
    expect(() => nextAfterAnswer(complete(at(2)), false)).toThrow(
      expect.objectContaining({ code: 'ROUND_NOT_ACTIVE' }),
    )
  })
})

describe('advance', () => {
  it('层数加一，提示级别清零', () => {
    expect(advance(at(2, { hintLevel: 2 }))).toMatchObject({ depth: 3, hintLevel: 0 })
  })

  it('不能越过最大层数', () => {
    expect(() => advance(at(6))).toThrow(expect.objectContaining({ code: 'ROUND_NOT_ACTIVE' }))
  })
})

describe('applyHint', () => {
  it('提示逐级加强，不增加层数', () => {
    const once = applyHint(at(2), HINT_LEVEL.nudge)
    expect(once).toMatchObject({ depth: 2, hintLevel: 1 })
    expect(applyHint(once, HINT_LEVEL.hint).hintLevel).toBe(2)
  })

  it('“直接告诉我”随时可用，可以跳过前两级', () => {
    expect(applyHint(at(2), HINT_LEVEL.reveal).hintLevel).toBe(3)
  })

  it('不能重复或回退到已用过的级别', () => {
    const state = applyHint(at(2), HINT_LEVEL.hint)
    expect(() => applyHint(state, HINT_LEVEL.nudge)).toThrow(
      expect.objectContaining({ code: 'VALIDATION_ERROR' }),
    )
    expect(() => applyHint(state, HINT_LEVEL.hint)).toThrow(
      expect.objectContaining({ code: 'VALIDATION_ERROR' }),
    )
  })

  it('轮次已结束时拒绝', () => {
    expect(() => applyHint(complete(at(2)), HINT_LEVEL.nudge)).toThrow(
      expect.objectContaining({ code: 'ROUND_NOT_ACTIVE' }),
    )
  })
})

describe('complete', () => {
  it('把轮次标记为已完成，不能重复结束', () => {
    const done = complete(at(3))
    expect(done.status).toBe('completed')
    expect(() => complete(done)).toThrow(expect.objectContaining({ code: 'ROUND_NOT_ACTIVE' }))
  })
})
