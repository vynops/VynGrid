'use client'

import { useEffect, useState } from 'react'
import { TopBar }       from '@/components/layout/TopBar'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { useProductStatus } from '@/hooks/useProductStatus'
import { useCommandPalette } from '@/hooks/useCommandPalette'
import { useGridContext }    from '@/components/providers'
import { CommandPalette }   from '@/components/command/CommandPalette'
import GRID_CONFIG from '../../../config.grid.json'
import type { GridConfig, ProductConfig } from '@/types'

const CONFIG   = GRID_CONFIG as GridConfig
const PRODUCTS: ProductConfig[] = CONFIG.products.filter(p => p.enabled).sort((a, b) => a.order - b.order)

export default function ActivityPage() {
  const [refreshInterval, setRefreshInterval] = useState(CONFIG.refreshIntervalSeconds)

  useEffect(() => {
    fetch('/api/config')
      .then(response => response.json())
      .then((config: GridConfig) => setRefreshInterval(config.refreshIntervalSeconds))
      .catch(() => {})
  }, [])

  const { aggregate, refreshing, refresh } = useProductStatus(refreshInterval)
  useCommandPalette()
  const { commandOpen, openCommand, closeCommand } = useGridContext()

  return (
    <>
      <TopBar aggregate={aggregate} onRefresh={refresh} refreshing={refreshing} onCommandOpen={openCommand} />
      <main className="flex-1 px-6 py-6">
        <div className="mb-5">
          <h1 className="text-lg font-black text-white">Activity Feed</h1>
          <p className="text-sm text-slate-400 mt-0.5">Cross-product events and recent operations.</p>
        </div>
        <div className="max-w-2xl h-[calc(100vh-11rem)]">
          <ActivityFeed refreshIntervalSeconds={refreshInterval} />
        </div>
      </main>
      <CommandPalette open={commandOpen} onClose={closeCommand} products={PRODUCTS} />
    </>
  )
}
