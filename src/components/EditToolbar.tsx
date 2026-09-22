import { useStore } from '../store'
import { applyResolvedOverlaps } from './EditGrid'

interface EditToolbarProps {
  editMode: boolean
  onToggle: () => void
}

const ADD_BUTTONS: Array<[type: string, label: string]> = [
  ['link', 'Add link'],
  ['group', 'Add group'],
  ['widget:clock', 'Add clock'],
  ['widget:weather', 'Add weather'],
  ['widget:status', 'Add status'],
]

/**
 * Edit-mode UI. Add-buttons are visible only in edit mode (card settings
 * modals come with the settings task); the edit-mode toggle is always
 * visible as a floating corner button.
 */
export default function EditToolbar({ editMode, onToggle }: EditToolbarProps) {
  const addItem = useStore((s) => s.addItem)

  const handleAdd = (type: string) => {
    addItem(type) // starts at 0,0 — resolve any resulting overlap immediately
    applyResolvedOverlaps()
  }

  return (
    <>
      {editMode && (
        <div className="edit-toolbar">
          {ADD_BUTTONS.map(([type, label]) => (
            <button key={type} type="button" className="edit-toolbar-btn" onClick={() => handleAdd(type)}>
              {label}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        className={`edit-toggle${editMode ? ' active' : ''}`}
        onClick={onToggle}
        aria-pressed={editMode}
        title={editMode ? 'Leave edit mode' : 'Enter edit mode'}
      >
        {editMode ? '✓ Done' : '✏️ Edit'}
      </button>
    </>
  )
}
