import { randomUUID } from 'node:crypto'

import type { DB } from '../client.js'
import type { ConversationMode } from './conversations.js'

export type MessageRole = 'user' | 'assistant'
export type MessageKind =
  | 'question'
  | 'answer'
  | 'restatement'
  | 'goal'
  | 'response'
  | 'probe'
  | 'nudge'
  | 'hint'
  | 'reveal'
  | 'summary'

/** meta_json 的结构：模型结构化输出里非正文的部分。 */
export interface MessageMeta {
  followUpSuggestions?: string[]
  isMock?: boolean
}

export interface Message {
  id: string
  conversationId: string
  role: MessageRole
  mode: ConversationMode
  kind: MessageKind
  roundId: string | null
  content: string
  meta: MessageMeta | null
  createdAt: string
}

interface MessageRow {
  id: string
  conversation_id: string
  role: MessageRole
  mode: ConversationMode
  kind: MessageKind
  round_id: string | null
  content: string
  meta_json: string | null
  created_at: string
}

function parseMeta(raw: string | null): MessageMeta | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as unknown
    return typeof value === 'object' && value !== null ? (value as MessageMeta) : null
  } catch {
    return null
  }
}

function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    mode: row.mode,
    kind: row.kind,
    roundId: row.round_id,
    content: row.content,
    meta: parseMeta(row.meta_json),
    createdAt: row.created_at,
  }
}

export interface CreateMessageInput {
  conversationId: string
  role: MessageRole
  mode: ConversationMode
  kind: MessageKind
  content: string
  roundId?: string | null
  meta?: MessageMeta | null
  createdAt?: string
}

export function createMessageRepository(db: DB) {
  return {
    create(input: CreateMessageInput): Message {
      const row: MessageRow = {
        id: randomUUID(),
        conversation_id: input.conversationId,
        role: input.role,
        mode: input.mode,
        kind: input.kind,
        round_id: input.roundId ?? null,
        content: input.content,
        meta_json: input.meta ? JSON.stringify(input.meta) : null,
        created_at: input.createdAt ?? new Date().toISOString(),
      }
      db.prepare(
        `INSERT INTO messages (id, conversation_id, role, mode, kind, round_id, content, meta_json, created_at)
         VALUES (@id, @conversation_id, @role, @mode, @kind, @round_id, @content, @meta_json, @created_at)`,
      ).run(row)
      return toMessage(row)
    },

    /** 按发送顺序返回；同一毫秒写入的问答靠 rowid 保证先问后答。 */
    listByConversation(conversationId: string, limit = 200): Message[] {
      const rows = db
        .prepare(
          `SELECT * FROM (
             SELECT rowid AS seq, * FROM messages WHERE conversation_id = ?
             ORDER BY created_at DESC, seq DESC LIMIT ?
           ) ORDER BY created_at ASC, seq ASC`,
        )
        .all(conversationId, limit) as MessageRow[]
      return rows.map(toMessage)
    },

    delete(id: string): boolean {
      return db.prepare('DELETE FROM messages WHERE id = ?').run(id).changes > 0
    },
  }
}
