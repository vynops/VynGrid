import NextAuth from 'next-auth'
import { authConfig } from './auth.config'

// Edge-safe: only imports authConfig which has no Node.js-only deps (no bcrypt)
const { auth } = NextAuth(authConfig)

export default auth

export const config = {
  // Protect everything except the login page, NextAuth internals, health check, and Next.js assets
  matcher: ['/((?!login|api/auth|api/health|_next/static|_next/image|favicon.ico).*)'],
}
