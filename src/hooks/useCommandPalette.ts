'use client'

import { useEffect } from 'react'
import { useGridContext } from '@/components/providers'

/** Registers Ctrl+K / Cmd+K to toggle the command palette. */
export function useCommandPalette() {
  const { commandOpen, openCommand, closeCommand } = useGridContext()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        commandOpen ? closeCommand() : openCommand()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [commandOpen, openCommand, closeCommand])

  return { commandOpen, openCommand, closeCommand }
}
