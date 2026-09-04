export type ProductColor = 'cyan' | 'green' | 'violet' | 'orange' | 'emerald' | 'blue' | 'yellow' | 'rose'
export type ProductCategory = 'infrastructure' | 'devops' | 'finops' | 'data' | 'ai' | 'sap'
export type ProductStatus = 'online' | 'degraded' | 'offline' | 'unknown'

export interface ProductConfig {
  id: string
  name: string
  tagline: string
  url: string
  subdomain: string
  healthPath: string
  activityPath?: string
  loginPath?: string
  loginType?: 'json' | 'nextauth'
  category: ProductCategory
  color: ProductColor
  enabled: boolean
  order: number
}

export interface GridConfig {
  gridName: string
  version: string
  refreshIntervalSeconds: number
  products: ProductConfig[]
}

export interface ColorClasses {
  text: string
  border: string
  bg: string
  bgHover: string
  badgeBg: string
  badgeBorder: string
  glow: string
  ring: string
  btn: string
  btnHover: string
  dot: string
}

export interface ProductMeta {
  description: string
  icon: string  // lucide icon name
  colorClasses: ColorClasses
}

export interface ProductStatusResult {
  id: string
  status: ProductStatus
  latencyMs: number | null
  checkedAt: string
  version?: string
  message?: string
  uptimeDays?: Array<boolean | null>
  uptimePercent?: number | null
}

export interface AggregateStatus {
  online: number
  degraded: number
  offline: number
  unknown: number
  total: number
  lastUpdated: string
}

export interface ActivityEvent {
  id: string
  productId: string
  productName: string
  type: 'incident' | 'deployment' | 'alert' | 'resolve' | 'info'
  message: string
  timestamp: string
  severity?: 'critical' | 'warning' | 'info'
  source?: string
}

export interface ActivityResponse {
  events: ActivityEvent[]
  sources: Array<{ productId: string; count: number; error?: string }>
}

export interface KPI {
  label: string
  value: string
  subtext?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  color?: string
}
