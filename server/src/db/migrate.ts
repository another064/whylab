import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { DB } from './client.js'

export const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations')

export const LOCAL_USER_ID = 'local'

/**
 * 按文件名顺序执行 migrations/*.sql，已执行过的记在 schema_migrations 里跳过。
 * 每个文件单独一个事务：失败时整份回滚，不会留下半张表。
 * 返回本次新执行的迁移文件名。
 */
export function migrate(db: DB): string[] {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name       TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  )`)

  const applied = new Set(
    db.prepare('SELECT name FROM schema_migrations').pluck().all() as string[],
  )
  const pending = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql') && !applied.has(file))
    .sort()

  const record = db.prepare('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)')

  for (const file of pending) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
    db.transaction(() => {
      db.exec(sql)
      record.run(file, new Date().toISOString())
    })()
  }

  return pending
}

/** MVP 为单用户：确保固定 id 的 local 用户存在，所有空间都挂在它下面。 */
export function ensureLocalUser(db: DB): void {
  db.prepare('INSERT OR IGNORE INTO users (id, created_at) VALUES (?, ?)').run(
    LOCAL_USER_ID,
    new Date().toISOString(),
  )
}

/** 迁移 + 初始化数据，启动和测试共用同一入口。 */
export function prepareDatabase(db: DB): void {
  migrate(db)
  ensureLocalUser(db)
}
