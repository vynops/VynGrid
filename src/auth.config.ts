import type { NextAuthConfig } from 'next-auth'

// Edge-compatible config — no Node.js-only imports (no bcrypt here)
export const authConfig: NextAuthConfig = {
  // Required when app is behind reverse proxy/ingress (e.g. nginx TLS termination)
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  pages:   { signIn: '/login' },
  callbacks: {
    authorized({ auth }) {
      return !!auth
    },
    jwt({ token, user }) {
      if (user) token.name = user.name
      return token
    },
    session({ session, token }) {
      if (token.name) session.user.name = token.name as string
      return session
    },
  },
  providers: [], // credentials added in auth.ts (Node.js only)
}
