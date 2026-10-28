/**
 * Recall (review) API.
 * MOCK: backed by src/mocks/fixtures.ts until these endpoints exist:
 *   GET  /api/review/queue
 *   GET  /api/review-items/:id/interval-preview
 *   POST /api/review-items/:id/attempts
 */
import { mockDelay, patterns, reviewQueue } from '@/mocks/fixtures'

export type Performance = 'again' | 'hard' | 'good' | 'easy'
export type Confidence = 'low' | 'medium' | 'high'

export const PERFORMANCE_LABEL: Record<Performance, string> = {
  again: '想不起来',
  hard: '勉强想起',
  good: '讲清楚了',
  easy: '很轻松',
}

/** Short form used in "上次 · 勉强" lines. */
export const PERFORMANCE_SHORT: Record<Performance, string> = {
  again: '没想起',
  hard: '勉强',
  good: '记得',
  easy: '轻松',
}

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  low: '没底',
  medium: '有点把握',
  high: '很确定',
}

export interface ReviewItem {
  id: string
  spaceTitle: string
  prompt: string
  attemptCount: number
  lastPerformance: Performance | null
  lastReviewedLabel: string | null
}

/** Next interval per rating, in days (0 = tomorrow-ish "明天再见"). */
export type IntervalPreview = Record<Performance, number>

export interface MatchedPattern {
  patternId: string
  title: string
  body: string
  /** the bolded phrase inside body */
  emphasis: string
}

export interface AttemptFeedback {
  correctPoints: string[]
  missingPoints: string[]
  matchedPatterns: MatchedPattern[]
  suggestedPerformance: Performance
  referenceAnswer: string
  isMock: boolean
}

export async function fetchReviewQueue(): Promise<{ items: ReviewItem[]; isMock: boolean }> {
  return mockDelay({ items: reviewQueue, isMock: true })
}

export async function fetchIntervalPreview(_itemId: string): Promise<IntervalPreview> {
  return mockDelay({ again: 1, hard: 2, good: 5, easy: 12 }, 120)
}

export async function submitAttempt(
  itemId: string,
  _input: { answer: string; confidence: Confidence | null },
): Promise<AttemptFeedback> {
  const isClosure = itemId === 'ri-closure'
  const pattern = patterns.find((p) => p.id === 'p-stored-in-fn')
  return mockDelay(
    {
      correctPoints: isClosure
        ? ['内部函数在定义时就确定了能访问的作用域（词法作用域）', '外部函数返回后变量仍然可用']
        : ['抓住了核心结论'],
      missingPoints: isClosure
        ? ['变量没被“存进函数里”，而是整个环境因为还被引用，垃圾回收不会回收它']
        : ['还可以补上一个具体例子，把推导走一遍'],
      matchedPatterns:
        isClosure && pattern
          ? [
              {
                patternId: pattern.id,
                title: '这个说法你之前也用过',
                body: '“变量存在函数里面”——上周讲 this 时你也这么说过。值得想想：函数里存的是对环境的引用，还是变量本身？',
                emphasis: '对环境的引用',
              },
            ]
          : [],
      suggestedPerformance: 'hard',
      referenceAnswer:
        '内部函数创建时会记住自己所在的词法环境。只要内部函数还被引用，这个环境就可达，垃圾回收不会回收它，所以外部函数返回后变量仍然可以被读到。',
      isMock: true,
    },
    600,
  )
}

export async function rateAttempt(_itemId: string, _performance: Performance): Promise<void> {
  return mockDelay(undefined, 120)
}

/** "明天再见" / "2 天后" */
export function formatInterval(days: number): string {
  return days <= 1 ? '明天再见' : `${days} 天后`
}
