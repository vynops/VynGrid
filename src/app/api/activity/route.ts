import { NextResponse } from 'next/server'
import { loadGridConfig, getEnabledProducts } from '@/lib/config.server'
import { credentialConfigured, readCredential } from '@/lib/credentials.server'
import type { ActivityEvent, ProductConfig } from '@/types'

export const dynamic = 'force-dynamic'

function normalize(product: ProductConfig, value: unknown): ActivityEvent[] {
  const objectValue = value as { events?: unknown[]; data?: unknown[]; entries?: unknown[]; alerts?: unknown[]; incidents?: unknown[]; active?: unknown[]; deployments?: unknown[]; runs?: unknown[] }
  const records = Array.isArray(value) ? value.flatMap(record => {
    if (record && typeof record === 'object' && Array.isArray((record as { active?: unknown[] }).active)) return (record as { active: unknown[] }).active
    return [record]
  }) : objectValue?.events ?? objectValue?.entries ?? objectValue?.alerts ?? objectValue?.incidents ?? objectValue?.deployments ?? objectValue?.runs ?? objectValue?.active ?? (objectValue?.data ?? [])
  return records.flatMap((record, index) => {
    if (!record || typeof record !== 'object') return []
    const item = record as Record<string, unknown>
    const text = (...values: unknown[]) => values.find(value => typeof value === 'string' && value.trim())?.toString().trim() ?? ''
    const timestamp = text(item.timestamp, item.ts, item.createdAt, item.created_at, item.updatedAt, item.updated_at, item.deployedAt, item.finishedAt, item.ALERT_TIMESTAMP)
    if (!timestamp || Number.isNaN(Date.parse(timestamp))) return []
    const action = text(item.action, item.event, item.kind, item.type, item.status)
    if (/^(login|logout|auth|session)\b/i.test(action)) return []
    const detail = text(item.message, item.detail, item.title, item.name, item.description, item.ALERT_DETAILS, item.ALERT_NAME, item.ALERT_DESCRIPTION)
    if (/^(signed in|signed out|too many failed attempts|wrong password)/i.test(detail)) return []
    const deployment = text(item.pipelineName, item.version, item.environment)
    const message = detail || (deployment ? `Deployment ${deployment}${item.status ? ` (${String(item.status)})` : ''}` : action ? `${product.name}: ${action}` : '')
    if (!message) return []
    const rawType = `${text(item.type, item.kind, item.action, item.event, item.status)} ${product.activityPath ?? ''}`.toLowerCase()
    const type = rawType.includes('deploy') ? 'deployment' : rawType.includes('incident') ? 'incident' : rawType.includes('alert') || rawType.includes('anomal') ? 'alert' : rawType.includes('resolv') ? 'resolve' : 'info'
    const rawSeverity = text(item.severity, item.level, item.ALERT_RATING ? Number(item.ALERT_RATING) >= 5 ? 'critical' : 'warning' : 'info').toLowerCase()
    const severity = rawSeverity === 'critical' || rawSeverity === 'warning' ? rawSeverity : 'info'
    const eventId = text(item.id, item.eventId, item.ALERT_ID, item.runId, item.deploymentId) || String(index)
    return [{ id: `${product.id}:${eventId}:${timestamp}`, productId: product.id, productName: product.name, type, message, severity, timestamp, source: product.activityPath }]
  })
}

async function fetchProduct(product: ProductConfig): Promise<{ events: ActivityEvent[]; error?: string }> {
  const credential = readCredential(product.id)
  if (product.loginPath && !credential) return { events: [], error: 'Credentials not configured' }
  const endpoint = `${product.url}${product.activityPath ?? '/api/activity'}`
  try {
    let cookie = ''
    if (product.loginPath && credential) {
      const login = product.loginType === 'nextauth'
        ? await nextAuthLogin(product.url, credential.username, credential.password)
        : await fetch(`${product.url}${product.loginPath}`, { method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(5000), headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ email: credential.username, password: credential.password }) })
      cookie = getCookieHeader(login)
      if (!login.ok && !cookie) return { events: [], error: `Login failed (HTTP ${login.status})` }
      if (!cookie) return { events: [], error: 'Login returned no session cookie' }
    }
    const response = await fetch(endpoint, { cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(5000), headers: { Accept: 'application/json', ...(cookie ? { Cookie: cookie } : credential ? { Authorization: `Basic ${Buffer.from(`${credential.username}:${credential.password}`).toString('base64')}` } : {}) } })
    if (!response.ok) return { events: [], error: `HTTP ${response.status}` }
    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) return { events: [], error: 'Endpoint returned a login page, not JSON' }
    return { events: normalize(product, await response.json()) }
  } catch (error) {
    return { events: [], error: error instanceof Error ? error.message : 'Connection failed' }
  }
}

export async function GET() {
  try {
    const products = getEnabledProducts(loadGridConfig())
    const results = await Promise.all(products.map(async product => ({ productId: product.id, ...(await fetchProduct(product)) })))
    const events = [...new Map(results.flatMap(result => result.events).map(event => [event.id, event])).values()]
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)).slice(0, 100)
    return NextResponse.json({ events, sources: results.map(({ productId, events: sourceEvents, error }) => ({ productId, count: sourceEvents.length, error })) })
  } catch {
    return NextResponse.json({ error: 'Failed to load activity' }, { status: 500 })
  }
}

async function nextAuthLogin(baseUrl: string, username: string, password: string): Promise<Response> {
  const csrf = await fetch(`${baseUrl}/api/auth/csrf`, { cache: 'no-store', signal: AbortSignal.timeout(5000) })
  const csrfBody = await csrf.json() as { csrfToken?: string }
  const csrfCookie = getCookieHeader(csrf)
  return fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: 'POST', redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(5000),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', ...(csrfCookie ? { Cookie: csrfCookie } : {}) },
    body: new URLSearchParams({ csrfToken: csrfBody.csrfToken ?? '', email: username, password, json: 'true' }),
  })
}

function getCookieHeader(response: Response): string {
  const cookies = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : (response.headers.get('set-cookie') ?? '').split(/,(?=\s*[^;,]+=)/)
  return cookies.map(cookie => cookie.split(';')[0]).filter(Boolean).join('; ')
}