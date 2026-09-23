import { useEffect, useState } from 'react'

/* Общий реестр health-проб: один таймер на URL, карточки только подписаны.
   Не зависит от ре-маунтов карточек при тикающем телеметрийном часах. */
export type HealthState = 'pending' | 'up' | 'down'
export type Health = { state: HealthState; latencyMs: number | null }

const cache = new Map<string, Health>()
const timers = new Map<string, ReturnType<typeof setInterval>>()
const listeners = new Map<string, Set<(s: Health) => void>>()

function probe(url: string) {
  const start = performance.now()
  fetch(`/api/health?url=${encodeURIComponent(url)}`)
    .then((r) => r.json())
    .then((d: { status?: string; latencyMs?: number }) =>
      set(url, {
        state: d.status === 'up' ? 'up' : 'down',
        latencyMs: typeof d.latencyMs === 'number' ? d.latencyMs : Math.round(performance.now() - start),
      }),
    )
    .catch(() => set(url, { state: 'down', latencyMs: null }))
}

function set(url: string, s: Health) {
  cache.set(url, s)
  listeners.get(url)?.forEach((fn) => fn(s))
}

function subscribe(url: string, fn: (s: Health) => void): () => void {
  if (!cache.has(url)) cache.set(url, { state: 'pending', latencyMs: null })
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

export function useHealth(url: string, enabled: boolean): Health {
  const [state, setState] = useState<Health>(() => ({ state: 'pending', latencyMs: null }))
  useEffect(() => {
    if (!url || !enabled) { setState({ state: 'pending', latencyMs: null }); return }
    return subscribe(url, setState)
  }, [url, enabled])
  return url && enabled ? state : { state: 'pending', latencyMs: null }
}