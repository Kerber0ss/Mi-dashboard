# Mi-dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A self-hosted link dashboard SPA + small Node backend with themes, light/dark, drag-drop grid config, custom icons, and clock/weather/status widgets.

**Architecture:** React+Vite+TS SPA served as static files by a Fastify backend. Config persisted as a single zod-validated `data/config.json`. Theming via CSS custom properties driven by `data-theme`/`data-mode` attributes.

**Tech Stack:** React 18, Vite, TypeScript, Fastify, zod, @dnd-kit/core, framer-motion, zustand, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2025-dashboard-app-design.md`

## Global Constraints

- Node 20+, TypeScript strict mode
- No external CDNs — all assets bundled or self-hosted
- Frontend deps limited to: react, react-dom, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/modifiers, framer-motion, zustand, @dashboard-icons/react (npm), react-colorful
- Backend deps limited to: fastify, @fastify/static, @fastify/multipart, zod, nanoid
- All layout via CSS custom properties; no UI component library
- Grid: 12 columns default, `data/config.json` single source of truth

## Review Focus

1. **Corrupt/missing config.json on boot** — server must start with defaults, not crash. (Pinned: Task 2 test)
2. **Invalid PUT payload** — must return 400 and never overwrite good config. (Pinned: Task 2)
3. **Empty/oversized icon upload** — must reject non-SVG/PNG and >512KB. (Pinned: Task 6)
4. **Health probe against unreachable/slow URL** — must return `down` within 5s, never hang. (Pinned: Task 7)
5. **Duplicate grid position after drag** — items must never overlap after drag/resize; dnd-kit snap must be deterministic. (Pinned: Task 9 test)

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `server/index.ts`, `.gitignore`

**Interfaces:**
- Produces: runnable `npm run dev` (Vite on 5173), `npm run build`, `npm run server` (Fastify on 3000), `npm run test` (Vitest)

- [ ] **Step 1: Scaffold manually (no create-vite, keep control)**

`package.json`:
```json
{
  "name": "mi-dashboard",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "server": "tsx server/index.ts",
    "test": "vitest run",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/modifiers": "^7.0.0",
    "framer-motion": "^11.0.0",
    "zustand": "^4.5.0",
    "fastify": "^4.26.0",
    "@fastify/static": "^7.0.0",
    "@fastify/multipart": "^8.2.0",
    "zod": "^3.23.0",
    "nanoid": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.4.0",
    "vite": "^5.2.0",
    "tsx": "^4.7.0",
    "vitest": "^1.6.0",
    "@playwright/test": "^1.44.0"
  }
}
```

`vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:3000' } },
})
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022", "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext", "moduleResolution": "bundler",
    "jsx": "react-jsx", "strict": true, "skipLibCheck": true,
    "noEmit": true, "types": ["vite/client"]
  },
  "include": ["src"]
}
```

`index.html`:
```html
<!doctype html>
<html lang="en" data-theme="liquid-glass" data-mode="dark">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Mi Dashboard</title></head>
  <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>
</html>
```

`src/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
```

`src/App.tsx`:
```tsx
export default function App() { return <div className="app">Mi Dashboard</div> }
```

`server/index.ts` (stub, expanded in Task 2):
```ts
import Fastify from 'fastify'
const app = Fastify({ logger: true })
app.get('/api/health', async () => ({ status: 'up' }))
app.listen({ port: 3000, host: '0.0.0.0' })
```

`.gitignore`: `node_modules/`, `dist/`, `data/`, `test-results/`

- [ ] **Step 2: Install deps and verify**

Run: `npm install && npm run dev &` then `curl localhost:5173` (expect HTML), `npm run server &` then `curl localhost:3000/api/health` (expect `{"status":"up"}`). Kill background processes.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "chore: scaffold react+vite+fastify project"
```

---

### Task 2: Config schema, storage, GET/PUT /api/config

**Files:**
- Create: `server/config.ts`, `server/config.test.ts`
- Modify: `server/index.ts`

**Interfaces:**
- Produces: `DashboardConfig` zod schema + inferred type (also imported by frontend), `loadConfig(dir): DashboardConfig`, `saveConfig(dir, config): void`, Fastify routes `GET /api/config`, `PUT /api/config`

- [ ] **Step 1: Write failing tests**

`server/config.test.ts`:
```ts
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
```

- [ ] **Step 2: Run tests, expect FAIL (module not found)**

Run: `npm test`
Expected: FAIL — `Cannot find module './config.js'`

- [ ] **Step 3: Implement `server/config.ts`**

```ts
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'

const iconRef = z.string().nullable()
export const itemPropsSchema = z.object({
  title: z.string().max(100).default(''),
  url: z.string().url().or(z.literal('')).default(''),
  icon: iconRef.default(null),
  customIcon: iconRef.default(null),
  children: z.array(z.string()).default([]),
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
  targets: z.array(z.string()).default([]),
  format24h: z.boolean().default(true),
  showSeconds: z.boolean().default(false),
}).passthrough()

export const itemSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['link', 'group', 'widget:clock', 'widget:weather', 'widget:status']),
  x: z.number().int().min(0), y: z.number().int().min(0),
  w: z.number().int().min(1).max(12), h: z.number().int().min(1),
  props: itemPropsSchema,
})

export const dashboardConfigSchema = z.object({
  version: z.literal(1),
  theme: z.object({
    id: z.string().default('liquid-glass'),
    mode: z.enum(['light', 'dark']).default('dark'),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#7c5cff'),
    opacity: z.number().min(0).max(1).default(0.6),
    blur: z.number().min(0).max(40).default(16),
    background: z.string().nullable().default(null),
  }),
  grid: z.object({ cols: z.number().int().min(4).max(24).default(12),
    rowHeight: z.number().int().min(40).max(200).default(80),
    gap: z.number().int().min(0).max(48).default(12) }),
  items: z.array(itemSchema).default([]),
})
export type DashboardConfig = z.infer<typeof dashboardConfigSchema>

export function defaultConfig(): DashboardConfig {
  return dashboardConfigSchema.parse({})
}

export function loadConfig(dataDir: string): DashboardConfig {
  const file = join(dataDir, 'config.json')
  if (!existsSync(file)) return defaultConfig()
  try {
    return dashboardConfigSchema.parse(JSON.parse(readFileSync(file, 'utf8')))
  } catch {
    return defaultConfig()
  }
}

export function saveConfig(dataDir: string, config: DashboardConfig): void {
  dashboardConfigSchema.parse(config) // throws on invalid
  mkdirSync(dataDir, { recursive: true })
  const tmp = join(dataDir, `config.json.tmp-${Date.now()}`)
  writeFileSync(tmp, JSON.stringify(config, null, 2))
  renameSync(tmp, join(dataDir, 'config.json'))
}
```

- [ ] **Step 4: Run tests, expect PASS**

Run: `npm test`
Expected: all PASS

- [ ] **Step 5: Wire routes in `server/index.ts`**

```ts
import Fastify from 'fastify'
import { loadConfig, saveConfig, dashboardConfigSchema } from './config.js'

const app = Fastify({ logger: true })
const DATA_DIR = process.env.DATA_DIR ?? 'data'

app.get('/api/config', async () => loadConfig(DATA_DIR))

app.put('/api/config', async (req, reply) => {
  const parsed = dashboardConfigSchema.safeParse(req.body)
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
  saveConfig(DATA_DIR, parsed.data)
  return parsed.data
})

app.listen({ port: 3000, host: '0.0.0.0' })
```

Add to `server/config.test.ts` a route test using `app.inject({ method: 'PUT', url: '/api/config', payload: { bad: true } })` → expect 400, and a valid `defaultConfig()` payload → 200.

- [ ] **Step 6: Run all tests, commit**

```bash
npm test && git add -A && git commit -m "feat: config schema, persistence, GET/PUT /api/config"
```

---

### Task 3: Zustand store + config sync

**Files:**
- Create: `src/store.ts`, `src/store.test.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `useConfig()` zustand store with `{ config: DashboardConfig, status: 'loading'|'ready'|'error', setTheme(patch), updateItem(id, patch), moveItem(id, x, y), resizeItem(id, w, h), addItem(type, props?): id, removeItem(id), reload(), save() }`. Debounced autosave: mutations schedule `PUT /api/config` after 600ms; on 400 response keep previous config and set `status='error'`.

- [ ] **Step 1: Write failing test (mock fetch)**

`src/store.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useStore } from './store'

beforeEach(() => { vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => useStore.getState().config }))) })

describe('store', () => {
  it('addItem adds and returns id, then removeItem deletes', () => {
    const id = useStore.getState().addItem('link', { title: 'A', url: 'https://a.dev' })
    expect(useStore.getState().config.items).toHaveLength(1)
    useStore.getState().removeItem(id)
    expect(useStore.getState().config.items).toHaveLength(0)
  })
  it('moveItem updates coords only', () => {
    const id = useStore.getState().addItem('link', {})
    useStore.getState().moveItem(id, 3, 4)
    const it = useStore.getState().config.items[0]
    expect(it.x).toBe(3); expect(it.y).toBe(4); expect(it.w).toBe(2)
  })
  it('setTheme patches theme and keeps other fields', () => {
    useStore.getState().setTheme({ mode: 'light' })
    expect(useStore.getState().config.theme.mode).toBe('light')
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

Run: `npm test` — FAIL `Cannot find module './store'`

- [ ] **Step 3: Implement `src/store.ts`**

```ts
import { create } from 'zustand'
import type { DashboardConfig } from '../server/config.js'
import { nanoid } from 'nanoid'

type State = {
  config: DashboardConfig
  status: 'loading' | 'ready' | 'error'
  setConfig: (c: DashboardConfig) => void
  setTheme: (patch: Partial<DashboardConfig['theme']>) => void
  setGrid: (patch: Partial<DashboardConfig['grid']>) => void
  updateItem: (id: string, patch: Record<string, unknown>) => void
  moveItem: (id: string, x: number, y: number) => void
  resizeItem: (id: string, w: number, h: number) => void
  addItem: (type: string, props?: Record<string, unknown>) => string
  removeItem: (id: string) => void
  reload: () => Promise<void>
  save: () => Promise<void>
}
let saveTimer: ReturnType<typeof setTimeout> | undefined
const scheduleSave = (get: () => State) => {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => get().save(), 600)
}
const mutate = (set: any, get: () => State, fn: (c: DashboardConfig) => void) => {
  const next = structuredClone(get().config)
  fn(next)
  set({ config: next })
  scheduleSave(get)
}
export const defaultConfigClient = (): DashboardConfig => ({ version: 1, theme: { id: 'liquid-glass', mode: 'dark', accent: '#7c5cff', opacity: 0.6, blur: 16, background: null }, grid: { cols: 12, rowHeight: 80, gap: 12 }, items: [] })
export const useStore = create<State>((set, get) => ({
  config: defaultConfigClient(), status: 'loading',
  setConfig: (c) => set({ config: c, status: 'ready' }),
  setTheme: (patch) => mutate(set, get, (c) => Object.assign(c.theme, patch)),
  setGrid: (patch) => mutate(set, get, (c) => Object.assign(c.grid, patch)),
  updateItem: (id, patch) => mutate(set, get, (c) => { const i = c.items.find(i => i.id === id); if (i) Object.assign(i.props, patch) }),
  moveItem: (id, x, y) => mutate(set, get, (c) => { const i = c.items.find(i => i.id === id); if (i) { i.x = x; i.y = y } }),
  resizeItem: (id, w, h) => mutate(set, get, (c) => { const i = c.items.find(i => i.id === id); if (i) { i.w = w; i.h = h } }),
  addItem: (type, props = {}) => {
    const id = nanoid()
    mutate(set, get, (c) => { c.items.push({ id, type: type as never, x: 0, y: 0, w: 2, h: 1, props: { title: '', url: '', icon: null, customIcon: null, children: [], targets: [], format24h: true, showSeconds: false, ...props } as never }) })
    return id
  },
  removeItem: (id) => mutate(set, get, (c) => { c.items = c.items.filter(i => i.id !== id) }),
  reload: async () => {
    try {
      const res = await fetch('/api/config')
      set({ config: await res.json(), status: 'ready' })
    } catch { set({ status: 'error' }) }
  },
  save: async () => {
    const res = await fetch('/api/config', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(get().config) })
    if (!res.ok) set({ status: 'error' })
  },
}))
```

- [ ] **Step 4: Run, PASS. Wire App to call `reload()` on mount. Commit.**

```tsx
// src/App.tsx
import { useEffect } from 'react'
import { useStore } from './store'
import Dashboard from './components/Dashboard'
export default function App() {
  const reload = useStore(s => s.reload)
  useEffect(() => { reload() }, [reload])
  return <Dashboard />
}
```
(Create placeholder `src/components/Dashboard.tsx` rendering items count for now.)
```bash
git add -A && git commit -m "feat: zustand store with debounced autosave"
```

---

### Task 4: Theme system (4 themes, light/dark)

**Files:**
- Create: `src/themes.ts`, `src/themes.css`, `src/components/ThemeProvider.tsx`

**Interfaces:**
- Produces: `THEMES: Record<ThemeId, ThemeDef>` where `ThemeDef = { id: string, name: string, tokens: { dark: Record<string,string>, light: Record<string,string> }, extraCss?: string }`; `<ThemeProvider/>` sets `data-theme`, `data-mode` and CSS vars from store config; `--opacity`, `--blur`, `--accent` set from theme settings.

Token contract (every theme defines both modes): `--bg, --bg-image-dim, --surface, --surface-border, --text, --text-dim, --shadow, --radius-base`.

- [ ] **Step 1: Implement `src/themes.ts`**

```ts
export type ThemeId = 'web20' | 'web30' | 'liquid-glass' | 'minimal'
export interface ThemeDef {
  id: ThemeId; name: string
  tokens: { dark: Record<string, string>; light: Record<string, string> }
  extraCss?: string
}
export const THEMES: Record<ThemeId, ThemeDef> = {
  'web20': { id: 'web20', name: 'Web 2.0',
    tokens: {
      dark: { '--bg': 'linear-gradient(160deg,#1b2735,#090a0f)', '--surface': 'linear-gradient(180deg,rgba(60,80,110,.9),rgba(30,40,60,.9))', '--surface-border': 'rgba(255,255,255,.25)', '--text': '#e8eef7', '--text-dim': '#9fb2c8', '--shadow': '0 4px 16px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.3)', '--radius-base': '12px' },
      light: { '--bg': 'linear-gradient(160deg,#dfe9f3,#ffffff)', '--surface': 'linear-gradient(180deg,#ffffff,#e6eef7)', '--surface-border': 'rgba(40,60,90,.25)', '--text': '#1a2634', '--text-dim': '#5b7188', '--shadow': '0 3px 10px rgba(30,50,80,.2), inset 0 1px 0 #fff', '--radius-base': '12px' } } },
  'web30': { id: 'web30', name: 'Web 3.0 Neon',
    tokens: {
      dark: { '--bg': 'radial-gradient(1200px 800px at 20% -10%,#1a0b2e,#050208 60%)', '--surface': 'rgba(22,12,40,.72)', '--surface-border': 'rgba(140,80,255,.45)', '--text': '#f2eaff', '--text-dim': '#a08cc8', '--shadow': '0 0 24px rgba(124,92,255,.25)', '--radius-base': '16px' },
      light: { '--bg': 'radial-gradient(1200px 800px at 20% -10%,#e8dcff,#f8f6fc 60%)', '--surface': 'rgba(255,255,255,.75)', '--surface-border': 'rgba(120,80,220,.35)', '--text': '#241640', '--text-dim': '#6b5a92', '--shadow': '0 0 18px rgba(124,92,255,.15)', '--radius-base': '16px' } },
    extraCss: `.card { box-shadow: 0 0 24px rgba(124,92,255,.25); } .card:hover { border-color: var(--accent); }` },
  'liquid-glass': { id: 'liquid-glass', name: 'Liquid Glass',
    tokens: {
      dark: { '--bg': 'linear-gradient(150deg,#0a0f1e,#101828 50%,#0a1020)', '--surface': 'rgba(255,255,255,.08)', '--surface-border': 'rgba(255,255,255,.18)', '--text': '#f5f7fb', '--text-dim': '#9aa7bd', '--shadow': '0 8px 32px rgba(0,0,0,.4)', '--radius-base': '20px' },
      light: { '--bg': 'linear-gradient(150deg,#cfe0f2,#eef4fb 50%,#e2ecf7)', '--surface': 'rgba(255,255,255,.45)', '--surface-border': 'rgba(255,255,255,.6)', '--text': '#182234', '--text-dim': '#5a6b85', '--shadow': '0 8px 32px rgba(40,60,90,.15)', '--radius-base': '20px' } },
    extraCss: `.card { backdrop-filter: blur(var(--blur)) saturate(1.6); -webkit-backdrop-filter: blur(var(--blur)) saturate(1.6); }` },
  'minimal': { id: 'minimal', name: 'Minimal',
    tokens: {
      dark: { '--bg': '#111214', '--surface': '#1c1d21', '--surface-border': '#2b2d33', '--text': '#e6e6e9', '--text-dim': '#8b8d95', '--shadow': 'none', '--radius-base': '8px' },
      light: { '--bg': '#f6f6f7', '--surface': '#ffffff', '--surface-border': '#e2e2e6', '--text': '#17181b', '--text-dim': '#77787f', '--shadow': 'none', '--radius-base': '8px' } } },
}
```

- [ ] **Step 2: Implement `src/themes.css` (shared base)**

```css
:root { --accent: #7c5cff; --blur: 16px; --opacity: .6; --gap: 12px; --row-height: 80px; --cols: 12; }
html, body, #root { height: 100%; margin: 0; }
body { background: var(--bg); color: var(--text); font-family: system-ui, -apple-system, sans-serif; transition: background .5s ease, color .3s ease; }
.app { min-height: 100%; }
.card { background: var(--surface); border: 1px solid var(--surface-border); border-radius: var(--radius-base); box-shadow: var(--shadow); }
/* --opacity is applied by ThemeProvider setting --surface with alpha computed from config.theme.opacity; for gradient surfaces the wrapper .card-sheen pseudo-element carries the alpha */
```
Note: implementer should apply `--surface` as color/gradient and `--opacity` via `background` composition or a wrapper pseudo-element; final CSS to be written cleanly in implementation with hover states:
```css
.card { transition: transform .25s cubic-bezier(.2,.8,.2,1.2), box-shadow .25s, border-color .25s; }
.card:hover { transform: translateY(-3px); }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
```

- [ ] **Step 3: Implement `<ThemeProvider/>`** — reads `config.theme` from store, sets `document.documentElement.dataset.theme/mode`, applies token vars as inline `style.setProperty`, injects `extraCss` into a `<style id="theme-extra">` tag. Runs on every theme-state change.

- [ ] **Step 4: Verify manually** — hardcode each theme id × mode in dev, screenshot eyeball. Commit: `feat: theme system with 4 themes and light/dark`.

---

### Task 5: Grid renderer + link/group cards (view mode)

**Files:**
- Create: `src/components/Dashboard.tsx`, `src/components/GridView.tsx`, `src/components/cards/LinkCard.tsx`, `src/components/cards/GroupCard.tsx`, `src/components/Icon.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useStore`, `THEMES`
- Produces: `<Dashboard editMode={boolean}/>`; `posToStyle(x,y,w,h,grid): CSSProperties` exported from `GridView.tsx`:
```ts
export function posToStyle(x: number, y: number, w: number, h: number, grid: { cols: number; rowHeight: number; gap: number }): React.CSSProperties {
  return {
    left: `calc(${(x / grid.cols) * 100}% + ${x * grid.gap / 2}px)`,
    top: y * (grid.rowHeight + grid.gap),
    width: `calc(${(w / grid.cols) * 100}% - ${(grid.cols - w) * grid.gap / grid.cols}px)`,
    height: h * grid.rowHeight + (h - 1) * grid.gap,
  }
}
```

- [ ] **Step 1: `Icon.tsx`** — resolution order: `customIcon` (→ `/api/icons/<file>`) → bundled dashboard-icons (`import * as icons from '@dashboard-icons/react'`, match `props.icon` case-insensitive) → `favicon:https://…` or derive domain from `props.url` → Google s2 → letter fallback tile with accent gradient.

- [ ] **Step 2: `LinkCard.tsx`** — card with icon, title; `<a href target="_blank" rel="noreferrer">` in view mode; `e.preventDefault()` in edit mode. Hover lift via `.card:hover` css.

- [ ] **Step 3: `GroupCard.tsx`** — renders title + nested list of link titles (children rendered as simple rows inside card; free drag inside groups is out of scope v1).

- [ ] **Step 4: `GridView.tsx`** — `position: relative` container, absolutely positioned cards via `posToStyle`. Container height = max(y+h) computed from items.

- [ ] **Step 5: Wire into App, verify with hardcoded items in dev, commit:** `feat: grid renderer and link/group cards`.

---

### Task 6: Icon upload + backend icons/health/weather routes

**Files:**
- Create: `server/routes.test.ts`
- Modify: `server/index.ts`

**Interfaces:**
- Produces: `POST /api/icons` (multipart `file`, svg/png only, ≤512KB → `data/icons/<nanoid>.<ext>`), `GET /api/icons` → `{files: string[]}`, `GET /api/health?url=` → `{status:'up'|'down', latencyMs}`, `GET /api/weather?lat=&lon=` (open-meteo proxy, 10-min cache), static: `/api/icons-files/*` serving uploaded files, `/` serving `dist/`.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildApp } from './index.js'

describe('routes', () => {
  const app = buildApp({ dataDir: mkdtempSync(join(tmpdir(), 'dash-r-')), skipListen: true })

  it('health returns down for unreachable url fast', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health?url=http://127.0.0.1:1' })
    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('down')
    expect(res.json().latencyMs).toBeGreaterThanOrEqual(0)
  })
  it('health returns 400 without url', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/health' })).statusCode).toBe(400)
  })
  it('icon upload rejects non-image', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/icons', headers: { 'content-type': 'multipart/form-data; boundary=x' }, payload: '--x\nContent-Disposition: form-data; name="file"; filename="a.txt"\nContent-Type: text/plain\n\nhi\n--x--' })
    expect(res.statusCode).toBe(400)
  })
  it('weather caches', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ current: { temperature_2m: 20 } }) }))
    vi.stubGlobal('fetch', fetchMock)
    await app.inject({ method: 'GET', url: '/api/weather?lat=50&lon=14' })
    await app.inject({ method: 'GET', url: '/api/weather?lat=50&lon=14' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
```

Note: refactor `server/index.ts` to export `buildApp({ dataDir, skipListen })` returning configured Fastify instance; entrypoint calls `buildApp(...).listen(...)`.

- [ ] **Step 2: Run, FAIL. Implement routes:**

```ts
// health
app.get('/api/health', async (req, reply) => {
  const { url } = req.query as { url?: string }
  if (!url) return reply.code(400).send({ error: 'url required' })
  const start = Date.now()
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 5000)
    await fetch(url, { method: 'HEAD', signal: ctrl.signal, redirect: 'follow' })
    clearTimeout(t)
    return { status: 'up', latencyMs: Date.now() - start }
  } catch { return { status: 'down', latencyMs: Date.now() - start } }
})
```
Icons: use `@fastify/multipart`; validate mimetype `image/(svg\+xml|png)` and size ≤512KB; write to `dataDir/icons/<nanoid()><ext>`; GET returns list. Weather: in-memory `Map<cacheKey,{ts,data}>`, TTL 600_000 ms; fetch `https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&forecast_days=3`. Static serving via `@fastify/static`.

- [ ] **Step 3: Run, PASS. Commit:** `feat: icon upload, health probe, weather proxy routes`.

---

### Task 7: Widgets (clock, weather, status)

**Files:**
- Create: `src/components/cards/ClockWidget.tsx`, `src/components/cards/WeatherWidget.tsx`, `src/components/cards/StatusWidget.tsx`

**Interfaces:**
- Consumes: item props (`format24h`, `showSeconds`, `lat`, `lon`, `targets: string[]`)
- Produces: self-polling widget components; status polls `/api/health?url=` every 30s and shows green/red dot + ms; weather shows current temp + weather-code icon + 3-day min/max; clock `setInterval` 1s when `showSeconds` else 30s.

- [ ] **Step 1: Implement ClockWidget** — `useState(new Date())` + interval; format via `Intl.DateTimeFormat`.

- [ ] **Step 2: Implement WeatherWidget** — fetch `/api/weather?lat=&lon=` on mount + every 10 min; map weather_code to emoji (`0:☀️, 1-2:🌤️, 3:☁️, 45-48:🌫️, 51-67:🌧️, 71-77:🌨️, 80-82:🌧️, 95+:⛈️`).

- [ ] **Step 3: Implement StatusWidget** — props.targets → parallel `/api/health` calls; rows `● Title ms`.

- [ ] **Step 4: Verify with hardcoded widget items, commit:** `feat: clock, weather, status widgets`.

---

### Task 8: Edit mode + drag-n-drop + resize

**Files:**
- Create: `src/components/EditGrid.tsx`, `src/components/EditToolbar.tsx`
- Modify: `src/components/Dashboard.tsx`, `src/components/GridView.tsx`

**Interfaces:**
- Consumes: `useStore.moveItem/resizeItem/addItem/removeItem`, dnd-kit
- Produces: `<EditGrid/>` — DndContext with pointer sensor (activation distance 6px), items draggable; on drag end compute snapped cell: `x = clamp(round((pointer.x - containerLeft) / (cellW + gap) - 0.5), 0, cols-w)`, same for y. Resize: bottom-right handle + pointermove with same snapping (min 1×1, max w=cols). Overlap prevention: after any move/resize, `resolveOverlaps(items)` pushes colliding items down (y + collider height) until no overlap — unit-testable pure function exported from `EditGrid.tsx`.

- [ ] **Step 1: Write failing test for resolveOverlaps**

```ts
// src/components/editGrid.test.ts
import { resolveOverlaps } from './EditGrid'
const mk = (id: string, x: number, y: number, w = 2, h = 1) => ({ id, x, y, w, h })
it('pushes overlapping item below', () => {
  const items = [mk('a', 0, 0), mk('b', 0, 0)]
  const out = resolveOverlaps(items)
  expect(out.find(i => i.id === 'a').y).toBe(0)
  expect(out.find(i => i.id === 'b').y).toBe(1)
})
it('keeps non-overlapping items untouched', () => {
  const items = [mk('a', 0, 0), mk('b', 4, 4)]
  expect(resolveOverlaps(items)).toEqual(items)
})
```

- [ ] **Step 2: Implement `resolveOverlaps`** (sort by y,x; for each item, if intersects an earlier-placed rect, set y to bottom of collider; repeat until stable, guard 100 iterations).

- [ ] **Step 3: Implement EditToolbar** — top bar (visible only in edit mode): Add link / Add group / Add clock / Add weather / Add status buttons, Layout, Appearance, Data buttons opening the respective settings modals (Task 9), Edit-mode toggle switch always visible in a corner floating button.

- [ ] **Step 4: Implement drag + resize with dnd-kit, wire snapping + resolveOverlaps on drop.**

- [ ] **Step 5: Verify drag/resize/add/delete manually in browser; commit:** `feat: edit mode with drag-drop, resize, overlap resolution`.

---

### Task 9: Settings modals (Appearance, Layout, Card editor, Data)

**Files:**
- Create: `src/components/settings/AppearanceModal.tsx`, `src/components/settings/LayoutModal.tsx`, `src/components/settings/CardModal.tsx`, `src/components/settings/DataModal.tsx`, `src/components/Modal.tsx`

**Interfaces:**
- Consumes: store setters, `/api/icons` upload, THEMES
- Produces: `Modal.tsx` — framer-motion animated overlay (scale+fade in, fade out), click-outside/Esc close.
  - **AppearanceModal**: theme gallery (4 preview tiles showing mini card mock with theme tokens), light/dark segmented control, accent `<input type="color">`, opacity slider 0–1, blur slider 0–40, background image URL/upload → sets `theme.background` (applied in ThemeProvider as fixed `body::before` layer with dim overlay).
  - **LayoutModal**: cols/rowHeight/gap number inputs → `setGrid`.
  - **CardModal** (opened on card click in edit mode): title, url, icon picker (search input filtering bundled dashboard-icons, favicon preview, upload button → POST /api/icons then set `customIcon`), for widgets: lat/lon or targets textarea (one URL per line), format toggles; Delete button → `removeItem`.
  - **DataModal**: Export (download config.json via Blob), Import (file input → parse → `setConfig`), Reset to defaults.

- [ ] **Step 1–5: Implement each modal one at a time, verify in browser, single commit:** `feat: settings modals for appearance, layout, cards, data`.

---

### Task 10: Responsive + polish + View Transitions

**Files:**
- Modify: `src/components/GridView.tsx`, `src/themes.css`, `src/components/Dashboard.tsx`

- [ ] **Step 1: Mobile fallback** — `@media (max-width: 768px)`: cards become `position: static; width: 100% !important; height: auto` stacked column, order by y then x; edit toolbar hides drag/resize.
- [ ] **Step 2: Theme-switch animation** — wrap mode/theme toggle handler in `document.startViewTransition?.(() => applyTokens())` with fallback to plain transition.
- [ ] **Step 3: Entrance animation** — cards stagger in via framer-motion `motion.div` (opacity 0→1, y 8→0, delay = index*30ms).
- [ ] **Step 4: Commit:** `feat: responsive layout, view transitions, entrance animations`.

---

### Task 11: Docker + README

**Files:**
- Create: `Dockerfile`, `.dockerignore`, `README.md`

- [ ] **Step 1: Dockerfile** (multi-stage):
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY --from=build /app/dist ./dist
ENV DATA_DIR=/app/data
VOLUME /app/data
EXPOSE 3000
CMD ["node", "--import", "tsx", "server/index.ts"]
```

- [ ] **Step 2: README** — features, quickstart (`docker run -p 3000:3000 -v mi-data:/app/data ghcr.io/…/mi-dashboard`), config file location, screenshots section.

- [ ] **Step 3: Verify `docker build` succeeds and container serves dashboard. Commit:** `feat: docker packaging and readme`.

---

### Task 12: E2E smoke test

**Files:**
- Create: `tests/e2e/dashboard.spec.ts`, `playwright.config.ts`

- [ ] **Step 1: Config** — playwright.config.ts: `webServer` starts `npm run server` with `DATA_DIR=tmp-e2e` and `npm run dev`, baseURL localhost:5173.

- [ ] **Step 2: Test**:
```ts
import { test, expect } from '@playwright/test'
test('add link, switch theme, persists after reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /edit/i }).click()
  await page.getByRole('button', { name: /add link/i }).click()
  await page.getByLabel(/title/i).fill('GitHub')
  await page.getByLabel(/url/i).fill('https://github.com')
  await page.getByRole('button', { name: /save/i }).click()
  await page.getByRole('button', { name: /appearance/i }).click()
  await page.getByText('Web 3.0 Neon').click()
  await page.reload()
  await expect(page.getByText('GitHub')).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'web30')
})
```

- [ ] **Step 3: Run `npm run test:e2e`, fix, commit:** `test: e2e smoke test`.
