import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createTestDatabase } from '../test/helpers.js'
import { openDatabase, type DB } from './client.js'
import { LOCAL_USER_ID, MIGRATIONS_DIR, ensureLocalUser, migrate, prepareDatabase } from './migrate.js'
import { createRepositories, type Repositories } from './repositories/index.js'

let db: DB
let repos: Repositories

beforeEach(() => {
  db = createTestDatabase()
  repos = createRepositories(db)
})

afterEach(() => {
  db.close()
})

/** Seed a 001-only database with one question/answer pair written in the same millisecond. */
function seed001Messages(old: DB) {
  ensureLocalUser(old)
  const r = createRepositories(old)
  const space = r.spaces.create({ userId: LOCAL_USER_ID, title: 'JS' })
  const conv = r.conversations.create({ spaceId: space.id, title: 'q' })
  const at = new Date().toISOString()
  r.messages.create({ conversationId: conv.id, role: 'user', mode: 'explain', kind: 'question', content: 'q', createdAt: at })
  r.messages.create({ conversationId: conv.id, role: 'assistant', mode: 'explain', kind: 'answer', content: 'a', createdAt: at })
}

function count(table: string): number {
  return db.prepare(`SELECT COUNT(*) FROM ${table}`).pluck().get() as number
}

describe('连接与迁移', () => {
  it('开启外键约束', () => {
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1)
  })

  it('一次建好 V0.2 的五张表', () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .pluck()
      .all() as string[]
    expect(tables).toEqual(
      expect.arrayContaining([
        'users',
        'learning_spaces',
        'conversations',
        'socratic_rounds',
        'messages',
      ]),
    )
  })

  it('002 迁移：users 有 display_name，消息支持 restatement 类型', () => {
    const columns = db.prepare('PRAGMA table_info(users)').all() as { name: string }[]
    expect(columns.map((c) => c.name)).toContain('display_name')

    const space = repos.spaces.create({ userId: LOCAL_USER_ID, title: 'JS' })
    const conv = repos.conversations.create({ spaceId: space.id, title: '闭包' })
    const msg = repos.messages.create({
      conversationId: conv.id,
      role: 'user',
      mode: 'explain',
      kind: 'restatement',
      content: '环境被引用就不会被回收',
    })
    expect(repos.messages.listByConversation(conv.id)[0].id).toBe(msg.id)
  })

  it('从 001 升级到 002 时保留已有消息及其顺序', () => {
    const dir = mkdtempSync(join(tmpdir(), 'whylab-upgrade-'))
    const file = join(dir, 'whylab.db')
    try {
      const old = openDatabase(file)
      old.exec(`CREATE TABLE schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`)
      old.exec(readFileSync(join(MIGRATIONS_DIR, '001_init.sql'), 'utf8'))
      old.prepare(`INSERT INTO schema_migrations VALUES ('001_init.sql', 'x')`).run()
      seed001Messages(old)
      old.close()

      const upgraded = openDatabase(file)
      expect(migrate(upgraded)).toEqual(['002_design_fields.sql'])
      const kinds = upgraded
        .prepare('SELECT kind FROM messages ORDER BY created_at, rowid')
        .pluck()
        .all()
      expect(kinds).toEqual(['question', 'answer'])
      expect(upgraded.pragma('foreign_key_check')).toEqual([])
      upgraded.close()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('重复迁移不会重复执行，local 用户只有一个', () => {
    expect(migrate(db)).toEqual([])
    prepareDatabase(db)
    expect(count('users')).toBe(1)
    expect(db.prepare('SELECT id FROM users').pluck().get()).toBe(LOCAL_USER_ID)
  })

  it('文件库使用 WAL，关闭后重新打开数据仍在（模拟服务重启）', () => {
    const dir = mkdtempSync(join(tmpdir(), 'whylab-db-'))
    const file = join(dir, 'nested', 'whylab.db')
    try {
      const first = openDatabase(file)
      expect(first.pragma('journal_mode', { simple: true })).toBe('wal')
      prepareDatabase(first)
      const space = createRepositories(first).spaces.create({
        userId: LOCAL_USER_ID,
        title: '重启前创建',
      })
      first.close()

      const second = openDatabase(file)
      prepareDatabase(second)
      expect(createRepositories(second).spaces.findById(space.id)?.title).toBe('重启前创建')
      second.close()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('空间 / 对话 / 消息仓储', () => {
  it('创建并读取空间，列表按更新时间倒序', () => {
    const a = repos.spaces.create({ userId: LOCAL_USER_ID, title: 'JS', description: '闭包' })
    const b = repos.spaces.create({ userId: LOCAL_USER_ID, title: '热力学' })
    repos.spaces.touch(a.id, new Date(Date.now() + 1000).toISOString())

    expect(repos.spaces.findById(a.id)).toMatchObject({ title: 'JS', description: '闭包' })
    expect(repos.spaces.listByUser(LOCAL_USER_ID).map((s) => s.id)).toEqual([a.id, b.id])
    expect(repos.spaces.findById('missing')).toBeNull()
  })

  it('创建对话默认 explain 模式', () => {
    const space = repos.spaces.create({ userId: LOCAL_USER_ID, title: 'JS' })
    const conv = repos.conversations.create({ spaceId: space.id, title: '闭包' })

    expect(conv.mode).toBe('explain')
    expect(repos.conversations.listBySpace(space.id)).toEqual([conv])
  })

  it('消息按发送顺序读回，同一时刻写入也先问后答，meta 往返不丢', () => {
    const space = repos.spaces.create({ userId: LOCAL_USER_ID, title: 'JS' })
    const conv = repos.conversations.create({ spaceId: space.id, title: '闭包' })
    const at = new Date().toISOString()
    const q = repos.messages.create({
      conversationId: conv.id,
      role: 'user',
      mode: 'explain',
      kind: 'question',
      content: '为什么？',
      createdAt: at,
    })
    const a = repos.messages.create({
      conversationId: conv.id,
      role: 'assistant',
      mode: 'explain',
      kind: 'answer',
      content: '因为……',
      meta: { followUpSuggestions: ['再问'], isMock: true },
      createdAt: at,
    })

    const list = repos.messages.listByConversation(conv.id)
    expect(list.map((m) => m.id)).toEqual([q.id, a.id])
    expect(list[1].meta).toEqual({ followUpSuggestions: ['再问'], isMock: true })
  })

  it('外键拒绝挂到不存在的空间上', () => {
    expect(() => repos.conversations.create({ spaceId: 'missing', title: 'x' })).toThrow(
      /FOREIGN KEY/,
    )
  })
})

describe('mode 校验', () => {
  it('数据库拒绝非法的对话 mode', () => {
    const space = repos.spaces.create({ userId: LOCAL_USER_ID, title: 'JS' })
    expect(() =>
      repos.conversations.create({ spaceId: space.id, title: 'x', mode: 'chat' as never }),
    ).toThrow(/CHECK constraint/)
  })

  it('数据库拒绝非法的消息 mode 与 kind', () => {
    const space = repos.spaces.create({ userId: LOCAL_USER_ID, title: 'JS' })
    const conv = repos.conversations.create({ spaceId: space.id, title: 'x' })
    const base = { conversationId: conv.id, role: 'user' as const, content: 'q' }

    expect(() =>
      repos.messages.create({ ...base, mode: 'chat' as never, kind: 'question' }),
    ).toThrow(/CHECK constraint/)
    expect(() =>
      repos.messages.create({ ...base, mode: 'explain', kind: 'banter' as never }),
    ).toThrow(/CHECK constraint/)
  })

  it('同一对话最多一个 active 追问轮次', () => {
    const space = repos.spaces.create({ userId: LOCAL_USER_ID, title: 'JS' })
    const conv = repos.conversations.create({ spaceId: space.id, title: 'x', mode: 'socratic' })
    const insert = db.prepare(
      `INSERT INTO socratic_rounds (id, conversation_id, goal, status, started_at)
       VALUES (?, ?, 'g', ?, ?)`,
    )
    const now = new Date().toISOString()
    insert.run('r1', conv.id, 'active', now)
    insert.run('r2', conv.id, 'completed', now)
    expect(() => insert.run('r3', conv.id, 'active', now)).toThrow(/UNIQUE/)
  })
})

describe('级联删除', () => {
  function seed() {
    const space = repos.spaces.create({ userId: LOCAL_USER_ID, title: 'JS' })
    const conv = repos.conversations.create({ spaceId: space.id, title: '闭包' })
    db.prepare(
      `INSERT INTO socratic_rounds (id, conversation_id, goal, status, started_at)
       VALUES ('r1', ?, 'g', 'active', ?)`,
    ).run(conv.id, new Date().toISOString())
    const msg = repos.messages.create({
      conversationId: conv.id,
      role: 'user',
      mode: 'socratic',
      kind: 'goal',
      content: 'q',
      roundId: 'r1',
    })
    return { space, conv, msg }
  }

  it('删除空间连带删除对话、追问轮次和消息', () => {
    const { space } = seed()
    expect(repos.spaces.delete(space.id)).toBe(true)

    expect(count('conversations')).toBe(0)
    expect(count('socratic_rounds')).toBe(0)
    expect(count('messages')).toBe(0)
    expect(count('users')).toBe(1)
  })

  it('删除对话只影响该对话的数据', () => {
    const { space, conv } = seed()
    const other = repos.conversations.create({ spaceId: space.id, title: '另一个' })
    repos.messages.create({
      conversationId: other.id,
      role: 'user',
      mode: 'explain',
      kind: 'question',
      content: 'q',
    })

    repos.conversations.delete(conv.id)
    expect(repos.messages.listByConversation(other.id)).toHaveLength(1)
    expect(count('messages')).toBe(1)
    expect(repos.spaces.findById(space.id)).not.toBeNull()
  })

  it('删除追问轮次时消息保留，round_id 置空', () => {
    const { msg } = seed()
    db.prepare("DELETE FROM socratic_rounds WHERE id = 'r1'").run()
    expect(repos.messages.listByConversation(msg.conversationId)[0].roundId).toBeNull()
  })
})
