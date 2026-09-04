'use client'

import { cn, statusDotColor, statusLabel, statusBg, formatLatency, timeAgo } from '@/lib/utils'
import type { ProductStatus } from '@/types'

interface StatusPillProps {
  status: ProductStatus
  latencyMs?: number | null
  checkedAt?: string
  size?: 'sm' | 'md'
}

export function StatusPill({ status, latencyMs, checkedAt, size = 'sm' }: StatusPillProps) {
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 rounded-full border font-medium',
      size === 'sm' ? 'px-2 py-0.5 text-2xs' : 'px-2.5 py-1 text-xs',
      statusBg(status),
    )}>
      <span className={cn(
        'rounded-full shrink-0',
        size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2',
        statusDotColor(status),
        status === 'online' && 'animate-pulse',
      )} />
      {statusLabel(status)}
      {latencyMs != null && (
        <span className="text-slate-500 font-normal">{formatLatency(latencyMs)}</span>
      )}
      {checkedAt && (
        <span className="text-slate-600 font-normal">{timeAgo(checkedAt)}</span>
      )}
    </div>
  )
}
