'use client'

import { Search, Bell, Settings, LogOut, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import type { AggregateStatus } from '@/types'

interface TopBarProps {
  aggregate?: AggregateStatus | null
  onRefresh?: () => void
  refreshing?: boolean
  onCommandOpen?: () => void
}

export function TopBar({ aggregate, onRefresh, refreshing, onCommandOpen }: TopBarProps) {
  const { data: session } = useSession()

  const pulse =
    aggregate == null         ? 'bg-slate-500'
    : aggregate.offline > 0   ? 'bg-red-400'
    : aggregate.degraded > 0  ? 'bg-yellow-400'
    : aggregate.unknown === aggregate.total ? 'bg-slate-500'
    : 'bg-green-400'

  const healthLabel =
    aggregate == null         ? 'Connecting…'
    : aggregate.offline > 0   ? `${aggregate.offline} Offline`
    : aggregate.degraded > 0  ? `${aggregate.degraded} Degraded`
    : aggregate.unknown === aggregate.total ? 'Checking…'
    : 'All Systems Operational'

  return (
    <header className="sticky top-0 z-30 flex items-center h-16 px-5 gap-4 bg-surface-950/90 frosted border-b border-surface-800">
      {/* Brand chip */}
      <div className="hidden md:flex items-center gap-2 mr-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-800 border border-surface-700 text-2xs font-semibold text-slate-400">
          <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', pulse)} />
          {healthLabel}
        </div>
      </div>

      {/* Search / Command */}
      <button
        onClick={onCommandOpen}
        className="flex items-center gap-2.5 flex-1 max-w-sm px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-sm text-slate-500 hover:border-surface-600 hover:text-slate-400 transition-colors group"
        aria-label="Open command palette"
      >
        <Search size={14} className="text-slate-600 group-hover:text-slate-400" />
        <span>Search or jump to product…</span>
        <kbd className="ml-auto px-1.5 py-0.5 text-2xs font-mono bg-surface-700 border border-surface-600 rounded text-slate-500">
          Ctrl K
        </kbd>
      </button>

      <div className="flex items-center gap-1.5 ml-auto">
        {/* Refresh */}
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-surface-800 border border-transparent hover:border-surface-700 transition-all disabled:opacity-50"
          aria-label="Refresh status"
        >
          <RefreshCw size={15} className={cn(refreshing && 'animate-spin')} />
        </button>

        {/* Notifications */}
        <Link
          href="/activity"
          className="relative flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-surface-800 border border-transparent hover:border-surface-700 transition-all"
          aria-label="Activity"
        >
          <Bell size={15} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-cyan-400" />
        </Link>

        {/* Settings */}
        <Link
          href="/settings"
          className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-surface-800 border border-transparent hover:border-surface-700 transition-all"
          aria-label="Settings"
        >
          <Settings size={15} />
        </Link>

        {/* User + logout */}
        <div className="flex items-center gap-2 pl-1.5 ml-0.5 border-l border-surface-700">
          {session?.user?.name && (
            <span className="text-xs text-slate-400 font-medium hidden sm:block max-w-[100px] truncate">
              {session.user.name}
            </span>
          )}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </header>
  )
}
