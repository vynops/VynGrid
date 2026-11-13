import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { loadGridConfig, getEnabledProducts } from '@/lib/config.server'
import { readCredential } from '@/lib/credentials.server'
import type { ProductConfig, ProductStatusResult } from '@/types'

export const dynamic = 'force-dynamic'

type HealthSample = { timestamp: string; status: ProductStatusResult['status'] }
type HealthHistory = Record<string, HealthSample[]>
const HISTORY_PATH = path.join(process.cwd(), 'data', 'health-history.json')

function readHistory(): HealthHistory {
  try { return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8')) as HealthHistory } catch { return {} }
}

function writeHistory(history: HealthHistory) {
  fs.mkdirSync(path.dirname(HISTORY_PATH), { recursive: true })
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history), { encoding: 'utf8', mode: 0o600 })
}

function uptimeFor(history: HealthHistory, results: ProductStatusResult[]): ProductStatusResult[] {
  const cutoff = Date.now() - 30 * 24 * 3600_000
  const next = { ...history }
  for (const result of results) {
    next[result.id] = [...(next[result.id] ?? []), { timestamp: result.checkedAt, status: result.status }]
      .filter(sample => Date.parse(sample.timestamp) >= cutoff)
  }
  writeHistory(next)

  const now = new Date()
  return results.map(result => {
    const samples = next[result.id] ?? []
    const days: Array<boolean | null> = []
    for (let offset = 29; offset >= 0; offset--) {
      const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offset))
      const nextDay = new Date(day.getTime() + 24 * 3600_000)
      const observed = samples.filter(sample => {
        const time = Date.parse(sample.timestamp)
        return time >= day.getTime() && time < nextDay.getTime()
      })
      days.push(observed.length === 0 ? null : observed.every(sample => sample.status === 'online'))
    }
    const observed = days.filter((day): day is boolean => day !== null)
    return { ...result, uptimeDays: days, uptimePercent: observed.length ? Math.round(observed.filter(Boolean).length / observed.length * 10000) / 100 : null }
  })
}

async function checkProduct(
  id: string,
  url: string,
  healthPath: string,
  loginPath?: string,
  loginType?: ProductConfig['loginType'],
): Promise<ProductStatusResult> {
  const endpoint = `${url}${healthPath}`
  const start    = Date.now()
  try {
    let cookie = ''
    if (loginPath) {
      const credential = readCredential(id)
      if (!credential) return { id, status: 'unknown', latencyMs: null, checkedAt: new Date().toISOString(), message: 'Session credentials required for health check' }
      const login = productLogin(loginPath, loginType, url, credential.username, credential.password)
      const loginResponse = await login
      cookie = getCookieHeader(loginResponse)
      if (!loginResponse.ok && !cookie) return { id, status: 'offline', latencyMs: Date.now() - start, checkedAt: new Date().toISOString(), message: `Login failed (HTTP ${loginResponse.status})` }
      if (!cookie) return { id, status: 'offline', latencyMs: Date.now() - start, checkedAt: new Date().toISOString(), message: 'Login returned no session cookie' }
    }
    const res = await fetch(endpoint, {
      signal:  AbortSignal.timeout(4000),
      cache:   'no-store',
      headers: { 'Accept': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    })
    const latencyMs = Date.now() - start
    const status    = res.ok ? 'online' : 'degraded'
    let version: string | undefined
    try {
      const body = await res.json()
      version = body?.version ?? body?.v
    } catch {}
    return { id, status, latencyMs, checkedAt: new Date().toISOString(), version }
  } catch (err: any) {
    const latencyMs = Date.now() - start
    const isTimeout = err?.name === 'TimeoutError' || err?.name === 'AbortError'
    return {
      id,
      status:    isTimeout ? 'degraded' : 'offline',
      latencyMs: isTimeout ? latencyMs : null,
      checkedAt: new Date().toISOString(),
      message:   err?.message,
    }
  }
}

async function productLogin(loginPath: string, loginType: ProductConfig['loginType'], url: string, username: string, password: string): Promise<Response> {
  if (loginType !== 'nextauth') {
    return fetch(`${url}${loginPath}`, {
      method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(4000),
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: username, password }),
    })
  }
  const csrf = await fetch(`${url}/api/auth/csrf`, { cache: 'no-store', signal: AbortSignal.timeout(4000) })
  const body = await csrf.json() as { csrfToken?: string }
  return fetch(`${url}/api/auth/callback/credentials`, {
    method: 'POST', redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(4000),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', Cookie: getCookieHeader(csrf) },
    body: new URLSearchParams({ csrfToken: body.csrfToken ?? '', email: username, password, json: 'true' }),
  })
}

function getCookieHeader(response: Response): string {
  const cookies = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : (response.headers.get('set-cookie') ?? '').split(/,(?=\s*[^;,]+=)/)
  return cookies.map(cookie => cookie.split(';')[0]).filter(Boolean).join('; ')
}

export async function GET() {
  try {
    const config   = loadGridConfig()
    const products = getEnabledProducts(config)

    const results = await Promise.all(
      products.map(p => checkProduct(p.id, p.url, p.healthPath, p.loginPath, p.loginType)),
    )

    return NextResponse.json(uptimeFor(readHistory(), results), {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load config' }, { status: 500 })
  }
}
