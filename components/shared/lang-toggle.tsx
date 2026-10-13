'use client'

import { useStore } from '@/lib/store'
import type { Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const options: { value: Lang; label: string; full: string }[] = [
  { value: 'ru', label: 'RU', full: 'Русский' },
  { value: 'kk', label: 'ҚАЗ', full: 'Қазақша' },
]

export function LangToggle({ className, tone = 'light' }: { className?: string; tone?: 'light' | 'dark' }) {
  const { lang, setLang } = useStore()
  return (
    <div
      role="radiogroup"
      aria-label="Язык / Тіл"
      className={cn(
        'inline-flex items-center rounded-full p-0.5 text-xs font-semibold',
        tone === 'light' ? 'bg-primary-foreground/15' : 'bg-muted',
        className,
      )}
    >
      {options.map((o) => {
        const active = lang === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.full}
            onClick={() => {
              setLang(o.value)
              document.documentElement.lang = o.value
            }}
            className={cn(
              'rounded-full px-3 py-1.5 transition-colors',
              active
                ? tone === 'light'
                  ? 'bg-primary-foreground text-primary'
                  : 'bg-primary text-primary-foreground'
                : tone === 'light'
                  ? 'text-primary-foreground/80 hover:text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
