import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

import Database from 'better-sqlite3'

export type DB = Database.Database

/**
 * 打开 SQLite 连接并设置每个连接都必须开启的 PRAGMA。
 * - foreign_keys：SQLite 默认关闭，不开的话 ON DELETE CASCADE 全部失效。
 * - WAL：读写不互斥，进程崩溃时也不会留下半写的主文件。内存库不支持，自动跳过。
 */
export function openDatabase(filename: string): DB {
  const isMemory = filename === ':memory:'
  if (!isMemory) mkdirSync(dirname(filename), { recursive: true })

  const db = new Database(filename)
  db.pragma('foreign_keys = ON')
  if (!isMemory) db.pragma('journal_mode = WAL')
  db.pragma('busy_timeout = 5000')

  return db
}
