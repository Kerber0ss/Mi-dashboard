import { useEffect, type ReactNode } from 'react'
import { useStore } from '../store'
import { THEMES, type ThemeId } from '../themes'

/** Resolve a config theme id to a ThemeDef, falling back to liquid-glass. */
export const resolveTheme = (id: string) =>
  THEMES[id as ThemeId] ?? THEMES['liquid-glass']

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useStore((s) => s.config.theme)
  const def = resolveTheme(theme.id)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = def.id
    root.dataset.mode = theme.mode

    const tokens = def.tokens[theme.mode] ?? def.tokens.dark
    for (const [k, v] of Object.entries(tokens)) root.style.setProperty(k, v)

    // Theme settings from config
    root.style.setProperty('--accent', theme.accent)
    root.style.setProperty('--blur', `${theme.blur}px`)
    root.style.setProperty('--opacity', String(theme.opacity))

    // Custom background image (optional); presence toggles the dim overlay
    if (theme.background) {
      root.style.setProperty('--bg-image', `url("${theme.background}")`)
      document.body.dataset.bg = 'true'
    } else {
      root.style.removeProperty('--bg-image')
      delete document.body.dataset.bg
    }

    // Theme-specific extra CSS
    let style = document.getElementById('theme-extra') as HTMLStyleElement | null
    if (!style) {
      style = document.createElement('style')
      style.id = 'theme-extra'
      document.head.appendChild(style)
    }
    style.textContent = def.extraCss ?? ''
  }, [def, theme])

  return <>{children}</>
}