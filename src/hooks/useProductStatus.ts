'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ProductStatusResult, AggregateStatus } from '@/types'

interface UseProductStatusResult {
  statuses: Record<string, ProductStatusResult>
  aggregate: AggregateStatus | null
  loading: boolean
  refreshing: boolean
  refresh: () => void
  lastUpdated: string | null
}

export function useProductStatus(intervalSeconds = 30): UseProductStatusResult {
  const [statuses,    setStatuses]    = useState<Record<string, ProductStatusResult>>({})
  const [aggregate,   setAggregate]   = useState<AggregateStatus | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [refreshing,  setRefreshing]  = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const poll = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true)
    try {
      const res  = await fetch('/api/products/status', { cache: 'no-store' })
      if (!res.ok) return
      const data: ProductStatusResult[] = await res.json()

      const map: Record<string, ProductStatusResult> = {}
      data.forEach(r => { map[r.id] = r })
      setStatuses(map)

      const agg: AggregateStatus = {
        online:      data.filter(r => r.status === 'online').length,
        degraded:    data.filter(r => r.status === 'degraded').length,
        offline:     data.filter(r => r.status === 'offline').length,
        unknown:     data.filter(r => r.status === 'unknown').length,
        total:       data.length,
        lastUpdated: new Date().toISOString(),
      }
      setAggregate(agg)
      setLastUpdated(new Date().toISOString())
    } catch {
      // network error — keep stale data
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    poll()
    const id = setInterval(() => poll(), intervalSeconds * 1000)
    return () => clearInterval(id)
  }, [poll, intervalSeconds])

  return {
    statuses,
    aggregate,
    loading,
    refreshing,
    refresh: () => poll(true),
    lastUpdated,
  }
}
