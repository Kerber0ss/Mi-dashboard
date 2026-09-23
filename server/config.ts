import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'

const iconRef = z.string().nullable()
export const itemPropsSchema = z.object({
  title: z.string().max(100).default(''),
  url: z.string().url().or(z.literal('')).default(''),
  icon: iconRef.default(null),
  customIcon: iconRef.default(null),
  children: z.array(z.string()).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
  targets: z.array(z.string()).optional(),
  format24h: z.boolean().optional(),
  showSeconds: z.boolean().optional(),
}).passthrough()

export const itemSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['link', 'group', 'widget:clock', 'widget:weather', 'widget:status']),
  x: z.number().int().min(0), y: z.number().int().min(0),
  w: z.number().int().min(1).max(12), h: z.number().int().min(1),
  props: itemPropsSchema,
})

const themeSchema = z.object({
  id: z.string().default('noc-night'),
  mode: z.enum(['light', 'dark']).default('dark'),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#38c8ff'),
  opacity: z.number().min(0).max(1).default(1),
  blur: z.number().min(0).max(40).default(0),
  background: z.string().nullable().default(null),
})
const gridSchema = z.object({ cols: z.number().int().min(4).max(24).default(12),
  rowHeight: z.number().int().min(40).max(200).default(80),
  gap: z.number().int().min(0).max(48).default(12) })

export const dashboardConfigSchema = z.object({
  version: z.literal(1).default(1),
  theme: themeSchema.default(() => themeSchema.parse({})),
  grid: gridSchema.default(() => gridSchema.parse({})),
  items: z.array(itemSchema).default([]),
}).strict()
export type DashboardConfig = z.infer<typeof dashboardConfigSchema>

export function defaultConfig(): DashboardConfig {
  return dashboardConfigSchema.parse({})
}

export function loadConfig(dataDir: string): DashboardConfig {
  const file = join(dataDir, 'config.json')
  if (!existsSync(file)) return defaultConfig()
  try {
    return dashboardConfigSchema.parse(JSON.parse(readFileSync(file, 'utf8')))
  } catch {
    return defaultConfig()
  }
}

export function saveConfig(dataDir: string, config: DashboardConfig): void {
  dashboardConfigSchema.parse(config) // throws on invalid
  mkdirSync(dataDir, { recursive: true })
  const tmp = join(dataDir, `config.json.tmp-${Date.now()}`)
  writeFileSync(tmp, JSON.stringify(config, null, 2))
  renameSync(tmp, join(dataDir, 'config.json'))
}