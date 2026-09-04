'use client'

import { LayoutGrid, ExternalLink } from 'lucide-react'
import { cn, statusDotColor, statusLabel, statusColor, formatLatency, timeAgo, resolveProductUrl } from '@/lib/utils'
import { COLOR_CLASSES } from '@/lib/products'
import type { ProductConfig, ProductStatusResult } from '@/types'

interface HealthMatrixProps {
  products: ProductConfig[]
  statuses: Record<string, ProductStatusResult>
}

export function HealthMatrix({ products, statuses }: HealthMatrixProps) {
  return (
    <div className="flex flex-col h-full rounded-2xl border border-surface-800 bg-surface-900/80">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-800">
        <div className="flex items-center gap-2">
          <LayoutGrid size={15} className="text-cyan-400" />
          <span className="text-sm font-semibold text-white">Health Matrix</span>
        </div>
        <span className="text-2xs text-slate-500">Live status</span>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-surface-800">
              <th className="px-5 py-2.5 text-left text-2xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
              <th className="px-3 py-2.5 text-left text-2xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-3 py-2.5 text-left text-2xs font-semibold text-slate-500 uppercase tracking-wider">Latency</th>
              <th className="px-3 py-2.5 text-left text-2xs font-semibold text-slate-500 uppercase tracking-wider">Checked</th>
              <th className="px-3 py-2.5 text-left text-2xs font-semibold text-slate-500 uppercase tracking-wider">URL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-800/60">
            {products.map(product => {
              const result = statuses[product.id]
              const status = result?.status ?? 'unknown'
              const cc = COLOR_CLASSES[product.color]

              return (
                <tr
                  key={product.id}
                  className="group hover:bg-surface-800/40 transition-colors"
                >
                  {/* Product */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={cn('w-2 h-2 rounded-full shrink-0', cc.dot)} />
                      <span className={cn('font-semibold', cc.text)}>{product.name}</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        statusDotColor(status),
                        status === 'online' && 'animate-pulse',
                      )} />
                      <span className={cn('font-medium', statusColor(status))}>
                        {statusLabel(status)}
                      </span>
                    </div>
                  </td>

                  {/* Latency */}
                  <td className="px-3 py-3">
                    <span className={cn(
                      'font-mono',
                      result?.latencyMs && result.latencyMs < 200 ? 'text-green-400'
                      : result?.latencyMs && result.latencyMs < 500 ? 'text-yellow-400'
                      : result?.latencyMs ? 'text-red-400'
                      : 'text-slate-600',
                    )}>
                      {formatLatency(result?.latencyMs ?? null)}
                    </span>
                  </td>

                  {/* Checked */}
                  <td className="px-3 py-3 text-slate-500">
                    {result?.checkedAt ? timeAgo(result.checkedAt) : '—'}
                  </td>

                  {/* URL */}
                  <td className="px-3 py-3">
                    <a
                      href={resolveProductUrl(product)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-slate-500 hover:text-cyan-400 font-mono transition-colors group/link"
                    >
                      <span className="truncate max-w-[160px]">{resolveProductUrl(product).replace('https://', '').replace('http://', '')}</span>
                      <ExternalLink size={10} className="shrink-0 opacity-0 group-hover/link:opacity-100" />
                    </a>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Uptime sparkline row */}
      <div className="px-5 py-3 border-t border-surface-800">
        <div className="flex items-center justify-between">
          <span className="text-2xs text-slate-500">Last 7 days (30-day %)</span>
          <div className="flex items-center gap-3">
            {products.map(product => {
              const cc = COLOR_CLASSES[product.color]
              const result = statuses[product.id]
              const days = (result?.uptimeDays ?? []).slice(-7)
              return (
                <div key={product.id} className="flex items-center gap-1.5" title={product.name}>
                  <div className="flex items-end gap-px">
                    {days.map((up, i) => (
                      <div key={i} className={cn('w-1 h-2 rounded-sm', up === true ? cc.dot : up === false ? 'bg-red-500/60' : 'bg-surface-700')} />
                    ))}
                  </div>
                  <span className="text-2xs text-slate-500 tabular-nums">{result?.uptimePercent == null ? 'collecting' : `${result.uptimePercent}%`}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
