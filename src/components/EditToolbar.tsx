import { useStore } from '../store'
import { applyResolvedOverlaps } from './EditGrid'

interface EditToolbarProps {
  editMode: boolean
  onToggle: () => void
  onOpenAppearance: () => void
  onOpenLayout: () => void
  onOpenData: () => void
  /** Called after a new item is added so the parent can open its editor */
  onOpenCard: (id: string) => void
}

const ADD_BUTTONS: Array<[type: string, label: string]> = [
  ['link', 'Ссылка'],
  ['group', 'Группа'],
  ['widget:clock', 'Часы'],
  ['widget:weather', 'Погода'],
  ['widget:status', 'Статус сервисов'],
]

/**
 * Edit-mode UI. Add-buttons plus settings buttons (Appearance / Layout /
 * Data) are visible only in edit mode; the edit-mode toggle is always
 * visible as a floating corner button. Clicking a card in edit mode opens
 * the card editor (handled by EditGrid → Dashboard).
 */
export default function EditToolbar({ editMode, onToggle, onOpenAppearance, onOpenLayout, onOpenData, onOpenCard }: EditToolbarProps) {
  const addItem = useStore((s) => s.addItem)

  const handleAdd = (type: string) => {
    const id = addItem(type) // starts at 0,0 — resolve any resulting overlap immediately
    applyResolvedOverlaps()
    // Open the editor right away: a fresh empty card is not obvious to edit.
    onOpenCard(id)
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
          <span className="edit-toolbar-sep" aria-hidden="true" />
          <button type="button" className="edit-toolbar-btn" onClick={onOpenAppearance}>
            Оформление
          </button>
          <button type="button" className="edit-toolbar-btn" onClick={onOpenLayout}>
            Сетка
          </button>
          <button type="button" className="edit-toolbar-btn" onClick={onOpenData}>
            Данные
          </button>
        </div>
      )}
      <button
        type="button"
        className={`edit-toggle${editMode ? ' active' : ''}`}
        onClick={onToggle}
        aria-pressed={editMode}
        title={editMode ? 'Leave edit mode' : 'Enter edit mode'}
      >
        {editMode ? 'Готово' : 'Редактировать'}
      </button>
    </>
  )
}
