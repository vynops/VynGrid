import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getAdminPasswordHash, saveAdminPasswordHash } from '@/lib/admin-password.server'

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.name) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json() as { currentPassword?: string; newPassword?: string }
    const currentPassword = body.currentPassword ?? ''
    const newPassword = body.newPassword ?? ''
    if (!currentPassword || newPassword.length < 8) {
      return NextResponse.json({ error: 'Enter your current password and a new password of at least 8 characters' }, { status: 400 })
    }
    if (newPassword === currentPassword) return NextResponse.json({ error: 'Choose a different password' }, { status: 400 })

    const currentHash = getAdminPasswordHash()
    if (!currentHash || !(await bcrypt.compare(currentPassword, currentHash))) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    saveAdminPasswordHash(await bcrypt.hash(newPassword, 12))
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unable to change password' }, { status: 500 })
  }
}