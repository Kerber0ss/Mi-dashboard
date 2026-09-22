# Mi-dashboard — Design Spec

Date: 2025-09-22
Status: Draft for review

## Purpose

A self-hosted, personal-homelab link dashboard (like Heimdall/Homarr) with strong visual polish: multiple themes (web2.0, web3.0, liquid glass, minimal), light/dark modes, drag-drop grid layout, and full configuration through the WebUI. 1–2 users, no auth in v1.

## Success Criteria

- User can add/edit/delete link cards, groups and widgets entirely from the WebUI
- User can freely drag/resize items on a 12-column grid; layout persists
- Theme and light/dark switch instantly and persist
- Cards support favicon auto-fetch, bundled icon library (dashboard-icons), and custom uploaded SVG/PNG
- Clock, weather, and service-status widgets work
- Ships as a Docker image with config persisted in a volume
- Visually stylish: glassmorphism, animations, hover effects

## Architecture

Monolith, approach A: static React SPA + small Node backend in one process.

```
[Browser SPA (React+Vite+TS)]
        │  REST
        ▼
[Fastify backend] ── /api/config  (config.json on disk, zod-validated)
        ├── /api/icons   (upload custom SVG/PNG to data/icons/)
        ├── /api/health?url=  (server-side HTTP status probe, bypasses CORS)
        └── /api/weather  (proxy to open-meteo, 10-min cache)
```

- Frontend: Vite build output served by Fastify as static files.
- Persistence: single `data/config.json` file (volume-mounted). No DB — unnecessary for 1–2 users.
- Runtime deps kept minimal: `fastify`, `zod`, `@fastify/static`. Frontend: `react`, `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/modifiers`, `framer-motion` (modals/micro-animations), `zustand` (state).

## Data Model

```json
{
  "version": 1,
  "theme": { "id": "liquid-glass", "mode": "dark", "accent": "#7c5cff", "opacity": 0.6, "blur": 16 },
  "grid": { "cols": 12, "rowHeight": 80, "gap": 12 },
  "items": [
    {
      "id": "uuid",
      "type": "link | group | widget:clock | widget:weather | widget:status",
      "x": 0, "y": 0, "w": 2, "h": 1,
      "props": {
        "title": "Plex",
        "url": "https://plex.local",
        "icon": "plex",            // dashboard-icons id, "favicon:<url>", or null
        "customIcon": "icons/<file>",
        "children": []             // only for type=group
      }
    }
  ]
}
```

- Zod schema shared in code (single source of truth, used by backend for validation and frontend for typing).
- Backend rejects invalid PUT with 400; frontend keeps last-good config and shows a toast on save failure.

## UI / Editing Model

- **View mode** (default): clicking a link card opens URL (new tab). Hover: lift + glow.
- **Edit mode** (toggle button): drag-n-drop to move, corner handle to resize, click to open card settings modal, "+" button to add item, delete button on cards.
- Grid rendering: absolute-positioned items over CSS grid backdrop, transformed by `x,y,w,h` → `left/top/width/height` percentages. dnd-kit handles pointer logic; collision detection snap-to-cell.
- Settings pages (WebUI-only configuration):
  - **Appearance**: theme gallery (preview cards), light/dark toggle, accent color picker, opacity & blur sliders, background image (upload/URL) + dimming
  - **Layout**: grid columns, row height, gap
  - **Data**: import/export config JSON, reset
- Responsive: below 768px grid collapses to single-column ordered list; drag disabled.

## Theming System

- All visuals via CSS custom properties: `--surface, --surface-border, --text, --text-dim, --accent, --radius, --blur, --shadow, --bg`.
- Each theme = TS object of tokens + small optional CSS block (e.g. liquid glass adds backdrop-filter saturate + SVG displacement filter).
- Bundled themes: `web20` (glossy gradients, rounded, soft shadows), `web30` (dark neon, glassmorphism), `liquid-glass` (Apple-style heavy backdrop-blur/saturation/refraction), `minimal` (flat, no effects).
- Light/dark: each theme defines both token sets; `data-theme` + `data-mode` attributes on `<html>` switch them. Theme change animates via `transition` on colors + View Transitions API where supported.
- Custom user themes: same token JSON, editable in Appearance page, stored in config.

## Icons

Priority: `customIcon` → bundled dashboard-icons (vendored as static SVG/PNG) → `favicon` via Google s2 (`https://www.google.com/s2/favicons?domain=…&sz=128`) → letter/emoji fallback tile.

## Widgets

- **clock**: local time/date, configurable format/seconds.
- **weather**: open-meteo via backend proxy; lat/lon configured in widget settings; current temp + icon + 3-day min/max.
- **status**: probes list of URLs via `GET /api/health?url=`; green/red dot + ms latency; polls every 30s (interval configurable).

## Backend Endpoints

| Route | Method | Behavior |
|---|---|---|
| `/api/config` | GET | return config.json (default config if missing) |
| `/api/config` | PUT | zod-validate, atomic write (tmp+rename), return saved |
| `/api/icons` | POST | multipart upload svg/png (≤512KB), store to `data/icons/` |
| `/api/icons` | GET | list uploaded icons |
| `/api/health?url=` | GET | HEAD/GET request, 5s timeout → `{status:"up"|"down", latencyMs}` |
| `/api/weather?lat=&lon=` | GET | proxy open-meteo, 10-min in-memory cache |

## Testing

- **Vitest**: zod schema, config load/save (tmp dirs), health endpoint (mocked fetch), weather cache.
- **Playwright smoke**: load page → add link card → drag it → switch theme → reload → state persisted.
- Visual check of all 4 themes × light/dark manually.

## Out of Scope (v1)

- Auth/multi-user, search omnibar, reverse-proxy integrations, DB, mobile app, plugin system.

## Non-Functional

- Node 20+, single Docker image, config in `/app/data` volume.
- First load < 1s local; no external CDNs (all assets bundled).
