'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Search, Zap, Server, GitBranch, DollarSign, Brain,
  Database, Landmark, ExternalLink, ArrowRight, Settings,
  LayoutDashboard, Activity,
} from 'lucide-react'
import { cn, resolveProductUrl } from '@/lib/utils'
import type { ProductConfig } from '@/types'
import { COLOR_CLASSES } from '@/lib/products'

const PRODUCT_ICONS: Record<string, React.ElementType> = {
  vynops:  Zap,
  vyndc:   Server,
  vyncicd: GitBranch,
  vyncost: DollarSign,
  vyndb:   Database,
  vynai:   Brain,
  vynhana: Database,
  vynsap:  Landmark,
}

interface CommandItem {
  id: string
  type: 'product' | 'action' | 'nav'
  label: string
  sub?: string
  icon: React.ElementType
  iconColor?: string
  action: () => void
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  products: ProductConfig[]
}

export function CommandPalette({ open, onClose, products }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef  = useRef<HTMLDivElement>(null)

  const allItems: CommandItem[] = [
    {
      id: 'nav-overview', type: 'nav', label: 'Overview', sub: 'Dashboard',
      icon: LayoutDashboard, iconColor: 'text-cyan-400',
      action: () => { window.location.href = '/' },
    },
    {
      id: 'nav-settings', type: 'nav', label: 'Settings', sub: 'Configure products',
      icon: Settings, iconColor: 'text-slate-400',
      action: () => { window.location.href = '/settings' },
    },
    {
      id: 'nav-matrix', type: 'nav', label: 'Health Matrix', sub: 'Live status',
      icon: Activity, iconColor: 'text-cyan-400',
      action: () => { window.location.href = '/matrix' },
    },
    ...products.map(p => {
      const Icon = PRODUCT_ICONS[p.id] ?? Zap
      const cc   = COLOR_CLASSES[p.color]
      return {
        id:        `product-${p.id}`,
        type:      'product' as const,
        label:     p.name,
        sub:       p.tagline,
        icon:      Icon,
        iconColor: cc.text,
        action:    () => { window.open(resolveProductUrl(p), '_blank', 'noopener,noreferrer') },
      }
    }),
  ]

  const filtered = query.trim()
    ? allItems.filter(i =>
        i.label.toLowerCase().includes(query.toLowerCase()) ||
        i.sub?.toLowerCase().includes(query.toLowerCase()),
      )
    : allItems

  // Focus input when open
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Keyboard navigation
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelected(s => Math.min(s + 1, filtered.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelected(s => Math.max(s - 1, 0))
      }
      if (e.key === 'Enter' && filtered[selected]) {
        filtered[selected].action()
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, filtered, selected, onClose])

  useEffect(() => { setSelected(0) }, [query])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-xl mx-4 bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-surface-800">
          <Search size={16} className="text-slate-500 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search products, actions, settings…"
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="px-2 py-0.5 text-2xs font-mono bg-surface-800 border border-surface-700 rounded text-slate-500">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              No results for &quot;{query}&quot;
            </div>
          ) : (
            <>
              {/* Group headers */}
              {['product', 'nav', 'action'].map(type => {
                const group = filtered.filter(i => i.type === type)
                if (!group.length) return null
                const label = type === 'product' ? 'Products' : type === 'nav' ? 'Navigation' : 'Actions'
                return (
                  <div key={type}>
                    <div className="px-4 py-1.5 text-2xs font-semibold text-slate-600 uppercase tracking-wider">
                      {label}
                    </div>
                    {group.map((item, groupIdx) => {
                      const globalIdx = filtered.indexOf(item)
                      const Icon = item.icon
                      return (
                        <button
                          key={item.id}
                          onClick={() => { item.action(); onClose() }}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                            globalIdx === selected
                              ? 'bg-cyan-500/10 border-l-2 border-cyan-500'
                              : 'hover:bg-surface-800',
                          )}
                        >
                          <div className={cn(
                            'flex items-center justify-center w-7 h-7 rounded-lg bg-surface-800 border border-surface-700 shrink-0',
                          )}>
                            <Icon size={14} className={item.iconColor ?? 'text-slate-400'} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white">{item.label}</div>
                            {item.sub && <div className="text-2xs text-slate-500 truncate">{item.sub}</div>}
                          </div>
                          {item.type === 'product'
                            ? <ExternalLink size={13} className="shrink-0 text-slate-600" />
                            : <ArrowRight   size={13} className="shrink-0 text-slate-600" />
                          }
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-t border-surface-800 text-2xs text-slate-600">
          <span><kbd className="font-mono bg-surface-800 px-1.5 py-0.5 rounded border border-surface-700">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono bg-surface-800 px-1.5 py-0.5 rounded border border-surface-700">↵</kbd> open</span>
          <span><kbd className="font-mono bg-surface-800 px-1.5 py-0.5 rounded border border-surface-700">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
