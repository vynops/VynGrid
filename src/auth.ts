import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { authConfig } from './auth.config'
import { getAdminPasswordHash } from './lib/admin-password.server'

// Simple in-memory brute-force guard — resets on process restart
const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS  = 10
const WINDOW_MS     = 15 * 60 * 1000 // 15 min

function checkRateLimit(key: string): boolean {
  const now  = Date.now()
  const rec  = loginAttempts.get(key)
  if (!rec || now > rec.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (rec.count >= MAX_ATTEMPTS) return false
  rec.count++
  return true
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        const username = (credentials?.username as string | undefined)?.trim()
        const password = credentials?.password as string | undefined

        if (!username || !password) return null

        // Rate-limit by username to resist enumeration + brute-force
        if (!checkRateLimit(username)) {
          console.warn(`[VynGrid auth] rate-limit exceeded for "${username}"`)
          return null
        }

        const configuredUser = (process.env.GRID_ADMIN_USER           ?? 'admin').trim()
        const passwordHash = getAdminPasswordHash()

        if (!passwordHash) {
          console.error('[VynGrid auth] GRID_ADMIN_PASSWORD_HASH_B64 is not set — login disabled.')
          return null
        }

        if (username !== configuredUser) return null

        const valid = await bcrypt.compare(password, passwordHash)
        if (!valid) return null

        return { id: '1', name: configuredUser, email: `${configuredUser}@vyngrid.local` }
      },
    }),
  ],
})
