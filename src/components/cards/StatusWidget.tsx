import { useEffect, useState } from 'react'
import type { DashboardConfig } from '../../../server/config.js'
import { useHealth } from '../../lib/health'

type Item = DashboardConfig['items'][number]
type StatusProps = Item['props']

/* NOC-телеметрия: LED + латентность по каждому целевому адресу.
   Пробы идут через общий health-стор (один таймер на URL). */
function StatusRow({ target }: { target: string }) {
  const health = useHealth(target, true)
  const host = (() => { try { return new URL(target).host } catch { return target } })()
  const dot = health.state === 'up' ? 'led-up' : health.state === 'down' ? 'led-down' : 'led-warn'
  const ms = health.state === 'pending'
    ? '…'
    : health.state === 'up' && health.latencyMs != null
      ? `${health.latencyMs} мс`
      : 'недоступен'
  return (
    <div className="status-row">
      <span className={`led ${dot}`} aria-hidden="true" />
      <span className="status-host mono">{host}</span>
      <span className="status-latency mono">{ms}</span>
    </div>
  )
}

export default function StatusWidget({ item }: { item: Item }) {
  const { targets = [], title = '' } = item.props as StatusProps
  return (
    <div className="card card-widget" data-widget="widget:status">
      {title ? <span className="card-title">{title}</span> : null}
      <div className="status-rows">
        {targets.length === 0 && <span className="status-empty">Адреса сервисов не заданы</span>}
        {targets.map((t) => (
          <StatusRow key={t} target={t} />
        ))}
      </div>
    </div>
  )
}