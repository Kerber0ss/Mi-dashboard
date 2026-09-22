import { describe, it, expect, beforeEach } from 'vitest'
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadConfig, saveConfig, defaultConfig, dashboardConfigSchema } from './config.js'

const dir = () => mkdtempSync(join(tmpdir(), 'dash-'))

describe('loadConfig', () => {
  it('returns defaults when file missing', () => {
    const cfg = loadConfig(dir())
    expect(cfg.version).toBe(1)
    expect(cfg.items).toEqual([])
  })
  it('returns defaults when file is corrupt JSON', () => {
    const d = dir()
    writeFileSync(join(d, 'config.json'), '{broken')
    expect(loadConfig(d)).toEqual(defaultConfig())
  })
  it('roundtrips save/load', () => {
    const d = dir()
    const cfg = defaultConfig()
    cfg.items.push({ id: 'a', type: 'link', x: 0, y: 0, w: 2, h: 1,
      props: { title: 'X', url: 'https://x.dev', icon: null, customIcon: null } })
    saveConfig(d, cfg)
    expect(loadConfig(d)).toEqual(cfg)
  })
})

describe('schema', () => {
  it('rejects unknown item type', () => {
    expect(dashboardConfigSchema.safeParse({ ...defaultConfig(), items: [{ id: 'x', type: 'bogus', x: 0, y: 0, w: 1, h: 1, props: {} }] }).success).toBe(false)
  })
  it('rejects negative grid coords', () => {
    expect(dashboardConfigSchema.safeParse({ ...defaultConfig(), items: [{ id: 'x', type: 'link', x: -1, y: 0, w: 1, h: 1, props: {} }] }).success).toBe(false)
  })
})

describe('routes', () => {
  it('PUT /api/config rejects invalid payload with 400', async () => {
    const { buildApp } = await import('./index.js')
    const app = buildApp(dir())
    const res = await app.inject({ method: 'PUT', url: '/api/config', payload: { bad: true } })
    expect(res.statusCode).toBe(400)
    await app.close()
  })
  it('PUT /api/config accepts valid payload with 200 and persists', async () => {
    const d = dir()
    const { buildApp } = await import('./index.js')
    const app = buildApp(d)
    const res = await app.inject({ method: 'PUT', url: '/api/config', payload: defaultConfig() })
    expect(res.statusCode).toBe(200)
    expect(readFileSync(join(d, 'config.json'), 'utf8')).toContain('"version": 1')
    await app.close()
  })
})