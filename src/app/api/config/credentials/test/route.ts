import { NextRequest, NextResponse } from 'next/server'
import { loadGridConfig, getEnabledProducts } from '@/lib/config.server'
import { readCredential } from '@/lib/credentials.server'

export async function POST(req: NextRequest) {
  try {
    const { productId } = await req.json() as { productId?: string }
    const product = getEnabledProducts(loadGridConfig()).find(item => item.id === productId)
    const credential = productId ? readCredential(productId) : null
    if (!product || (product.loginPath && !credential)) return NextResponse.json({ ok: false, error: 'Product or credentials not found' }, { status: 400 })
    let cookie = ''
    if (product.loginPath && credential) {
      const login = product.loginType === 'nextauth'
        ? await nextAuthLogin(product.url, credential.username, credential.password)
        : await fetch(`${product.url}${product.loginPath}`, { method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(5000), headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ email: credential.username, password: credential.password }) })
      cookie = getCookieHeader(login)
      if (!login.ok && !cookie) {
        const rejected = [302, 400, 401].includes(login.status)
        const error = rejected ? `Invalid username or password (HTTP ${login.status}) - use the email and password that sign in directly to ${product.name}`
          : login.status === 403 ? 'Account is deactivated or blocked (HTTP 403)'
          : login.status === 429 ? 'Product is rate-limiting logins (HTTP 429) - wait a minute and retry'
          : `Login failed (HTTP ${login.status})`
        return NextResponse.json({ ok: false, error }, { status: 502 })
      }
    }
    const response = await fetch(`${product.url}${product.healthPath}`, { cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(5000), headers: { Accept: 'application/json', ...(cookie ? { Cookie: cookie } : credential ? { Authorization: `Basic ${Buffer.from(`${credential.username}:${credential.password}`).toString('base64')}` } : {}) } })
    const contentType = response.headers.get('content-type') ?? ''
    const ok = response.ok && contentType.includes('application/json')
    return NextResponse.json({ ok, error: ok ? undefined : response.status >= 300 && response.status < 400 ? 'Product requires a browser login session' : response.ok ? 'Product returned HTML instead of JSON' : `HTTP ${response.status}` }, { status: ok ? 200 : 502 })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Connection failed' }, { status: 502 })
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