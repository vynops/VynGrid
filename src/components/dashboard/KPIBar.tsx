'use client'

import {
  Server, TrendingDown, Activity, GitMerge, Cpu, CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AggregateStatus } from '@/types'

interface KPIBarProps {
  aggregate: AggregateStatus | null
  productCount: number
}

export function KPIBar({ aggregate, productCount }: KPIBarProps) {
  const onlineCount  = aggregate?.online  ?? 0
  const totalCount   = aggregate?.total   ?? productCount
  const offlineCount = aggregate?.offline ?? 0
  const unknownCount = aggregate?.unknown ?? totalCount

  const kpis = [
    {
      icon:    Server,
      label:   'Products Online',
      value:   aggregate ? `${onlineCount}/${totalCount}` : '—',
      sub:     offlineCount > 0 ? `${offlineCount} offline` : 'all healthy',
      color:   offlineCount > 0 ? 'text-red-400' : onlineCount === totalCount && totalCount > 0 ? 'text-green-400' : 'text-slate-400',
      iconBg:  offlineCount > 0 ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400',
    },
    {
      icon:    Activity,
      label:   'Active Incidents',
      value:   '—',
      sub:     'source unavailable',
      color:   'text-orange-400',
      iconBg:  'bg-orange-500/10 border-orange-500/20 text-orange-400',
    },
    {
      icon:    GitMerge,
      label:   'Deployments Today',
      value:   '—',
      sub:     'source unavailable',
      color:   'text-violet-400',
      iconBg:  'bg-violet-500/10 border-violet-500/20 text-violet-400',
    },
    {
      icon:    TrendingDown,
      label:   'Cost Saved (MTD)',
      value:   '—',
      sub:     'source unavailable',
      color:   'text-emerald-400',
      iconBg:  'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    },
    {
      icon:    Cpu,
      label:   'AI Operations',
      value:   '—',
      sub:     'source unavailable',
      color:   'text-blue-400',
      iconBg:  'bg-blue-500/10 border-blue-500/20 text-blue-400',
    },
    {
      icon:    CheckCircle2,
      label:   'SLA Compliance',
      value:   '—',
      sub:     'source unavailable',
      color:   'text-cyan-400',
      iconBg:  'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
      {kpis.map(kpi => {
        const Icon = kpi.icon
        return (
          <div
            key={kpi.label}
            className="flex items-center gap-3 p-4 rounded-xl bg-surface-900/80 border border-surface-800 hover:border-surface-700 transition-colors"
          >
            <div className={cn(
              'flex items-center justify-center w-9 h-9 rounded-lg border shrink-0',
              kpi.iconBg,
            )}>
              <Icon size={16} />
            </div>
            <div className="min-w-0">
              <div className={cn('text-lg font-black leading-none', kpi.color)}>{kpi.value}</div>
              <div className="text-2xs text-slate-500 font-medium mt-0.5 truncate">{kpi.label}</div>
              <div className="text-2xs text-slate-600 mt-0.5 truncate">{kpi.sub}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
