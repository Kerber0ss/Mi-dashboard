import { create } from 'zustand'
import type { DashboardConfig } from '../server/config.js'
import { nanoid } from 'nanoid'

type State = {
  config: DashboardConfig
  status: 'loading' | 'ready' | 'error'
  lastError: string | null
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
  dismissError: () => void
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
  config: defaultConfigClient(), status: 'loading', lastError: null,
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
    try {
      const res = await fetch('/api/config', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(get().config) })
      if (!res.ok) set({ status: 'error', lastError: 'Не удалось сохранить настройки — проверьте соединение и попробуйте снова' })
      else set({ lastError: null })
    } catch {
      set({ status: 'error', lastError: 'Не удалось сохранить настройки — проверьте соединение и попробуйте снова' })
    }
  },
  dismissError: () => set({ lastError: null }),
}))