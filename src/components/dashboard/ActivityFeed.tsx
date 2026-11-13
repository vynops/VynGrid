'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, GitMerge, Info, Pause, Play, RefreshCw, Zap } from 'lucide-react'
import { cn, timeAgo } from '@/lib/utils'
import type { ActivityEvent, ActivityResponse } from '@/types'

const TYPE_ICONS: Record<string, React.ElementType> = {
  incident:   AlertTriangle,
  deployment: GitMerge,
  alert:      Zap,
  resolve:    CheckCircle2,
  info:       Info,
}

const TYPE_COLORS: Record<string, string> = {
  incident:   'text-red-400 bg-red-500/10 border-red-500/20',
  deployment: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  alert:      'text-orange-400 bg-orange-500/10 border-orange-500/20',
  resolve:    'text-green-400 bg-green-500/10 border-green-500/20',
  info:       'text-blue-400 bg-blue-500/10 border-blue-500/20',
}

const SEVERITY_BAR: Record<string, string> = {
  critical: 'bg-red-500',
  warning:  'bg-yellow-500',
  info:     'bg-blue-500',
}

const PRODUCT_COLORS: Record<string, string> = {
  vynops:  'text-cyan-400',
  vyndc:   'text-green-400',
  vyncicd: 'text-violet-400',
  vyncost: 'text-orange-400',
  vyndb:   'text-emerald-400',
  vynai:   'text-blue-400',
  vynmesh: 'text-yellow-400',
  vynsap:  'text-rose-400',
}

interface ActivityFeedProps {
  refreshIntervalSeconds: number
}

export function ActivityFeed({ refreshIntervalSeconds }: ActivityFeedProps) {
  const pathname = usePathname()
  const [eventsData, setEventsData] = useState<ActivityEvent[]>([])
  const [sourceErrors, setSourceErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLive, setIsLive] = useState(true)
  const [productFilter, setProductFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [timeFilter, setTimeFilter] = useState('24h')
  const [now, setNow] = useState(() => Date.now())

  async function loadEvents() {
    setLoading(true)
    try {
      const response = await fetch('/api/activity', { cache: 'no-store' })
      if (!response.ok) throw new Error(`Activity request failed (${response.status})`)
      const data = await response.json() as ActivityResponse
      setEventsData(data.events)
      setSourceErrors(data.sources.filter(source => source.error).map(source => `${source.productId}: ${source.error}`))
      setError(null)
      setNow(Date.now())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Activity request failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
    if (!isLive) return
    const interval = setInterval(loadEvents, refreshIntervalSeconds * 1000)
    return () => clearInterval(interval)
  }, [isLive, refreshIntervalSeconds])

  const cutoff = timeFilter === '24h' ? now - 24 * 3600_000 : 0
  const events = eventsData.filter(event =>
    (productFilter === 'all' || event.productId === productFilter) &&
    (typeFilter === 'all' || event.type === typeFilter) &&
    new Date(event.timestamp).getTime() >= cutoff,
  )

  return (
    <div className="flex flex-col h-full rounded-2xl border border-surface-800 bg-surface-900/80">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-800">
        <div className="flex items-center gap-2">
          <Activity size={15} className="text-cyan-400" />
          <span className="text-sm font-semibold text-white">Activity Feed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsLive(value => !value)}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-md border text-2xs font-semibold transition-colors',
              isLive
                ? 'border-green-500/20 bg-green-500/10 text-green-400'
                : 'border-surface-700 bg-surface-800 text-slate-400',
            )}
            aria-pressed={isLive}
            title={isLive ? 'Pause relative time updates' : 'Resume relative time updates'}
          >
            {isLive ? <Pause size={11} /> : <Play size={11} />}
            {isLive ? 'Live' : 'Paused'}
          </button>
          <button
            type="button"
            onClick={loadEvents}
            disabled={loading}
            className="flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-white hover:bg-surface-800 transition-colors"
            aria-label="Refresh activity feed"
            title="Refresh activity feed"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-surface-800 bg-surface-950/30">
        <label className="sr-only" htmlFor="activity-product-filter">Filter by product</label>
        <select
          id="activity-product-filter"
          value={productFilter}
          onChange={event => setProductFilter(event.target.value)}
          className="rounded-md border border-surface-700 bg-surface-800 px-2 py-1.5 text-2xs text-slate-300 outline-none focus:border-cyan-500/50"
        >
          <option value="all">All Products</option>
          {[...new Map(eventsData.map(event => [event.productId, event.productName])).entries()].map(([productId, productName]) => (
            <option key={productId} value={productId}>{productName}</option>
          ))}
        </select>

        <label className="sr-only" htmlFor="activity-type-filter">Filter by event type</label>
        <select
          id="activity-type-filter"
          value={typeFilter}
          onChange={event => setTypeFilter(event.target.value)}
          className="rounded-md border border-surface-700 bg-surface-800 px-2 py-1.5 text-2xs text-slate-300 outline-none focus:border-cyan-500/50"
        >
          <option value="all">All Event Types</option>
          {[...new Set(eventsData.map(event => event.type))].map(type => (
            <option key={type} value={type}>{type[0].toUpperCase() + type.slice(1)}</option>
          ))}
        </select>

        <label className="sr-only" htmlFor="activity-time-filter">Filter by time range</label>
        <select
          id="activity-time-filter"
          value={timeFilter}
          onChange={event => setTimeFilter(event.target.value)}
          className="rounded-md border border-surface-700 bg-surface-800 px-2 py-1.5 text-2xs text-slate-300 outline-none focus:border-cyan-500/50"
        >
          <option value="24h">Last 24 Hours</option>
          <option value="all">All Available</option>
        </select>
        <span className="ml-auto text-2xs text-slate-600">{events.length} events</span>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-surface-800/60">
        {error && <div className="px-5 py-3 text-xs text-red-400">{error}</div>}
        {sourceErrors.length > 0 && <div className="px-5 py-3 text-2xs text-yellow-400">Unavailable sources: {sourceErrors.join(', ')}</div>}
        {loading && <div className="px-5 py-6 text-center text-xs text-slate-500">Loading activity…</div>}
        {events.map(event => {
          const Icon      = TYPE_ICONS[event.type] ?? Info
          const typeColor = TYPE_COLORS[event.type] ?? TYPE_COLORS.info
          const severityBar = SEVERITY_BAR[event.severity ?? 'info']
          const pColor    = PRODUCT_COLORS[event.productId] ?? 'text-slate-400'

          return (
            <div key={event.id} className="relative flex items-start gap-3 px-5 py-3.5 hover:bg-surface-800/40 transition-colors group">
              {/* Severity bar */}
              <div className={cn('absolute left-0 inset-y-0 w-0.5 rounded-r opacity-60', severityBar)} />

              {/* Icon */}
              <div className={cn('flex items-center justify-center w-7 h-7 rounded-lg border shrink-0 mt-0.5', typeColor)}>
                <Icon size={13} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5 mb-0.5">
                  <span className={cn('text-2xs font-bold', pColor)}>{event.productName}</span>
                  <span className="text-2xs text-slate-600">·</span>
                  <span className="text-2xs text-slate-500 font-medium capitalize">{event.type}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">{event.message}</p>
                <span className="text-2xs text-slate-600 mt-1 block">{timeAgo(event.timestamp)}</span>
              </div>
            </div>
          )
        })}
        {events.length === 0 && (
          <div className="flex items-center justify-center h-32 text-xs text-slate-500">No matching events</div>
        )}
      </div>

      {pathname !== '/activity' && (
        <div className="px-5 py-3 border-t border-surface-800 text-center">
          <Link href="/activity" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
            View full activity log →
          </Link>
        </div>
      )}
    </div>
  )
}
