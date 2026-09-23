import { useEffect, useState } from 'react'
import { MotionConfig } from 'framer-motion'
import { useStore } from '../store'
import GridView from './GridView'
import EditGrid from './EditGrid'
import EditToolbar from './EditToolbar'
import AppearanceModal from './settings/AppearanceModal'
import LayoutModal from './settings/LayoutModal'
import CardModal from './settings/CardModal'
import DataModal from './settings/DataModal'

type ModalState =
  | { kind: 'appearance' }
  | { kind: 'layout' }
  | { kind: 'data' }
  | { kind: 'card'; id: string }
  | null

export default function Dashboard({ editMode: initialEditMode = false }: { editMode?: boolean }) {
  const [editMode, setEditMode] = useState(initialEditMode)
  const [modal, setModal] = useState<ModalState>(null)
  const items = useStore((s) => s.config.items)
  const grid = useStore((s) => s.config.grid)
  const lastError = useStore((s) => s.lastError)
  const dismissError = useStore((s) => s.dismissError)
  const themeId = useStore((s) => s.config.theme.id)
  const mode = useStore((s) => s.config.theme.mode)

  // Telemetry clock: 1s tick, tabular mono, NOC header.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  // Weather telemetry appears only when a weather widget is configured.
  const weatherWidget = items.find((i) => i.type === 'widget:weather' && (i.props as { lat?: number; lon?: number }).lat != null && (i.props as { lat?: number; lon?: number }).lon != null)
  const [temp, setTemp] = useState<string | null>(null)
  useEffect(() => {
    if (!weatherWidget) { setTemp(null); return }
    const { lat, lon } = weatherWidget.props as { lat: number; lon: number }
    let alive = true
    fetch(`/api/weather?lat=${lat}&lon=${lon}`)
      .then((r) => r.json())
      .then((d: { current?: { temperature_2m?: number } }) => { if (alive && d.current?.temperature_2m != null) setTemp(`${Math.round(d.current.temperature_2m)}°C`) })
      .catch(() => {})
    return () => { alive = false }
  }, [weatherWidget])
  const time = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  const date = now.toLocaleDateString('ru-RU', { weekday: 'long', day: '2-digit', month: 'long' })
  const themeName = themeId === 'noc-night' ? 'НОЧНАЯ СМЕНА' : themeId === 'noc-day' ? 'ДНЕВНОЙ ДЕЖУРНЫЙ' : themeId === 'noc-alert' ? 'АВАРИЙНЫЙ' : themeId === 'noc-patrol' ? 'ПОЛЕВОЙ' : themeId.toUpperCase()

  const closeModal = () => setModal(null)
  const cardItem = modal?.kind === 'card' ? items.find((i) => i.id === modal.id) : undefined

  return (
    <div className="app">
      <header className="noc-header">
        <span className="noc-clock">{time}</span>
        <span className="noc-header-side">
          {temp && <span>{temp}</span>}
          <span>{date}</span>
          <span className="noc-theme-label">{themeName}</span>
        </span>
        <button
          type="button"
          className={`edit-toggle${editMode ? ' active' : ''}`}
          onClick={() => setEditMode((v) => !v)}
          aria-pressed={editMode}
        >
          {editMode ? 'Готово' : 'Редактировать'}
        </button>
      </header>
      {/* reducedMotion="user": entrance staggers degrade to opacity-only when
          the OS prefers reduced motion (matches the CSS media query). */}
      <MotionConfig reducedMotion="user">
        <EditToolbar
          editMode={editMode}
          onOpenAppearance={() => setModal({ kind: 'appearance' })}
          onOpenLayout={() => setModal({ kind: 'layout' })}
          onOpenData={() => setModal({ kind: 'data' })}
          onOpenCard={(id) => setModal({ kind: 'card', id })}
        />
        {editMode ? (
          <EditGrid onEditCard={(id) => setModal({ kind: 'card', id })} />
        ) : (
          <GridView items={items} grid={grid} editMode={false} />
        )}
      </MotionConfig>

      {lastError && (
        <div className="error-banner" role="alert">
          <span>{lastError}</span>
          <button type="button" className="error-banner-close" onClick={dismissError} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}

      <AppearanceModal open={modal?.kind === 'appearance'} onClose={closeModal} />
      <LayoutModal open={modal?.kind === 'layout'} onClose={closeModal} />
      <DataModal open={modal?.kind === 'data'} onClose={closeModal} />
      {cardItem && <CardModal itemId={cardItem.id} onClose={closeModal} />}
    </div>
  )
}
