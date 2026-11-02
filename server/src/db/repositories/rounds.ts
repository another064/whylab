import { randomUUID } from 'node:crypto'

import type { RoundState, RoundStatus } from '../../services/socratic-round.js'
import type { DB } from '../client.js'

export interface RoundSummary {
  userInsights: string[]
  stuckAt: string[]
  conclusion: string
}

export interface Round extends RoundState {
  id: string
  conversationId: string
  goal: string
  summary: RoundSummary | null
  startedAt: string
  endedAt: string | null
}

interface RoundRow {
  id: string
  conversation_id: string
  goal: string
  depth: number
  max_depth: number
  hint_level: number
  status: RoundStatus
  summary_json: string | null
  started_at: string
  ended_at: string | null
}

function toRound(row: RoundRow): Round {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    goal: row.goal,
    depth: row.depth,
    maxDepth: row.max_depth,
    hintLevel: row.hint_level,
    status: row.status,
    summary: row.summary_json ? (JSON.parse(row.summary_json) as RoundSummary) : null,
    startedAt: row.started_at,
    endedAt: row.ended_at,
  }
}

export function createRoundRepository(db: DB) {
  return {
    create(input: { conversationId: string; goal: string; state: RoundState }): Round {
      const id = randomUUID()
      db.prepare(
        `INSERT INTO socratic_rounds (id, conversation_id, goal, depth, max_depth, hint_level, status, started_at)
         VALUES (@id, @conversationId, @goal, @depth, @maxDepth, @hintLevel, @status, @startedAt)`,
      ).run({
        id,
        conversationId: input.conversationId,
        goal: input.goal,
        depth: input.state.depth,
        maxDepth: input.state.maxDepth,
        hintLevel: input.state.hintLevel,
        status: input.state.status,
        startedAt: new Date().toISOString(),
      })
      return this.findById(id) as Round
    },

    findById(id: string): Round | null {
      const row = db.prepare('SELECT * FROM socratic_rounds WHERE id = ?').get(id) as
        | RoundRow
        | undefined
      return row ? toRound(row) : null
    },

    findActive(conversationId: string): Round | null {
      const row = db
        .prepare("SELECT * FROM socratic_rounds WHERE conversation_id = ? AND status = 'active'")
        .get(conversationId) as RoundRow | undefined
      return row ? toRound(row) : null
    },

    /** 最近一轮，无论是否结束；页面据此显示进行中的轮次或上一轮小结。 */
    findLatest(conversationId: string): Round | null {
      const row = db
        .prepare(
          'SELECT * FROM socratic_rounds WHERE conversation_id = ? ORDER BY started_at DESC, rowid DESC LIMIT 1',
        )
        .get(conversationId) as RoundRow | undefined
      return row ? toRound(row) : null
    },

    update(id: string, state: RoundState, summary: RoundSummary | null = null): Round {
      db.prepare(
        `UPDATE socratic_rounds
         SET depth = @depth, hint_level = @hintLevel, status = @status,
             summary_json = COALESCE(@summaryJson, summary_json),
             ended_at = CASE WHEN @status = 'active' THEN NULL ELSE @now END
         WHERE id = @id`,
      ).run({
        id,
        depth: state.depth,
        hintLevel: state.hintLevel,
        status: state.status,
        summaryJson: summary ? JSON.stringify(summary) : null,
        now: new Date().toISOString(),
      })
      return this.findById(id) as Round
    },
  }
}
