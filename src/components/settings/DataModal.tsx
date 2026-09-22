import { useRef } from 'react'
import { defaultConfigClient, useStore } from '../../store'
import Modal from '../Modal'

/** Basic structural check before accepting an imported config file. */
function looksLikeConfig(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.theme === 'object' && typeof v.grid === 'object' && Array.isArray(v.items)
}

/**
 * Data settings: export config.json (Blob download), import a config file
 * (parsed + basic shape check → setConfig + save; the server re-validates
 * with zod on PUT), reset to defaults with a confirm.
 */
export default function DataModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const config = useStore((s) => s.config)
  const setConfig = useStore((s) => s.setConfig)
  const save = useStore((s) => s.save)
  const fileInput = useRef<HTMLInputElement>(null)

  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'config.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const importConfig = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text())
      if (!looksLikeConfig(parsed)) throw new Error('missing theme/grid/items')
      setConfig(parsed as typeof config)
      await save()
    } catch (err) {
      alert(`Import failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const resetConfig = () => {
    if (!confirm('Reset the dashboard to defaults? All cards will be removed.')) return
    setConfig(defaultConfigClient())
    save()
  }

  return (
    <Modal open={open} onClose={onClose} title="Data">
      <div className="field">
        <span>Configuration</span>
        <div className="field-inline">
          <button type="button" className="btn-primary" onClick={exportConfig}>
            ⬇ Export config.json
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importConfig(f)
              e.target.value = ''
            }}
          />
          <button type="button" className="btn-secondary" onClick={() => fileInput.current?.click()}>
            ⬆ Import config.json
          </button>
          <button type="button" className="btn-danger" onClick={resetConfig}>
            Reset to defaults
          </button>
        </div>
        <p className="field-hint">
          Export downloads the current dashboard; Import replaces it (autosaves); Reset clears all
          cards and restores default appearance and layout.
        </p>
      </div>
    </Modal>
  )
}