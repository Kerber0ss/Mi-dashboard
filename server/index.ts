import Fastify from 'fastify'
import { pathToFileURL } from 'node:url'
import { loadConfig, saveConfig, dashboardConfigSchema } from './config.js'

export function buildApp(dataDir: string) {
  const app = Fastify({ logger: true })
  app.get('/api/health', async () => ({ status: 'up' }))
  app.get('/api/config', async () => loadConfig(dataDir))
  app.put('/api/config', async (req, reply) => {
    const parsed = dashboardConfigSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    saveConfig(dataDir, parsed.data)
    return parsed.data
  })
  return app
}

const DATA_DIR = process.env.DATA_DIR ?? 'data'
export const app = buildApp(DATA_DIR)

// Only start listening when run directly (not when imported by tests)
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  app.listen({ port: 3000, host: '0.0.0.0' })
}