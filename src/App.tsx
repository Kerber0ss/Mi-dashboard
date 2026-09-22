import { useEffect } from 'react'
import { useStore } from './store'
import Dashboard from './components/Dashboard'
export default function App() {
  const reload = useStore(s => s.reload)
  useEffect(() => { reload() }, [reload])
  return <Dashboard />
}