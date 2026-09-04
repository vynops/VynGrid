'use client'

import { useState, useEffect } from 'react'
import { Grid3x3 } from 'lucide-react'
import { TopBar }         from '@/components/layout/TopBar'
import { ProductGrid }    from '@/components/grid/ProductGrid'
import { KPIBar }         from '@/components/dashboard/KPIBar'
import { ActivityFeed }   from '@/components/dashboard/ActivityFeed'
import { HealthMatrix }   from '@/components/dashboard/HealthMatrix'
import { CommandPalette } from '@/components/command/CommandPalette'
import { useProductStatus }  from '@/hooks/useProductStatus'
import { useCommandPalette } from '@/hooks/useCommandPalette'
import { useGridContext }    from '@/components/providers'
import { resolveProductUrl } from '@/lib/utils'
import type { GridConfig, ProductConfig } from '@/types'

export default function DashboardPage() {
  const [products, setProducts] = useState<ProductConfig[]>([])
  const [refreshInterval, setRefreshInterval] = useState(30)

  // Load config from API at runtime so settings changes are reflected without rebuild
  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then((cfg: GridConfig) => {
        setProducts(cfg.products.filter(p => p.enabled).sort((a, b) => a.order - b.order))
        setRefreshInterval(cfg.refreshIntervalSeconds)
      })
      .catch(() => {})
  }, [])

  const { statuses, aggregate, refreshing, refresh } = useProductStatus(refreshInterval)
  useCommandPalette()
  const { commandOpen, openCommand, closeCommand } = useGridContext()

  return (
    <>
      <TopBar
        aggregate={aggregate}
        onRefresh={refresh}
        refreshing={refreshing}
        onCommandOpen={openCommand}
      />

      <main className="flex-1 px-6 py-6 space-y-6">
        {/* Hero header */}
        <div className="relative overflow-hidden rounded-2xl border border-surface-800 bg-surface-900/60 px-7 py-6">
          <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
          <div className="absolute top-0 left-1/3 w-[400px] h-[120px] bg-cyan-500/8 blur-[80px] rounded-full pointer-events-none" />
          <div className="relative flex items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Grid3x3 size={18} className="text-cyan-400" />
                <span className="text-2xs font-bold text-cyan-400 uppercase tracking-widest">Enterprise Grid Console</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                Welcome to{' '}
                <span className="text-gradient">VynGrid</span>
              </h1>
              <p className="text-sm text-slate-400 mt-1 max-w-lg">
                Your unified control plane for the entire Vyn product estate. Monitor, launch, and manage all {products.length} products from one place.
              </p>
            </div>
            <div className="hidden lg:grid grid-cols-4 gap-2 shrink-0">
              {products.map(p => (
                <a
                  key={p.id}
                  href={resolveProductUrl(p)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-surface-800/60 border border-surface-700 hover:border-surface-600 transition-all hover:-translate-y-0.5 group"
                >
                  <span className={`text-xs font-bold text-slate-300 group-hover:text-white`}>
                    {p.name}
                  </span>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    statuses[p.id]?.status === 'online'   ? 'bg-green-400 animate-pulse' :
                    statuses[p.id]?.status === 'degraded' ? 'bg-yellow-400' :
                    statuses[p.id]?.status === 'offline'  ? 'bg-red-400' :
                    'bg-slate-600'
                  }`} />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* KPI Bar */}
        <KPIBar aggregate={aggregate} productCount={products.length} />

        {/* Product grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Products</h2>
            <span className="text-2xs text-slate-500">
              {`${aggregate?.online ?? 0}/${products.length} online`}
            </span>
          </div>
          <ProductGrid products={products} statuses={statuses} />
        </section>

        {/* Activity + Health Matrix */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="min-h-[400px]">
            <ActivityFeed refreshIntervalSeconds={refreshInterval} />
          </div>
          <div className="min-h-[400px]">
            <HealthMatrix products={products} statuses={statuses} />
          </div>
        </div>
      </main>

      <CommandPalette
        open={commandOpen}
        onClose={closeCommand}
        products={products}
      />
    </>
  )
}
