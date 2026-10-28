import { createApp } from './app.js'
import { env } from './config/env.js'
import { openDatabase } from './db/client.js'
import { prepareDatabase } from './db/migrate.js'

const db = openDatabase(env.dbPath)
prepareDatabase(db)

const app = createApp(db)

const server = app.listen(env.port, () => {
  console.log(`[whylab] API listening on http://localhost:${env.port}`)
  console.log(`[whylab] health check: http://localhost:${env.port}/api/health`)
  console.log(`[whylab] database: ${env.dbPath}`)
  console.log(`[whylab] AI provider: ${env.aiProvider}`)
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => {
      db.close()
      process.exit(0)
    })
  })
}
