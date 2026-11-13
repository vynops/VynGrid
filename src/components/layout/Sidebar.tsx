'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import {
  Grid3x3, LayoutDashboard, Activity, Bell, Settings,
  ChevronLeft, ChevronRight, Server, GitBranch, DollarSign,
  Brain, Database, Zap, Landmark, Network, ExternalLink, LogOut, User,
} from 'lucide-react'
import GRID_CONFIG from '../../../config.grid.json'
import { cn, resolveProductUrl } from '@/lib/utils'
import type { GridConfig } from '@/types'

interface NavItem {
  href: string
  icon: React.ElementType
  label: string
  external?: boolean
  color?: string
}

interface NavGroup {
  section: string
  items: NavItem[]
}

const CONFIG = GRID_CONFIG as GridConfig
const PRODUCT_NAV = CONFIG.products
  .filter(p => p.enabled)
  .sort((a, b) => a.order - b.order)

const NAV_ITEMS: NavGroup[] = [
  {
    section: 'GRID',
    items: [
      { href: '/',         icon: LayoutDashboard, label: 'Overview' },
      { href: '/matrix',   icon: Activity,        label: 'Health Matrix' },
      { href: '/activity', icon: Bell,            label: 'Activity Feed' },
    ],
  },
  {
    section: 'PRODUCTS',
    items: PRODUCT_NAV.map(p => ({
      href: resolveProductUrl(p),
      icon: ({ vynops: Zap, vyndc: Server, vyncicd: GitBranch, vyncost: DollarSign,
               vyndb: Database, vynai: Brain, vynmesh: Network, vynsap: Landmark } as Record<string, React.ElementType>)[p.id] ?? Zap,
      label: p.name,
      color: ({ cyan: 'text-cyan-400', green: 'text-green-400', violet: 'text-violet-400',
                orange: 'text-orange-400', emerald: 'text-emerald-400', blue: 'text-blue-400',
                yellow: 'text-yellow-400', rose: 'text-rose-400' } as Record<string, string>)[p.color],
      external: true,
    })),
  },
  {
    section: 'SYSTEM',
    items: [
      { href: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()
  const userName = session?.user?.name ?? 'Admin'

  return (
    <aside
      className={cn(
        'relative flex flex-col h-screen bg-surface-900 border-r border-surface-800 transition-all duration-300 shrink-0',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-16 px-4 border-b border-surface-800 gap-3 overflow-hidden',
      )}>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 shrink-0">
          <Grid3x3 size={16} className="text-cyan-400" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-sm font-black text-white leading-none tracking-tight">VynGrid</div>
            <div className="text-2xs text-slate-500 mt-0.5">Enterprise Console</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map(group => (
          <div key={group.section} className="mb-4">
            {!collapsed && (
              <div className="px-4 mb-1 text-2xs font-semibold text-slate-600 tracking-widest uppercase">
                {group.section}
              </div>
            )}
            <ul className="space-y-0.5 px-2">
              {group.items.map(item => {
                const Icon = item.icon
                const active = !item.external && pathname === item.href
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      target={item.external ? '_blank' : undefined}
                      rel={item.external ? 'noopener noreferrer' : undefined}
                      className={cn(
                        'flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-all group',
                        active
                          ? 'bg-cyan-500/15 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-surface-800',
                      )}
                    >
                      <Icon
                        size={16}
                        className={cn(
                          'shrink-0',
                          item.color ?? (active ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'),
                        )}
                      />
                      {!collapsed && (
                        <span className="truncate font-medium">{item.label}</span>
                      )}
                      {!collapsed && item.external && (
                        <ExternalLink size={11} className="ml-auto shrink-0 text-slate-600 group-hover:text-slate-400" />
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer: user + sign-out + suite badge */}
      <div className="border-t border-surface-800">
        {/* Logged-in user row */}
        <div className={cn(
          'flex items-center px-3 py-3 gap-2.5',
          collapsed && 'justify-center',
        )}>
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/30 shrink-0">
            <User size={13} className="text-cyan-400" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white truncate">{userName}</div>
              <div className="text-2xs text-slate-500">Administrator</div>
            </div>
          )}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center justify-center w-6 h-6 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={13} />
          </button>
        </div>

        {/* Suite badge */}
        {!collapsed && (
          <div className="mx-3 mb-3 px-2.5 py-1.5 rounded-lg bg-surface-800/60 border border-surface-700/50 flex items-center gap-1.5">
            <Grid3x3 size={10} className="text-cyan-500 shrink-0" />
            <span className="text-2xs text-slate-500 font-medium">Part of VynOps Suite</span>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="absolute -right-3 top-[4.5rem] z-10 flex items-center justify-center w-6 h-6 rounded-full bg-surface-800 border border-surface-700 text-slate-400 hover:text-white hover:bg-surface-700 transition-colors"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  )
}
