import { useState } from 'react'
import { useStore } from '../store'
import GridView from './GridView'
import EditGrid from './EditGrid'
import EditToolbar from './EditToolbar'

export default function Dashboard({ editMode: initialEditMode = false }: { editMode?: boolean }) {
  const [editMode, setEditMode] = useState(initialEditMode)
  const items = useStore((s) => s.config.items)
  const grid = useStore((s) => s.config.grid)

  return (
    <div className="app">
      <EditToolbar editMode={editMode} onToggle={() => setEditMode((v) => !v)} />
      {editMode ? <EditGrid /> : <GridView items={items} grid={grid} editMode={false} />}
    </div>
  )
}
