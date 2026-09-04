import 'server-only'
import fs from 'fs'
import path from 'path'

interface AdminPasswordStore {
  passwordHash: string
}

const STORE_PATH = path.join(process.cwd(), 'data', 'admin-password.json')

function readStore(): AdminPasswordStore | null {
  try {
    const value = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')) as Partial<AdminPasswordStore>
    return typeof value.passwordHash === 'string' && value.passwordHash ? { passwordHash: value.passwordHash } : null
  } catch {
    return null
  }
}

export function getAdminPasswordHash(): string {
  const stored = readStore()
  if (stored) return stored.passwordHash
  const encodedHash = process.env.GRID_ADMIN_PASSWORD_HASH_B64 ?? ''
  return encodedHash ? Buffer.from(encodedHash, 'base64').toString('utf8') : ''
}

export function saveAdminPasswordHash(passwordHash: string): void {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true })
  fs.writeFileSync(STORE_PATH, JSON.stringify({ passwordHash }, null, 2), { encoding: 'utf8', mode: 0o600 })
}