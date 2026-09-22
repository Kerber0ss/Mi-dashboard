import { useEffect, useState } from 'react'
import type { DashboardConfig } from '../../../server/config.js'

type Item = DashboardConfig['items'][number]
type WeatherProps = Item['props']

type WeatherResponse = {
  current?: { temperature_2m?: number; weather_code?: number }
  daily?: {
    time?: string[]
    temperature_2m_max?: number[]
    temperature_2m_min?: number[]
  }
}

type WeatherState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: WeatherResponse }

const REFRESH_MS = 10 * 60 * 1000 // 10 minutes

function codeToEmoji(code: number | undefined): string {
  if (code === undefined) return '🌡️'
  if (code === 0) return '☀️'
  if (code <= 2) return '🌤️'
  if (code === 3) return '☁️'
  if (code <= 48) return '🌫️'
  if (code <= 67) return '🌧️'
  if (code <= 77) return '🌨️'
  if (code <= 82) return '🌧️'
  if (code >= 95) return '⛈️'
  return '🌤️'
}

const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short' })

export default function WeatherWidget({ item }: { item: Item }) {
  const { lat, lon, title = '' } = item.props as WeatherProps
  const [state, setState] = useState<WeatherState>({ kind: 'loading' })

  useEffect(() => {
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      setState({ kind: 'error', message: 'lat/lon not configured' })
      return
    }
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as WeatherResponse
        if (!cancelled) setState({ kind: 'ready', data })
      } catch (err) {
        if (!cancelled) setState({ kind: 'error', message: err instanceof Error ? err.message : 'fetch failed' })
      }
    }
    load()
    const id = setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [lat, lon])

  return (
    <div className="card card-widget" data-widget="widget:weather">
      {state.kind === 'loading' && <span className="widget-placeholder">loading…</span>}
      {state.kind === 'error' && <span className="widget-error" role="alert">⚠ {state.message}</span>}
      {state.kind === 'ready' && (
        <>
          <span className="weather-current">
            <span className="weather-emoji">{codeToEmoji(state.data.current?.weather_code)}</span>
            <span className="weather-temp">
              {state.data.current?.temperature_2m !== undefined
                ? `${Math.round(state.data.current.temperature_2m)}°`
                : '–'}
            </span>
          </span>
          <ul className="weather-days">
            {(state.data.daily?.time ?? []).map((day, i) => (
              <li key={day}>
                <span className="weather-day-name">{dayFmt.format(new Date(day))}</span>
                <span className="weather-day-range">
                  {Math.round(state.data.daily?.temperature_2m_min?.[i] ?? NaN)}° /{' '}
                  {Math.round(state.data.daily?.temperature_2m_max?.[i] ?? NaN)}°
                </span>
              </li>
            ))}
          </ul>
          {title ? <span className="card-title">{title}</span> : null}
        </>
      )}
    </div>
  )
}