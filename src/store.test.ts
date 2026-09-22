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
  it('save failure sets lastError, success clears it', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })))
    await useStore.getState().save()
    expect(useStore.getState().lastError).toBe('Не удалось сохранить настройки — проверьте соединение и попробуйте снова')
    expect(useStore.getState().status).toBe('error')
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true })))
    await useStore.getState().save()
    expect(useStore.getState().lastError).toBeNull()
    vi.unstubAllGlobals()
  })
  it('network error during save sets lastError', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    await useStore.getState().save()
    expect(useStore.getState().lastError).toBe('Не удалось сохранить настройки — проверьте соединение и попробуйте снова')
    vi.unstubAllGlobals()
  })
})