import { defineConfig } from '@playwright/test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * E2E smoke test config.
 *
 * Two web servers are started and torn down by Playwright:
 *  - Fastify API on :3000 (npm run server) pointed at a fresh temp DATA_DIR,
 *    so the test runs against an empty dashboard and never touches ./data.
 *  - Vite dev server on :5173 (npm run dev), which proxies /api → :3000
 *    (see vite.config.ts). baseURL targets the vite dev server.
 */
const dataDir = mkdtempSync(join(tmpdir(), 'mi-dashboard-e2e-'))

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run server',
      port: 3000,
      env: { ...process.env, DATA_DIR: dataDir },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
  ],
})