import { useState } from 'react'
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

  const closeModal = () => setModal(null)
  const cardItem = modal?.kind === 'card' ? items.find((i) => i.id === modal.id) : undefined

  return (
    <div className="app">
      {/* reducedMotion="user": entrance staggers degrade to opacity-only when
          the OS prefers reduced motion (matches the CSS media query). */}
      <MotionConfig reducedMotion="user">
        <EditToolbar
          editMode={editMode}
          onToggle={() => setEditMode((v) => !v)}
          onOpenAppearance={() => setModal({ kind: 'appearance' })}
          onOpenLayout={() => setModal({ kind: 'layout' })}
          onOpenData={() => setModal({ kind: 'data' })}
        />
        {editMode ? (
          <EditGrid onEditCard={(id) => setModal({ kind: 'card', id })} />
        ) : (
          <GridView items={items} grid={grid} editMode={false} />
        )}
      </MotionConfig>

      <AppearanceModal open={modal?.kind === 'appearance'} onClose={closeModal} />
      <LayoutModal open={modal?.kind === 'layout'} onClose={closeModal} />
      <DataModal open={modal?.kind === 'data'} onClose={closeModal} />
      {cardItem && <CardModal itemId={cardItem.id} onClose={closeModal} />}
    </div>
  )
}
