import { useEffect } from 'react'
import { useStore } from './store'
import Dashboard from './components/Dashboard'
import ThemeProvider from './components/ThemeProvider'
import './themes.css'

export default function App() {
  const reload = useStore((s) => s.reload)
  useEffect(() => {
    reload()
  }, [reload])
  return (
    <ThemeProvider>
      <Dashboard />
    </ThemeProvider>
  )
}