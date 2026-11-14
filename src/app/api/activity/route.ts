import { NextResponse } from 'next/server'
import { loadGridConfig, getEnabledProducts } from '@/lib/config.server'
import { readCredential } from '@/lib/credentials.server'
import { enrichIncidentEvents, normalizeActivity } from '@/lib/activity'
import { resolveProductUrl } from '@/lib/utils'
import type { ActivityEvent, ProductConfig } from '@/types'

export const dynamic = 'force-dynamic'

async function fetchProduct(product: ProductConfig): Promise<{ events: ActivityEvent[]; error?: string; warning?: string }> {
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
    const headers = { Accept: 'application/json', ...(cookie ? { Cookie: cookie } : credential ? { Authorization: `Basic ${Buffer.from(`${credential.username}:${credential.password}`).toString('base64')}` } : {}) }
    const response = await fetch(endpoint, { cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(5000), headers })
    if (!response.ok) return { events: [], error: `HTTP ${response.status}` }
    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) return { events: [], error: 'Endpoint returned a login page, not JSON' }
    let events = normalizeActivity(product, await response.json())
    let warning: string | undefined
    if (product.id === 'vyndb' && events.some(event => event.action === 'incident.escalate')) {
      if (events.some(event => event.action === 'incident.escalate' && !event.incidentTitle)) {
        try {
          const incidents = await fetch(`${product.url}/api/incidents`, { cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(5000), headers })
          if (!incidents.ok) throw new Error(`HTTP ${incidents.status}`)
          events = enrichIncidentEvents(events, await incidents.json())
          if (events.some(event => event.action === 'incident.escalate' && !event.incidentTitle)) {
            warning = 'Some escalation records could not be matched to an incident; details are unavailable'
          }
        } catch (error) {
          warning = `Incident details unavailable: ${error instanceof Error ? error.message : 'Connection failed'}`
        }
      }
      const href = new URL('/incidents', resolveProductUrl(product)).href
      events = events.map(event => event.action === 'incident.escalate' ? { ...event, href } : event)
    }
    return { events, warning }
  } catch (error) {
    return { events: [], error: error instanceof Error ? error.message : 'Connection failed' }
  }
}

export async function GET() {
  try {
    const products = getEnabledProducts(loadGridConfig())
    const results = await Promise.all(products.map(async product => ({ productId: product.id, productName: product.name, ...(await fetchProduct(product)) })))
    const events = [...new Map(results.flatMap(result => result.events).map(event => [event.id, event])).values()]
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
    return NextResponse.json({ events, sources: results.map(({ productId, productName, events: sourceEvents, error, warning }) => ({ productId, productName, count: sourceEvents.length, error, warning })) })
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