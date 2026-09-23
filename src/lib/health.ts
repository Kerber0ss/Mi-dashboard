import { useEffect, useState } from 'react'

/* Общий реестр health-проб: один таймер на URL, карточки только подписаны.
   Не зависит от ре-маунтов карточек при тикающем телеметрийном часах. */
export type HealthState = 'pending' | 'up' | 'down'

const cache = new Map<string, HealthState>()
const timers = new Map<string, ReturnType<typeof setInterval>>()
const listeners = new Map<string, Set<(s: HealthState) => void>>()

function probe(url: string) {
  fetch(`/api/health?url=${encodeURIComponent(url)}`)
    .then((r) => r.json())
    .then((d: { status?: string }) => set(url, d.status === 'up' ? 'up' : 'down'))
    .catch(() => set(url, 'down'))
}

function set(url: string, s: HealthState) {
  cache.set(url, s)
  listeners.get(url)?.forEach((fn) => fn(s))
}

function subscribe(url: string, fn: (s: HealthState) => void): () => void {
  if (!cache.has(url)) cache.set(url, 'pending')
  if (!timers.has(url)) {
    probe(url)
    timers.set(url, setInterval(() => probe(url), 60_000))
  }
  if (!listeners.has(url)) listeners.set(url, new Set())
  listeners.get(url)!.add(fn)
  fn(cache.get(url)!)
  return () => {
    listeners.get(url)?.delete(fn)
  }
}

export function useHealth(url: string, enabled: boolean): HealthState {
  const [state, setState] = useState<HealthState>(() => (url && enabled ? cache.get(url) ?? 'pending' : 'pending'))
  useEffect(() => {
    if (!url || !enabled) { setState('pending'); return }
    return subscribe(url, setState)
  }, [url, enabled])
  return url && enabled ? state : 'pending'
}