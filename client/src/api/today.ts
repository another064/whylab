/**
 * Today summary API.
 * MOCK until GET /api/today exists (greeting name, due recall count,
 * the unfinished socratic round, one pattern awaiting confirmation).
 */
import { mockDelay, patterns, reviewQueue } from '@/mocks/fixtures'
import type { Pattern } from '@/api/profile'
import type { ReviewItem } from '@/api/review'

export interface OpenRound {
  goal: string
  depth: number
  maxDepth: number
  waitingQuestion: string
  updatedLabel: string
  /** null until the round lives in a real conversation */
  conversation: { spaceId: string; id: string } | null
}

export interface TodaySummary {
  displayName: string
  reviewDue: number
  reviewDone: number
  reviewMinutes: number
  reviewPreview: ReviewItem[]
  openRound: OpenRound | null
  noticed: Pattern | null
  isMock: boolean
}

export async function fetchToday(): Promise<TodaySummary> {
  return mockDelay({
    displayName: '安娜',
    reviewDue: reviewQueue.length,
    reviewDone: 0,
    reviewMinutes: 12,
    reviewPreview: reviewQueue.slice(0, 3),
    openRound: {
      goal: '弄懂事件循环里，微任务为什么比定时器先执行',
      depth: 3,
      maxDepth: 6,
      waitingQuestion: '当前这段同步代码执行完，引擎会先去哪里看看有没有要做的事？',
      updatedLabel: '昨天 21:40',
      conversation: null,
    },
    noticed: patterns.find((p) => p.status === 'proposed') ?? null,
    isMock: true,
  })
}

/** "晚上好" etc. by local hour. */
export function greetingFor(date = new Date()): string {
  const h = date.getHours()
  if (h < 5) return '夜深了'
  if (h < 11) return '早上好'
  if (h < 13) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

export function formatToday(date = new Date()): string {
  const week = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()]
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日 · 周${week}`
}
