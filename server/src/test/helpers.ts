import { openDatabase, type DB } from '../db/client.js'
import { prepareDatabase } from '../db/migrate.js'

/** 每个用例一份独立的内存库，跑完即丢，互不污染。 */
export function createTestDatabase(): DB {
  const db = openDatabase(':memory:')
  prepareDatabase(db)
  return db
}
