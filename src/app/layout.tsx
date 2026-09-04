import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/providers'
import { Sidebar }   from '@/components/layout/Sidebar'

export const metadata: Metadata = {
  title: { default: 'VynGrid — Enterprise IT Console', template: '%s · VynGrid' },
  description: 'Central enterprise grid console for all Vyn products — unified visibility, control, and operations across your entire IT estate.',
  icons: {
    icon:     '/favicon.png',
    shortcut: '/favicon.png',
    apple:    '/favicon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-surface-950 text-white antialiased flex overflow-hidden">
        <Providers>
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}
