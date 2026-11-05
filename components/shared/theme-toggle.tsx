'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'ae-theme'

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
}

export function ThemeToggle({ className, tone = 'light' }: { className?: string; tone?: 'light' | 'dark' }) {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as Theme | null) || 'light'
    setTheme(saved)
    applyTheme(saved)
  }, [])

  const toggle = () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem(STORAGE_KEY, next)
    applyTheme(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
      title={theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
      className={cn(
        'flex size-8 items-center justify-center rounded-full transition-colors',
        tone === 'light'
          ? 'bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25'
          : 'bg-muted text-foreground hover:bg-muted/80',
        className,
      )}
    >
      {theme === 'light' ? <Moon className="size-4" aria-hidden="true" /> : <Sun className="size-4" aria-hidden="true" />}
    </button>
  )
}
