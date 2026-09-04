'use client'

import { TopBar }       from '@/components/layout/TopBar'
import { HealthMatrix } from '@/components/dashboard/HealthMatrix'
import { useProductStatus } from '@/hooks/useProductStatus'
import { useCommandPalette } from '@/hooks/useCommandPalette'
import { useGridContext }    from '@/components/providers'
import { CommandPalette }   from '@/components/command/CommandPalette'
import GRID_CONFIG from '../../../config.grid.json'
import type { GridConfig, ProductConfig } from '@/types'

const CONFIG   = GRID_CONFIG as GridConfig
const PRODUCTS: ProductConfig[] = CONFIG.products.filter(p => p.enabled).sort((a, b) => a.order - b.order)

export default function MatrixPage() {
  const { statuses, aggregate, refreshing, refresh } = useProductStatus(CONFIG.refreshIntervalSeconds)
  useCommandPalette()
  const { commandOpen, openCommand, closeCommand } = useGridContext()

  return (
    <>
      <TopBar aggregate={aggregate} onRefresh={refresh} refreshing={refreshing} onCommandOpen={openCommand} />
      <main className="flex-1 px-6 py-6">
        <div className="mb-5">
          <h1 className="text-lg font-black text-white">Health Matrix</h1>
          <p className="text-sm text-slate-400 mt-0.5">Live status and response times across all products.</p>
        </div>
        <div className="h-[calc(100vh-11rem)]">
          <HealthMatrix products={PRODUCTS} statuses={statuses} />
        </div>
      </main>
      <CommandPalette open={commandOpen} onClose={closeCommand} products={PRODUCTS} />
    </>
  )
}
