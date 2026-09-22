import { useStore } from '../store'
import GridView from './GridView'

export default function Dashboard({ editMode = false }: { editMode?: boolean }) {
  const items = useStore((s) => s.config.items)
  const grid = useStore((s) => s.config.grid)

  return (
    <div className="app">
      <GridView items={items} grid={grid} editMode={editMode} />
    </div>
  )
}
