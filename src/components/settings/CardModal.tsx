import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../../store'
import type { DashboardConfig } from '../../../server/config.js'
import Modal from '../Modal'
import Icon from '../Icon'
import { ICON_NAMES } from './iconNames'

type Item = DashboardConfig['items'][number]

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

/**
 * Card editor, opened by clicking a card in edit mode. Common: title (+ url
 * for link/group), icon picker with search over bundled dashboard-icons,
 * custom icon upload via POST /api/icons. Widgets get their own fields:
 * weather lat/lon, status targets, clock format toggles. Delete removes the
 * item from the dashboard.
 */
export default function CardModal({ itemId, onClose }: { itemId: string; onClose: () => void }) {
  const item = useStore((s) => s.config.items.find((i) => i.id === itemId))
  const updateItem = useStore((s) => s.updateItem)
  const removeItem = useStore((s) => s.removeItem)

  const [iconQuery, setIconQuery] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  // Item gone (deleted elsewhere / delete in this modal) → close
  useEffect(() => {
    if (!item) onClose()
  }, [item, onClose])

  const filteredIcons = useMemo(() => {
    const q = iconQuery.trim().toLowerCase().replace(/\s+/g, '-')
    if (!q) return ICON_NAMES
    return ICON_NAMES.filter((n) => n.includes(q))
  }, [iconQuery])

  if (!item) return null

  const { title = '', url = '', icon = null, customIcon = null } = item.props as Item['props']
  const patch = (p: Record<string, unknown>) => updateItem(item.id, p)

  const uploadIcon = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/icons', { method: 'POST', body: fd })
      const json = (await res.json()) as { file?: string; error?: string }
      if (!res.ok || !json.file) throw new Error(json.error ?? `HTTP ${res.status}`)
      patch({ customIcon: json.file })
    } catch (err) {
      alert(`Icon upload failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setUploading(false)
    }
  }

  const isWidget = item.type.startsWith('widget:')
  const typeLabel: Record<string, string> = {
    link: 'Link card',
    group: 'Group card',
    'widget:clock': 'Clock widget',
    'widget:weather': 'Weather widget',
    'widget:status': 'Status widget',
  }

  return (
    <Modal open onClose={onClose} title={`${typeLabel[item.type] ?? item.type}`} wide>
      <div className="field-row">
        <label className="field">
          <span>Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="My service"
          />
        </label>
        {(item.type === 'link' || item.type === 'group') && (
          <label className="field">
            <span>URL</span>
            <input
              type="text"
              value={url}
              onChange={(e) => patch({ url: e.target.value })}
              placeholder="https://example.com"
            />
          </label>
        )}
      </div>

      {item.type === 'widget:weather' && (
        <div className="field-row">
          <label className="field">
            <span>Latitude (−90…90)</span>
            <input
              type="number"
              step="any"
              value={(item.props.lat as number | undefined) ?? ''}
              onChange={(e) =>
                patch({
                  lat: e.target.value === '' ? undefined : clamp(Number(e.target.value), -90, 90),
                })
              }
            />
          </label>
          <label className="field">
            <span>Longitude (−180…180)</span>
            <input
              type="number"
              step="any"
              value={(item.props.lon as number | undefined) ?? ''}
              onChange={(e) =>
                patch({
                  lon: e.target.value === '' ? undefined : clamp(Number(e.target.value), -180, 180),
                })
              }
            />
          </label>
        </div>
      )}

      {item.type === 'widget:status' && (
        <label className="field">
          <span>Targets (one URL per line)</span>
          <textarea
            rows={5}
            value={((item.props.targets as string[] | undefined) ?? []).join('\n')}
            onChange={(e) => patch({ targets: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
            placeholder={'https://example.com\nhttps://api.example.com/health'}
          />
        </label>
      )}

      {item.type === 'widget:clock' && (
        <div className="field-row">
          <label className="field field-check">
            <input
              type="checkbox"
              checked={(item.props.format24h as boolean | undefined) ?? true}
              onChange={(e) => patch({ format24h: e.target.checked })}
            />
            <span>24-hour format</span>
          </label>
          <label className="field field-check">
            <input
              type="checkbox"
              checked={(item.props.showSeconds as boolean | undefined) ?? false}
              onChange={(e) => patch({ showSeconds: e.target.checked })}
            />
            <span>Show seconds</span>
          </label>
        </div>
      )}

      {!isWidget && (
        <>
          <div className="field">
            <span>Icon</span>
            <div className="icon-current">
              <Icon icon={icon} customIcon={customIcon} url={url} title={title} size={48} />
              <div className="icon-current-actions">
                <input
                  ref={fileInput}
                  type="file"
                  accept=".svg,.png,image/svg+xml,image/png"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) uploadIcon(f)
                    e.target.value = ''
                  }}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={uploading}
                  onClick={() => fileInput.current?.click()}
                >
                  {uploading ? 'Uploading…' : '⬆ Upload icon (svg/png)'}
                </button>
                {(icon || customIcon) && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => patch({ icon: null, customIcon: null })}
                  >
                    Reset icon
                  </button>
                )}
              </div>
            </div>

            <input
              type="text"
              className="icon-search"
              placeholder="Search icons…"
              value={iconQuery}
              onChange={(e) => setIconQuery(e.target.value)}
            />
            <div className="icon-grid" role="listbox" aria-label="Icon library">
              {filteredIcons.length === 0 && <span className="icon-grid-empty">No matching icons</span>}
              {filteredIcons.map((name) => (
                <button
                  key={name}
                  type="button"
                  role="option"
                  aria-selected={icon === name}
                  title={name}
                  className={`icon-option${icon === name ? ' active' : ''}`}
                  onClick={() => patch({ icon: name, customIcon: null })}
                >
                  <Icon icon={name} size={26} />
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="modal-footer">
        <button type="button" className="btn-danger" onClick={() => { removeItem(item.id); onClose() }}>
          Delete card
        </button>
        <button type="button" className="btn-primary" onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  )
}