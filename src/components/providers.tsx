'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { SessionProvider } from 'next-auth/react'

interface GridContextValue {
  commandOpen: boolean
  openCommand: () => void
  closeCommand: () => void
}

const GridContext = createContext<GridContextValue>({
  commandOpen: false,
  openCommand: () => {},
  closeCommand: () => {},
})

export function useGridContext() {
  return useContext(GridContext)
}

export function Providers({ children }: { children: ReactNode }) {
  const [commandOpen, setCommandOpen] = useState(false)

  const openCommand  = useCallback(() => setCommandOpen(true),  [])
  const closeCommand = useCallback(() => setCommandOpen(false), [])

  return (
    <SessionProvider>
      <GridContext.Provider value={{ commandOpen, openCommand, closeCommand }}>
        {children}
      </GridContext.Provider>
    </SessionProvider>
  )
}
