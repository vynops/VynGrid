import { NextRequest, NextResponse } from 'next/server'
import { loadGridConfig, saveGridConfig } from '@/lib/config.server'
import type { GridConfig } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const config = loadGridConfig()
    return NextResponse.json(config)
  } catch {
    return NextResponse.json({ error: 'Config not found' }, { status: 404 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body: GridConfig = await req.json()
    if (!body.products || !Array.isArray(body.products)) {
      return NextResponse.json({ error: 'Invalid config shape' }, { status: 400 })
    }
    saveGridConfig(body)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 })
  }
}
