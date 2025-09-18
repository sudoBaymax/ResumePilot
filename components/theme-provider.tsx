'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { Button } from './ui/button'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])
  if (!mounted) return null
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="transition-colors"
    >
      {resolvedTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </Button>
  )
}
