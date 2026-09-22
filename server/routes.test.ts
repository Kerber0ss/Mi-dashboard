import { describe, it, expect, vi } from 'vitest'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildApp } from './index.js'

const dataDir = mkdtempSync(join(tmpdir(), 'dash-r-'))
const app = buildApp({ dataDir, skipListen: true })

describe('health probe', () => {
  it('returns down for unreachable url, with latency', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health?url=http://127.0.0.1:1' })
    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('down')
    expect(res.json().latencyMs).toBeGreaterThanOrEqual(0)
  })
  it('returns 400 without url', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/health' })).statusCode).toBe(400)
  })
  it('returns up for a reachable url', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)
    const res = await app.inject({ method: 'GET', url: '/api/health?url=https://example.com' })
    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('up')
    vi.unstubAllGlobals()
  })
})

describe('icon upload', () => {
  it('rejects non-image', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/icons',
      headers: { 'content-type': 'multipart/form-data; boundary=x' },
      payload: '--x\nContent-Disposition: form-data; name="file"; filename="a.txt"\nContent-Type: text/plain\n\nhi\n--x--',
    })
    expect(res.statusCode).toBe(400)
  })
  it('accepts a png and serves it back at /api/icons/<file>', async () => {
    // 1x1 transparent PNG
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64',
    )
    const body = Buffer.concat([
      Buffer.from(
        '--x\r\nContent-Disposition: form-data; name="file"; filename="dot.png"\r\nContent-Type: image/png\r\n\r\n',
      ),
      png,
      Buffer.from('\r\n--x--'),
    ])
    const up = await app.inject({
      method: 'POST',
      url: '/api/icons',
      headers: { 'content-type': 'multipart/form-data; boundary=x' },
      payload: body,
    })
    expect(up.statusCode).toBe(200)
    const name = up.json().file as string
    expect(name).toMatch(/\.png$/)
    const list = await app.inject({ method: 'GET', url: '/api/icons' })
    expect(list.statusCode).toBe(200)
    expect(list.json().files).toContain(name)
    const served = await app.inject({ method: 'GET', url: `/api/icons/${name}` })
    expect(served.statusCode).toBe(200)
    expect(served.headers['content-type']).toContain('image/png')
  })
})

describe('weather proxy', () => {
  it('caches open-meteo responses for 10 minutes', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ current: { temperature_2m: 20 } }),
    }))
    vi.stubGlobal('fetch', fetchMock)
    const res = await app.inject({ method: 'GET', url: '/api/weather?lat=50&lon=14' })
    expect(res.statusCode).toBe(200)
    expect(res.json().current.temperature_2m).toBe(20)
    await app.inject({ method: 'GET', url: '/api/weather?lat=50&lon=14' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    // different coords → different cache key
    await app.inject({ method: 'GET', url: '/api/weather?lat=51&lon=14' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    vi.unstubAllGlobals()
  })
  it('returns 400 without lat/lon', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/weather' })).statusCode).toBe(400)
  })
  it('returns 502 when upstream fails', async () => {
    vi.stubGlobal('fetch', async () => ({ ok: false }))
    const res = await app.inject({ method: 'GET', url: '/api/weather?lat=50&lon=14.5' })
    expect(res.statusCode).toBe(502)
    vi.unstubAllGlobals()
  })
})
