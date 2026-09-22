import { useMemo, useState } from 'react'

/**
 * Icon resolution cascade (controller ruling):
 *   1. customIcon        → /api/icons/<file>
 *   2. bundled library   → jsdelivr dashboard-icons svg via <img>, onError falls through
 *   3. favicon           → favicon:<url> prefix, or domain derived from props.url,
 *                          rendered through Google s2 favicons
 *   4. fallback          → letter/emoji tile with accent gradient
 */

type Stage = 'custom' | 'bundled' | 'favicon' | 'fallback'

export interface IconProps {
  icon?: string | null
  customIcon?: string | null
  url?: string | null
  title?: string
  size?: number
}

const jsdelivrIcon = (name: string): string | null => {
  if (!name || name.startsWith('favicon:') || name.startsWith('http') || name.startsWith('/')) return null
  const slug = name.toLowerCase().trim().replace(/\s+/g, '-')
  return `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/${slug}.svg`
}

const domainOf = (raw: string): string | null => {
  try {
    return new URL(raw).hostname
  } catch {
    return null
  }
}

export default function Icon({ icon, customIcon, url, title = '', size = 32 }: IconProps) {
  const initial = useMemo<Stage>(() => {
    if (customIcon) return 'custom'
    if (icon && jsdelivrIcon(icon)) return 'bundled'
    if (icon?.startsWith('favicon:')) return 'favicon'
    if (url && domainOf(url)) return 'favicon'
    return 'fallback'
  }, [customIcon, icon, url])

  const [stage, setStage] = useState<Stage>(initial)
  // Reset the cascade if the icon config changes
  const [key, setKey] = useState(0)
  const memoKey = `${initial}|${customIcon}|${icon}|${url}`
  const [lastKey, setLastKey] = useState(memoKey)
  if (lastKey !== memoKey) {
    setLastKey(memoKey)
    setStage(initial)
    setKey((k) => k + 1)
  }

  const src = useMemo(() => {
    switch (stage) {
      case 'custom':
        return customIcon ? `/api/icons/${customIcon}` : null
      case 'bundled':
        return jsdelivrIcon(icon ?? '')
      case 'favicon': {
        const explicit = icon?.startsWith('favicon:') ? icon.slice('favicon:'.length) : url ?? ''
        const domain = domainOf(explicit)
        return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null
      }
      default:
        return null
    }
  }, [stage, customIcon, icon, url])

  if (src) {
    return (
      <img
        key={key}
        className="icon"
        src={src}
        alt={title}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setStage(stage === 'custom' ? 'bundled' : stage === 'bundled' ? 'favicon' : 'fallback')}
      />
    )
  }

  // Fallback: emoji if icon is a short emoji-ish glyph, else first letter of title
  const emoji = icon && !icon.startsWith('favicon:') && icon.length <= 4 ? icon.trim() : null
  const letter = title.trim().charAt(0).toUpperCase() || '•'
  return (
    <div
      className="icon icon-fallback"
      style={{
        width: size,
        height: size,
        fontSize: emoji ? size * 0.6 : size * 0.5,
        background: 'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 45%, #000))',
      }}
    >
      {emoji ?? letter}
    </div>
  )
}
