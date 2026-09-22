import { useStore } from '../store'

export default function Dashboard() {
  const items = useStore(s => s.config.items)
  return <div className="app">{items.length} items</div>
}