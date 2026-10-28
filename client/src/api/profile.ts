/**
 * Thinking profile ("我的思维") API.
 * MOCK: backed by src/mocks/fixtures.ts until these endpoints exist:
 *   GET    /api/profile/patterns
 *   PATCH  /api/profile/patterns/:id   { status | statement }
 *   PATCH  /api/profile/settings       { enabled }
 *   DELETE /api/profile
 */
import { masteredConcepts, mockDelay, patterns } from '@/mocks/fixtures'

export type PatternCategory =
  | 'questioning'
  | 'misconception'
  | 'reasoning_gap'
  | 'effective_strategy'
  | 'mastered'

/** `maybe_overcome` is a UI grouping of archived-candidate patterns. */
export type PatternStatus = 'proposed' | 'confirmed' | 'rejected' | 'archived' | 'maybe_overcome'

export const CATEGORY_LABEL: Record<PatternCategory, string> = {
  questioning: '追问习惯',
  misconception: '容易混淆',
  reasoning_gap: '常卡住的地方',
  effective_strategy: '对你有效的讲法',
  mastered: '已经能讲清的',
}

export interface Pattern {
  id: string
  category: PatternCategory
  statement: string
  evidence: string[]
  evidenceSource: string
  /** what changes once confirmed / how it is being used */
  effect: string
  status: PatternStatus
  evidenceCount: number
}

export interface Profile {
  enabled: boolean
  patterns: Pattern[]
  mastered: string[]
  isMock: boolean
}

let enabled = true

export async function fetchProfile(): Promise<Profile> {
  return mockDelay({ enabled, patterns, mastered: masteredConcepts, isMock: true })
}

export async function setPatternStatus(id: string, status: PatternStatus): Promise<void> {
  const target = patterns.find((p) => p.id === id)
  if (target) target.status = status
  return mockDelay(undefined, 150)
}

export async function updatePatternStatement(id: string, statement: string): Promise<void> {
  const target = patterns.find((p) => p.id === id)
  if (target) target.statement = statement
  return mockDelay(undefined, 150)
}

export async function setProfileEnabled(value: boolean): Promise<void> {
  enabled = value
  return mockDelay(undefined, 150)
}

export async function clearProfile(): Promise<void> {
  patterns.splice(0, patterns.length)
  return mockDelay(undefined, 200)
}
