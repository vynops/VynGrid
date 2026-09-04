'use client'

import { ProductCard } from './ProductCard'
import type { ProductConfig, ProductStatusResult } from '@/types'

interface ProductGridProps {
  products: ProductConfig[]
  statuses: Record<string, ProductStatusResult>
}

export function ProductGrid({ products, statuses }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 rounded-2xl border border-dashed border-surface-700 text-slate-500 text-sm">
        No products configured. Add products in Settings.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          statusResult={statuses[product.id] ?? null}
        />
      ))}
    </div>
  )
}
