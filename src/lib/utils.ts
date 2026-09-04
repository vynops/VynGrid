import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ProductStatus, ProductConfig } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Returns the production subdomain URL when NEXT_PUBLIC_VYNGRID_DOMAIN is set, else the local URL. */
export function resolveProductUrl(product: Pick<ProductConfig, 'url' | 'subdomain'>): string {
  const domain = process.env.NEXT_PUBLIC_VYNGRID_DOMAIN
  if (domain) return `https://${product.subdomain}.${domain}`
  return product.url
}

export function formatLatency(ms: number | null): string {
  if (ms === null) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  if (diff < 60_000)  return 'just now'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`
  return `${Math.floor(diff / 86400_000)}d ago`
}

export function statusLabel(status: ProductStatus): string {
  return { online: 'Online', degraded: 'Degraded', offline: 'Offline', unknown: 'Unknown' }[status]
}

export function statusColor(status: ProductStatus): string {
  return {
    online:   'text-green-400',
    degraded: 'text-yellow-400',
    offline:  'text-red-400',
    unknown:  'text-slate-400',
  }[status]
}

export function statusDotColor(status: ProductStatus): string {
  return {
    online:   'bg-green-400',
    degraded: 'bg-yellow-400',
    offline:  'bg-red-400',
    unknown:  'bg-slate-500',
  }[status]
}

export function statusBg(status: ProductStatus): string {
  return {
    online:   'bg-green-500/10 border-green-500/20 text-green-400',
    degraded: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    offline:  'bg-red-500/10 border-red-500/20 text-red-400',
    unknown:  'bg-slate-500/10 border-slate-500/20 text-slate-400',
  }[status]
}
