import 'server-only'
import fs from 'fs'
import path from 'path'
import type { GridConfig, ProductConfig } from '@/types'

const CONFIG_PATH = path.join(process.cwd(), 'config.grid.json')

export function loadGridConfig(): GridConfig {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8')
  return JSON.parse(raw) as GridConfig
}

export function saveGridConfig(config: GridConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8')
}

export function getEnabledProducts(config: GridConfig): ProductConfig[] {
  return config.products
    .filter(p => p.enabled)
    .sort((a, b) => a.order - b.order)
}
