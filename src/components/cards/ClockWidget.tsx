import { useEffect, useState } from 'react'
import type { DashboardConfig } from '../../../server/config.js'

type Item = DashboardConfig['items'][number]
type ClockProps = Item['props']

export default function ClockWidget({ item }: { item: Item }) {
  const { format24h = true, showSeconds = false, title = '' } = item.props as ClockProps
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    // 1s tick when seconds are shown, otherwise 30s is enough
    const intervalMs = showSeconds ? 1_000 : 30_000
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [showSeconds])

  const time = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    ...(showSeconds ? { second: '2-digit' } : {}),
    hour12: !format24h,
  }).format(now)

  const date = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(now)

  return (
    <div className="card card-widget" data-widget="widget:clock">
      <span className="clock-time">{time}</span>
      <span className="clock-date">{date}</span>
      {title ? <span className="card-title">{title}</span> : null}
    </div>
  )
}