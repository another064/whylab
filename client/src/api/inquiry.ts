/**
 * Inquiry extras that the conversation endpoints don't cover yet.
 * MOCK until these exist:
 *   POST /api/conversations/:id/restatements   (stored as an `understanding` node)
 *   POST /api/conversations/:id/hints          { level: 1|2|3 }
 *   GET  /api/conversations/:id/dependencies   (joined with profile "mastered")
 */
import { mockDelay } from '@/mocks/fixtures'

export type HintLevel = 1 | 2 | 3

export const HINT_LABEL: Record<HintLevel, string> = {
  1: '给个方向',
  2: '给条线索',
  3: '直接告诉我这一步',
}

export interface Dependency {
  title: string
  state: 'mastered' | 'learned' | 'missing'
}

export async function saveRestatement(
  _conversationId: string,
  text: string,
): Promise<{ id: string; text: string; isMock: boolean }> {
  return mockDelay({ id: `u-${Date.now()}`, text, isMock: true }, 300)
}

export async function requestHint(_conversationId: string, level: HintLevel): Promise<string> {
  const text: Record<HintLevel, string> = {
    1: '想想这一步的设计目的：它希望“当前任务一结束就立刻处理”，还是“等有空再说”？',
    2: '线索：把你上一步说出的结论当作前提，再往下推一层，会遇到什么新问题？',
    3: '这一步的答案：先处理优先级高的那一类，再处理其余的。WhyLab 会记下你在这一步需要了帮助。',
  }
  return mockDelay(text[level], 300)
}

export async function fetchDependencies(_conversationId: string): Promise<Dependency[]> {
  return mockDelay([
    { title: '词法作用域', state: 'mastered' },
    { title: '垃圾回收的可达性', state: 'missing' },
    { title: '执行上下文', state: 'learned' },
  ])
}

export const PROMPTED_FOLLOW_UP = '什么情况下这个结论会不成立？'
