# Mi-dashboard

A self-hosted link dashboard — your personal start page for the browser. Built with React + Vite + TypeScript on the frontend and Fastify (Node.js) on the backend. All settings and links are stored in a single JSON file on disk, so backing up or moving your dashboard is trivial.

## Features

- **4 themes** — `Web 2.0`, `Web 3.0`, `Liquid Glass`, and `Minimal`, each with a distinct look and feel
- **Light & dark mode** — every theme supports both color schemes
- **Drag-and-drop grid** — reorder your links and groups freely with a flexible, sortable grid
- **Widgets** — add useful widgets to your dashboard alongside your links
- **Custom icons** — upload your own icons for any link
- **WebUI settings** — everything (theme, mode, groups, links, widgets) is editable in-app through the settings UI; no config editing required
- **Single-file storage** — the whole dashboard lives in one `config.json`

## Quickstart (Docker)

```sh
docker run -d \
  --name mi-dashboard \
  -p 3000:3000 \
  -v mi-data:/app/data \
  ghcr.io/kerber0ss/mi-dashboard:latest
```

Then open <http://localhost:3000>. Set up your links, groups, theme and widgets in the in-app settings (WebUI) — changes are saved automatically.

**Config file location:** `/app/data/config.json` inside the container. The named volume `mi-data` persists it across container restarts and upgrades. To back up or edit it manually:

```sh
docker cp mi-dashboard:/app/data/config.json ./config.json
```

## Development

Requirements: Node.js 20+.

```sh
npm install          # install dependencies
npm run dev          # frontend dev server (Vite, with HMR)
npm run server       # backend API server (Fastify via tsx)
npm test             # run unit tests (vitest)
```

The backend serves the built frontend from `dist/` and the API under `/api/*`. For a production build:

```sh
npm run build        # build frontend into dist/
npm run server       # serve dashboard + API on port 3000
```

## Screenshots

> 📷 *Screenshots coming soon.*

<!-- TODO: add screenshots of each theme (light/dark) and the settings UI -->

## License

Private project.