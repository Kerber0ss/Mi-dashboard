export type ThemeId = 'web20' | 'web30' | 'liquid-glass' | 'minimal'

export interface ThemeDef {
  id: ThemeId
  name: string
  tokens: { dark: Record<string, string>; light: Record<string, string> }
  extraCss?: string
}

/**
 * Token contract — every theme defines both modes:
 * --bg, --bg-image-dim, --surface, --surface-border,
 * --text, --text-dim, --shadow, --radius-base
 */
export const THEMES: Record<ThemeId, ThemeDef> = {
  web20: {
    id: 'web20',
    name: 'Web 2.0',
    tokens: {
      dark: {
        '--bg': 'linear-gradient(160deg,#1b2735,#090a0f)',
        '--bg-image-dim': 'rgba(9,10,15,.55)',
        '--surface': 'linear-gradient(180deg,rgba(60,80,110,.9),rgba(30,40,60,.9))',
        '--surface-border': 'rgba(255,255,255,.25)',
        '--text': '#e8eef7',
        '--text-dim': '#9fb2c8',
        '--shadow': '0 4px 16px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.3)',
        '--radius-base': '12px',
      },
      light: {
        '--bg': 'linear-gradient(160deg,#dfe9f3,#ffffff)',
        '--bg-image-dim': 'rgba(255,255,255,.55)',
        '--surface': 'linear-gradient(180deg,#ffffff,#e6eef7)',
        '--surface-border': 'rgba(40,60,90,.25)',
        '--text': '#1a2634',
        '--text-dim': '#5b7188',
        '--shadow': '0 3px 10px rgba(30,50,80,.2), inset 0 1px 0 #fff',
        '--radius-base': '12px',
      },
    },
  },
  web30: {
    id: 'web30',
    name: 'Web 3.0 Neon',
    tokens: {
      dark: {
        '--bg': 'radial-gradient(1200px 800px at 20% -10%,#1a0b2e,#050208 60%)',
        '--bg-image-dim': 'rgba(5,2,8,.55)',
        '--surface': 'rgba(22,12,40,.72)',
        '--surface-border': 'rgba(140,80,255,.45)',
        '--text': '#f2eaff',
        '--text-dim': '#a08cc8',
        '--shadow': '0 0 24px rgba(124,92,255,.25)',
        '--radius-base': '16px',
      },
      light: {
        '--bg': 'radial-gradient(1200px 800px at 20% -10%,#e8dcff,#f8f6fc 60%)',
        '--bg-image-dim': 'rgba(248,246,252,.55)',
        '--surface': 'rgba(255,255,255,.75)',
        '--surface-border': 'rgba(120,80,220,.35)',
        '--text': '#241640',
        '--text-dim': '#6b5a92',
        '--shadow': '0 0 18px rgba(124,92,255,.15)',
        '--radius-base': '16px',
      },
    },
    extraCss: `.card { box-shadow: 0 0 24px rgba(124,92,255,.25); }
.card:hover { border-color: var(--accent); }`,
  },
  'liquid-glass': {
    id: 'liquid-glass',
    name: 'Liquid Glass',
    tokens: {
      dark: {
        '--bg': 'linear-gradient(150deg,#0a0f1e,#101828 50%,#0a1020)',
        '--bg-image-dim': 'rgba(10,15,30,.5)',
        '--surface': 'rgba(255,255,255,.08)',
        '--surface-border': 'rgba(255,255,255,.18)',
        '--text': '#f5f7fb',
        '--text-dim': '#9aa7bd',
        '--shadow': '0 8px 32px rgba(0,0,0,.4)',
        '--radius-base': '20px',
      },
      light: {
        '--bg': 'linear-gradient(150deg,#cfe0f2,#eef4fb 50%,#e2ecf7)',
        '--bg-image-dim': 'rgba(238,244,251,.5)',
        '--surface': 'rgba(255,255,255,.45)',
        '--surface-border': 'rgba(255,255,255,.6)',
        '--text': '#182234',
        '--text-dim': '#5a6b85',
        '--shadow': '0 8px 32px rgba(40,60,90,.15)',
        '--radius-base': '20px',
      },
    },
    extraCss: `.card { backdrop-filter: blur(var(--blur)) saturate(1.6); -webkit-backdrop-filter: blur(var(--blur)) saturate(1.6); }`,
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    tokens: {
      dark: {
        '--bg': '#111214',
        '--bg-image-dim': 'rgba(17,18,20,.55)',
        '--surface': '#1c1d21',
        '--surface-border': '#2b2d33',
        '--text': '#e6e6e9',
        '--text-dim': '#8b8d95',
        '--shadow': 'none',
        '--radius-base': '8px',
      },
      light: {
        '--bg': '#f6f6f7',
        '--bg-image-dim': 'rgba(246,246,247,.55)',
        '--surface': '#ffffff',
        '--surface-border': '#e2e2e6',
        '--text': '#17181b',
        '--text-dim': '#77787f',
        '--shadow': 'none',
        '--radius-base': '8px',
      },
    },
  },
}