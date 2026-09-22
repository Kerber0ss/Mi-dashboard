import { useEffect, useState } from 'react'
import type { DashboardConfig } from '../../../server/config.js'

type Item = DashboardConfig['items'][number]
type StatusProps = Item['props']

type TargetState = { status: 'pending' } | { status: 'up' | 'down'; latencyMs: number | null }

const POLL_MS = 30_000 // 30 seconds

function targetLabel(target: string): string {
  try {
    return new URL(target).hostname
  } catch {
    return target
  }
}

export default function StatusWidget({ item }: { item: Item }) {
  const { targets = [], title = '' } = item.props as StatusProps
  const [states, setStates] = useState<Record<string, TargetState>>({})

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      const entries = await Promise.all(
        targets.map(async (target) => {
          try {
            const res = await fetch(`/api/health?url=${encodeURIComponent(target)}`)
            if (!res.ok) return [target, { status: 'down', latencyMs: null }] as const
            const data = (await res.json()) as { status?: string; latencyMs?: number }
            return [
              target,
              {
                status: data.status === 'up' ? 'up' : 'down',
                latencyMs: typeof data.latencyMs === 'number' ? data.latencyMs : null,
              },
            ] as const
          } catch {
            return [target, { status: 'down', latencyMs: null }] as const
          }
        }),
      )
      if (!cancelled) setStates(Object.fromEntries(entries))
    }
    check()
    const id = setInterval(check, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [targets])

  return (
    <div className="card card-widget" data-widget="widget:status">
      {title ? <span className="card-title">{title}</span> : null}
      <ul className="status-rows">
        {targets.map((target) => {
          const state = states[target] ?? { status: 'pending' as const }
          const up = state.status === 'up'
          return (
            <li key={target} className="status-row">
              <span
                className="status-dot"
                style={{
                  color: state.status === 'pending' ? '#888' : up ? '#22c55e' : '#ef4444',
                }}
              >
                ●
              </span>
              <span className="status-label">{targetLabel(target)}</span>
              <span className="status-latency">
                {state.status === 'pending' ? '…' : state.latencyMs !== null ? `${state.latencyMs}ms` : 'down'}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}