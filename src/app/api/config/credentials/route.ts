import { NextRequest, NextResponse } from 'next/server'
import { credentialConfigured, saveCredential } from '@/lib/credentials.server'
import { getEnabledProducts, loadGridConfig } from '@/lib/config.server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ configured: getEnabledProducts(loadGridConfig()).filter(product => credentialConfigured(product.id)).map(product => product.id) })
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json() as { productId?: string; username?: string; password?: string }
    if (!body.productId || !body.username || !body.password) return NextResponse.json({ error: 'Product, username, and password are required' }, { status: 400 })
    saveCredential(body.productId, { username: body.username.trim(), password: body.password })
    return NextResponse.json({ ok: true, configured: credentialConfigured(body.productId) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to save credentials' }, { status: 500 })
  }
}