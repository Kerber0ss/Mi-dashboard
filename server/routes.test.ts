import { describe, it, expect, vi } from 'vitest'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildApp } from './index.js'

// DNS is mocked so tests never hit the network: IP-literal hostnames resolve
// to themselves, well-known names to fixed addresses, everything else public.
const dnsMock = vi.hoisted(() => ({
  lookup: async (host: string) => {
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return [{ address: host, family: 4 }]
    if (host === 'localhost') return [{ address: '127.0.0.1', family: 4 }]
    if (host === 'private.test') return [{ address: '10.0.0.5', family: 4 }]
    return [{ address: '93.184.216.34', family: 4 }]
  },
}))
vi.mock('node:dns/promises', () => dnsMock)

const dataDir = mkdtempSync(join(tmpdir(), 'dash-r-'))
const app = buildApp({ dataDir, skipListen: true })

describe('health probe', () => {
  it('returns down for unreachable url, with latency', async () => {
    vi.stubGlobal('fetch', vi.fn())
    const res = await app.inject({ method: 'GET', url: '/api/health?url=https://unreachable.invalid' })
    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('down')
    expect(res.json().latencyMs).toBeGreaterThanOrEqual(0)
    vi.unstubAllGlobals()
  })
  it('returns 400 without url', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/health' })).statusCode).toBe(400)
  })
  it('rejects loopback/localhost without fetching', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    for (const bad of ['http://localhost:8080', 'http://127.0.0.1:1', 'http://[::1]/']) {
      const res = await app.inject({ method: 'GET', url: `/api/health?url=${encodeURIComponent(bad)}` })
      expect(res.json().status).toBe('down')
    }
    expect(fetchMock).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
  it('rejects private/link-local IPs without fetching', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    for (const bad of ['http://10.0.0.5', 'http://172.16.1.1', 'http://192.168.0.2', 'http://169.254.1.1', 'http://0.0.0.0']) {
      const res = await app.inject({ method: 'GET', url: `/api/health?url=${encodeURIComponent(bad)}` })
      expect(res.json().status).toBe('down')
    }
    expect(fetchMock).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
  it('rejects non-http schemes and private DNS names without fetching', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    for (const bad of ['ftp://example.com', 'http://private.test']) {
      const res = await app.inject({ method: 'GET', url: `/api/health?url=${encodeURIComponent(bad)}` })
      expect(res.json().status).toBe('down')
    }
    expect(fetchMock).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
  it('returns up for a reachable public url', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, headers: { get: () => null } }))
    vi.stubGlobal('fetch', fetchMock)
    const res = await app.inject({ method: 'GET', url: '/api/health?url=https://example.com' })
    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('up')
    expect(fetchMock).toHaveBeenCalledOnce()
    vi.unstubAllGlobals()
  })
  it('follows redirects to public hosts manually', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 302, headers: { get: (k: string) => (k === 'location' ? 'https://example.net/final' : null) } })
      .mockResolvedValueOnce({ ok: true, status: 200, headers: { get: () => null } })
    vi.stubGlobal('fetch', fetchMock)
    const res = await app.inject({ method: 'GET', url: '/api/health?url=https://example.com' })
    expect(res.json().status).toBe('up')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    vi.unstubAllGlobals()
  })
  it('rejects redirects to private hosts', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 302, headers: { get: (k: string) => (k === 'location' ? 'http://private.test/admin' : null) } })
    vi.stubGlobal('fetch', fetchMock)
    const res = await app.inject({ method: 'GET', url: '/api/health?url=https://example.com' })
    expect(res.json().status).toBe('down')
    expect(fetchMock).toHaveBeenCalledOnce()
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
