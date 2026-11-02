/**
 * Inquiry extras that the conversation endpoints don't cover yet.
 * MOCK until these exist:
 *   POST /api/conversations/:id/restatements   (stored as an `understanding` node)
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

export async function fetchDependencies(_conversationId: string): Promise<Dependency[]> {
  return mockDelay([
    { title: '词法作用域', state: 'mastered' },
    { title: '垃圾回收的可达性', state: 'missing' },
    { title: '执行上下文', state: 'learned' },
  ])
}
