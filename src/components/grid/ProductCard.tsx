'use client'

import Link from 'next/link'
import { ExternalLink, Settings2 } from 'lucide-react'
import {
  Zap, Server, GitBranch, DollarSign, Brain, Database, Landmark,
} from 'lucide-react'
import { cn, resolveProductUrl } from '@/lib/utils'
import { COLOR_CLASSES, PRODUCT_DESCRIPTIONS } from '@/lib/products'
import { StatusPill } from './StatusPill'
import type { ProductConfig, ProductStatusResult } from '@/types'

const ICONS: Record<string, React.ElementType> = {
  vynops:  Zap,
  vyndc:   Server,
  vyncicd: GitBranch,
  vyncost: DollarSign,
  vyndb:   Database,
  vynai:   Brain,
  vynhana: Database,
  vynsap:  Landmark,
}

interface ProductCardProps {
  product: ProductConfig
  statusResult?: ProductStatusResult | null
}

export function ProductCard({ product, statusResult }: ProductCardProps) {
  const Icon  = ICONS[product.id] ?? Zap
  const cc    = COLOR_CLASSES[product.color]
  const desc  = PRODUCT_DESCRIPTIONS[product.id] ?? product.tagline
  const status = statusResult?.status ?? 'unknown'

  return (
    <div className={cn(
      'relative flex flex-col rounded-2xl border p-5 transition-all duration-300 group',
      'bg-surface-900/80 card-glass',
      cc.border,
      cc.glow,
      'hover:-translate-y-0.5',
    )}>
      {/* Colored top glow strip */}
      <div className={cn(
        'absolute inset-x-0 top-0 h-px rounded-t-2xl opacity-60',
        cc.bg,
        'bg-gradient-to-r from-transparent via-current to-transparent',
        cc.text,
      )} />

      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div className={cn(
          'flex items-center justify-center w-10 h-10 rounded-xl border',
          cc.bg, cc.border,
        )}>
          <Icon size={18} className={cc.text} />
        </div>
        <StatusPill
          status={status}
          latencyMs={statusResult?.latencyMs}
        />
      </div>

      {/* Name + tagline */}
      <div className="mb-3">
        <h3 className="text-base font-bold text-white leading-tight">{product.name}</h3>
        <p className="text-xs text-slate-500 mt-0.5 font-medium">{product.tagline}</p>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-400 leading-relaxed flex-1 mb-4 line-clamp-3">
        {desc}
      </p>

      {/* Footer actions */}
      <div className="flex items-center gap-2 mt-auto">
        <a
          href={resolveProductUrl(product)}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white transition-all',
            cc.btn, cc.btnHover,
            'shadow-sm hover:shadow-md',
          )}
        >
          Launch
          <ExternalLink size={12} />
        </a>
        <Link
          href={`/settings#${product.id}`}
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-surface-700 text-slate-500 hover:text-white hover:border-surface-600 hover:bg-surface-800 transition-all"
          aria-label={`Configure ${product.name}`}
        >
          <Settings2 size={14} />
        </Link>
      </div>

      {/* Category badge */}
      <div className={cn(
        'absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity',
        'px-1.5 py-0.5 rounded text-2xs font-semibold uppercase tracking-wide',
        cc.badgeBg, cc.text,
      )}>
        {product.category}
      </div>
    </div>
  )
}
