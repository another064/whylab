/**
 * Knowledge library API.
 * MOCK: backed by src/mocks/fixtures.ts until these endpoints exist:
 *   GET /api/spaces/:spaceId/nodes?type=&q=&missingUnderstanding=1
 *   GET /api/nodes/:id
 */
import type { Performance } from '@/api/review'
import { mockDelay, nodes, recentNodes } from '@/mocks/fixtures'

export type NodeKind = 'question' | 'explanation' | 'understanding'

export const NODE_KIND_LABEL: Record<NodeKind, string> = {
  question: '问题',
  explanation: '解释',
  understanding: '我的理解',
}

/** A single node shown as a card (Today's "最近沉淀"). */
export interface NodeSummary {
  id: string
  kind: NodeKind
  text: string
  spaceTitle: string
  when: string
}

/** A question node with its explanation and understanding counts (library list). */
export interface NodeListItem {
  id: string
  spaceId: string
  spaceTitle: string
  question: string
  explanationCount: number
  understandingCount: number
  reviewCount: number
  activeRound: { depth: number; maxDepth: number } | null
  updatedLabel: string
}

export interface NodeDetail extends NodeListItem {
  understanding: { text: string; source: string } | null
  explanation: string | null
  extraExplanations: number
  /** joined with the profile's "mastered concepts" */
  dependsOn: { title: string; mastered: boolean }[]
  reviewHistory: Performance[]
  nextReviewLabel: string | null
}

export interface NodeFilter {
  spaceTitle?: string | null
  q?: string
  missingUnderstanding?: boolean
}

export async function fetchNodes(
  filter: NodeFilter = {},
): Promise<{ items: NodeListItem[]; isMock: boolean }> {
  const q = filter.q?.trim().toLowerCase() ?? ''
  const items = nodes.filter(
    (n) =>
      (!filter.spaceTitle || n.spaceTitle === filter.spaceTitle) &&
      (!filter.missingUnderstanding || n.understandingCount === 0) &&
      (!q ||
        n.question.toLowerCase().includes(q) ||
        (n.explanation ?? '').toLowerCase().includes(q) ||
        (n.understanding?.text ?? '').toLowerCase().includes(q)),
  )
  return mockDelay({ items, isMock: true })
}

export async function fetchNode(id: string): Promise<NodeDetail | null> {
  return mockDelay(nodes.find((n) => n.id === id) ?? null, 140)
}

export async function fetchSpaceCounts(): Promise<{ spaceTitle: string; count: number }[]> {
  const counts = new Map<string, number>()
  for (const n of nodes) counts.set(n.spaceTitle, (counts.get(n.spaceTitle) ?? 0) + 1)
  return mockDelay([...counts].map(([spaceTitle, count]) => ({ spaceTitle, count })), 80)
}

export async function fetchRecentNodes(): Promise<NodeSummary[]> {
  return mockDelay(recentNodes)
}
