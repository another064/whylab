import { randomUUID } from 'node:crypto'

import type { DB } from '../client.js'

export const CONVERSATION_MODES = ['explain', 'socratic'] as const
export type ConversationMode = (typeof CONVERSATION_MODES)[number]

export function isConversationMode(value: unknown): value is ConversationMode {
  return typeof value === 'string' && (CONVERSATION_MODES as readonly string[]).includes(value)
}

export interface Conversation {
  id: string
  spaceId: string
  title: string
  mode: ConversationMode
  endedAt: string | null
  createdAt: string
  updatedAt: string
}

interface ConversationRow {
  id: string
  space_id: string
  title: string
  mode: ConversationMode
  ended_at: string | null
  profiled_at: string | null
  created_at: string
  updated_at: string
}

function toConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    spaceId: row.space_id,
    title: row.title,
    mode: row.mode,
    endedAt: row.ended_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function createConversationRepository(db: DB) {
  return {
    create(input: { spaceId: string; title: string; mode?: ConversationMode }): Conversation {
      const now = new Date().toISOString()
      const row: ConversationRow = {
        id: randomUUID(),
        space_id: input.spaceId,
        title: input.title,
        mode: input.mode ?? 'explain',
        ended_at: null,
        profiled_at: null,
        created_at: now,
        updated_at: now,
      }
      db.prepare(
        `INSERT INTO conversations (id, space_id, title, mode, created_at, updated_at)
         VALUES (@id, @space_id, @title, @mode, @created_at, @updated_at)`,
      ).run(row)
      return toConversation(row)
    },

    findById(id: string): Conversation | null {
      const row = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as
        | ConversationRow
        | undefined
      return row ? toConversation(row) : null
    },

    listBySpace(spaceId: string): Conversation[] {
      const rows = db
        .prepare(
          'SELECT * FROM conversations WHERE space_id = ? ORDER BY updated_at DESC, rowid DESC',
        )
        .all(spaceId) as ConversationRow[]
      return rows.map(toConversation)
    },

    /** 只改传入的字段；切换 mode 不影响历史消息（消息自带发送时的 mode）。 */
    update(id: string, input: { title?: string; mode?: ConversationMode }): Conversation | null {
      const now = new Date().toISOString()
      db.prepare(
        `UPDATE conversations
         SET title = COALESCE(@title, title), mode = COALESCE(@mode, mode), updated_at = @now
         WHERE id = @id`,
      ).run({ id, title: input.title ?? null, mode: input.mode ?? null, now })
      return this.findById(id)
    },

    touch(id: string, at = new Date().toISOString()): void {
      db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(at, id)
    },

    delete(id: string): boolean {
      return db.prepare('DELETE FROM conversations WHERE id = ?').run(id).changes > 0
    },
  }
}
