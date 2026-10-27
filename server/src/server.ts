import { createApp } from './app.js'
import { env } from './config/env.js'

const app = createApp()

const server = app.listen(env.port, () => {
  console.log(`[whylab] API listening on http://localhost:${env.port}`)
  console.log(`[whylab] health check: http://localhost:${env.port}/api/health`)
  console.log(`[whylab] AI provider: ${env.aiProvider}`)
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0))
  })
}
