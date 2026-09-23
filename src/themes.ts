export type ThemeId = 'noc-night' | 'noc-day' | 'noc-alert' | 'noc-patrol'
export interface ThemeDef {
  id: ThemeId; name: string
  tokens: { dark: Record<string, string>; light: Record<string, string> }
  extraCss?: string
}

/* NOC-грамматика: глубина из контраста, не из теней. LED-цвета неизменны
   во всех темах — статус не зависит от вкуса. */
const LED = {
  '--led-up': '#2ee6a8',
  '--led-down': '#ff5c5c',
  '--led-warn': '#ffb454',
  '--hairline': '#23282e',
  '--hairline-strong': '#3a414a',
}

export const THEMES: Record<ThemeId, ThemeDef> = {
  'noc-night': {
    id: 'noc-night', name: 'Ночная смена',
    tokens: {
      dark: { '--bg': '#0b0e11', '--surface': '#12151a', '--surface-border': '#23282e', '--text': '#e8ecef', '--text-dim': '#8b949e', '--shadow': 'none', '--radius-base': '6px', ...LED },
      light: { '--bg': '#eef1f4', '--surface': '#ffffff', '--surface-border': '#d6dce2', '--text': '#171a1e', '--text-dim': '#5d6670', '--shadow': 'none', '--radius-base': '6px', ...LED },
    },
  },
  'noc-day': {
    id: 'noc-day', name: 'Дневной дежурный',
    tokens: {
      dark: { '--bg': '#101418', '--surface': '#161b21', '--surface-border': '#2a3138', '--text': '#e6ebee', '--text-dim': '#818c97', '--shadow': 'none', '--radius-base': '2px', ...LED },
      light: { '--bg': '#f6f7f8', '--surface': '#ffffff', '--surface-border': '#e2e6ea', '--text': '#101418', '--text-dim': '#6b747e', '--shadow': 'none', '--radius-base': '2px', ...LED },
    },
    extraCss: `.card { border-width: 0; border-bottom: 1px solid var(--hairline); }`,
  },
  'noc-alert': {
    id: 'noc-alert', name: 'Аварийный',
    tokens: {
      dark: { '--bg': '#160d0d', '--surface': '#1e1414', '--surface-border': '#3a2424', '--text': '#f2e9e9', '--text-dim': '#a08a8a', '--shadow': 'none', '--radius-base': '6px', ...LED, '--led-warn': '#ff8c3a' },
      light: { '--bg': '#faf0ee', '--surface': '#ffffff', '--surface-border': '#e8d0cc', '--text': '#241515', '--text-dim': '#8a6f6b', '--shadow': 'none', '--radius-base': '6px', ...LED, '--led-warn': '#e07820' },
    },
  },
  'noc-patrol': {
    id: 'noc-patrol', name: 'Полевой',
    tokens: {
      dark: { '--bg': '#0a120e', '--surface': '#101a14', '--surface-border': '#20301f', '--text': '#e7efe9', '--text-dim': '#7f9488', '--shadow': 'none', '--radius-base': '2px', ...LED },
      light: { '--bg': '#eef4f0', '--surface': '#ffffff', '--surface-border': '#d2ded6', '--text': '#141d17', '--text-dim': '#5d7066', '--shadow': 'none', '--radius-base': '2px', ...LED },
    },
  },
}