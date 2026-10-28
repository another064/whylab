import { randomUUID } from 'node:crypto'

import type { DB } from '../client.js'

export interface LearningSpace {
  id: string
  userId: string
  title: string
  description: string | null
  createdAt: string
  updatedAt: string
}

interface SpaceRow {
  id: string
  user_id: string
  title: string
  description: string | null
  created_at: string
  updated_at: string
}

function toSpace(row: SpaceRow): LearningSpace {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function createSpaceRepository(db: DB) {
  return {
    create(input: { userId: string; title: string; description?: string | null }): LearningSpace {
      const now = new Date().toISOString()
      const row: SpaceRow = {
        id: randomUUID(),
        user_id: input.userId,
        title: input.title,
        description: input.description ?? null,
        created_at: now,
        updated_at: now,
      }
      db.prepare(
        `INSERT INTO learning_spaces (id, user_id, title, description, created_at, updated_at)
         VALUES (@id, @user_id, @title, @description, @created_at, @updated_at)`,
      ).run(row)
      return toSpace(row)
    },

    findById(id: string): LearningSpace | null {
      const row = db.prepare('SELECT * FROM learning_spaces WHERE id = ?').get(id) as
        | SpaceRow
        | undefined
      return row ? toSpace(row) : null
    },

    listByUser(userId: string): LearningSpace[] {
      const rows = db
        .prepare(
          'SELECT * FROM learning_spaces WHERE user_id = ? ORDER BY updated_at DESC, rowid DESC',
        )
        .all(userId) as SpaceRow[]
      return rows.map(toSpace)
    },

    touch(id: string, at = new Date().toISOString()): void {
      db.prepare('UPDATE learning_spaces SET updated_at = ? WHERE id = ?').run(at, id)
    },

    /** 依赖外键级联：对话、消息、追问轮次一并删除。 */
    delete(id: string): boolean {
      return db.prepare('DELETE FROM learning_spaces WHERE id = ?').run(id).changes > 0
    },
  }
}
