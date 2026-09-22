import { useStore } from '../../store'
import Modal from '../Modal'

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

/** Layout settings: grid columns, row height, gap. */
export default function LayoutModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const grid = useStore((s) => s.config.grid)
  const setGrid = useStore((s) => s.setGrid)

  return (
    <Modal open={open} onClose={onClose} title="Layout">
      <div className="field-row">
        <label className="field">
          <span>Columns (4–24)</span>
          <input
            type="number"
            min={4}
            max={24}
            value={grid.cols}
            onChange={(e) => setGrid({ cols: clamp(Math.round(Number(e.target.value)) || 4, 4, 24) })}
          />
        </label>
        <label className="field">
          <span>Row height (40–200)</span>
          <input
            type="number"
            min={40}
            max={200}
            value={grid.rowHeight}
            onChange={(e) => setGrid({ rowHeight: clamp(Math.round(Number(e.target.value)) || 40, 40, 200) })}
          />
        </label>
        <label className="field">
          <span>Gap (0–48)</span>
          <input
            type="number"
            min={0}
            max={48}
            value={grid.gap}
            onChange={(e) => setGrid({ gap: clamp(Math.round(Number(e.target.value)) || 0, 0, 48) })}
          />
        </label>
      </div>
    </Modal>
  )
}