import Fastify from 'fastify'
import { pathToFileURL } from 'node:url'
import { mkdirSync, existsSync, createReadStream, writeFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { loadConfig, saveConfig, dashboardConfigSchema } from './config.js'
import { resolvePublicHttpUrl } from './urlGuard.js'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { nanoid } from 'nanoid'

export type BuildAppOptions = { dataDir?: string; skipListen?: boolean }

const ICON_MIME_RE = /^image\/(svg\+xml|png)$/
const MAX_ICON_BYTES = 512 * 1024
const WEATHER_TTL_MS = 600_000 // 10 minutes

/**
 * Build the configured Fastify instance.
 * Accepts either a dataDir string (legacy) or { dataDir, skipListen }.
 * Tests use inject() and never bind a port — skipListen is accepted for
 * API compatibility; the main-guard below is what actually gates listen().
 */
export function buildApp(opts: string | BuildAppOptions = {}) {
  const options: BuildAppOptions = typeof opts === 'string' ? { dataDir: opts } : opts
  const dataDir = resolve(options.dataDir ?? process.env.DATA_DIR ?? 'data')
  const iconsDir = join(dataDir, 'icons')

  const app = Fastify({ logger: true })

  app.register(multipart, { limits: { fileSize: MAX_ICON_BYTES } })

  // POST /api/icons — multipart upload of an svg/png icon (≤512KB)
  app.post('/api/icons', async (req, reply) => {
    const file = await req.file()
    if (!file) return reply.code(400).send({ error: 'file required' })
    if (!ICON_MIME_RE.test(file.mimetype)) return reply.code(400).send({ error: 'only svg or png allowed' })
    const buffer = await file.toBuffer()
    if (buffer.length > MAX_ICON_BYTES) return reply.code(400).send({ error: 'icon larger than 512KB' })
    const ext = file.mimetype === 'image/svg+xml' ? '.svg' : '.png'
    const name = `${nanoid()}${ext}`
    mkdirSync(iconsDir, { recursive: true })
    writeFileSync(join(iconsDir, name), buffer)
    return reply.code(200).send({ file: name })
  })

  // GET /api/icons — list uploaded icon file names
  app.get('/api/icons', async () => {
    let files: string[] = []
    if (existsSync(iconsDir)) files = readdirSync(iconsDir)
    return { files }
  })

  // GET /api/health?url= — HEAD-probe a URL, report up/down + latency.
  // SSRF-safe: scheme is restricted to http/https, DNS resolution is checked
  // against private/loopback/link-local ranges, and redirects are followed
  // manually (max 3 hops) so every hop is re-validated.
  const MAX_REDIRECTS = 3
  app.get('/api/health', async (req, reply) => {
    const { url } = req.query as { url?: string }
    if (!url) return reply.code(400).send({ error: 'url required' })
    const start = Date.now()
    let target: URL
    try {
      target = await resolvePublicHttpUrl(url)
    } catch {
      return { status: 'down', latencyMs: Date.now() - start }
    }
    try {
      let current = target
      for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        const ctrl = new AbortController()
        const t = setTimeout(() => ctrl.abort(), 5000)
        try {
          const res = await fetch(current, { method: 'HEAD', signal: ctrl.signal, redirect: 'manual' })
          if (res.status < 300 || res.status >= 400) return { status: 'up', latencyMs: Date.now() - start }
          const loc = res.headers.get('location')
          if (!loc) return { status: 'up', latencyMs: Date.now() - start }
          const next = new URL(loc, current)
          if (next.protocol !== 'http:' && next.protocol !== 'https:') throw new Error('redirect scheme not allowed')
          const nextValidated = await resolvePublicHttpUrl(next.toString())
          current = nextValidated
        } finally {
          clearTimeout(t)
        }
      }
      throw new Error('too many redirects')
    } catch {
      return { status: 'down', latencyMs: Date.now() - start }
    }
  })

  // GET /api/weather?lat=&lon= — open-meteo proxy with 10-min in-memory cache
  const weatherCache = new Map<string, { ts: number; data: unknown }>()
  app.get('/api/weather', async (req, reply) => {
    const { lat, lon } = req.query as { lat?: string; lon?: string }
    const latNum = Number(lat)
    const lonNum = Number(lon)
    if (!lat || !lon || Number.isNaN(latNum) || Number.isNaN(lonNum)) {
      return reply.code(400).send({ error: 'lat and lon required' })
    }
    const cacheKey = `${latNum.toFixed(3)},${lonNum.toFixed(3)}`
    const cached = weatherCache.get(cacheKey)
    if (cached && Date.now() - cached.ts < WEATHER_TTL_MS) return cached.data
    const url =
      'https://api.open-meteo.com/v1/forecast' +
      `?latitude=${latNum}&longitude=${lonNum}` +
      '&current=temperature_2m,weather_code' +
      '&daily=temperature_2m_max,temperature_2m_min' +
      '&forecast_days=3'
    try {
      const res = await fetch(url)
      if (!res.ok) return reply.code(502).send({ error: 'weather upstream error' })
      const data = (await res.json()) as unknown
      weatherCache.set(cacheKey, { ts: Date.now(), data })
      return reply.send(data)
    } catch {
      return reply.code(502).send({ error: 'weather upstream unreachable' })
    }
  })

  // Serve uploaded icons at /api/icons/<file> (matches frontend Icon.tsx)
  app.register(fastifyStatic, {
    root: iconsDir,
    prefix: '/api/icons/',
    decorateReply: false,
  })

  // Serve the built frontend from dist/ (if it exists), SPA fallback for non-/api paths
  const distDir = join(process.cwd(), 'dist')
  if (existsSync(distDir)) {
    app.register(fastifyStatic, { root: distDir, prefix: '/' })
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api')) return reply.code(404).send({ error: 'not found' })
      return reply.type('text/html').send(createReadStream(join(distDir, 'index.html')))
    })
  }

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
