'use client'

import { useRef, useState } from 'react'
import { BookOpen, Car, ClipboardCheck, House, Info, LogOut, MessagesSquare } from 'lucide-react'
import { LangToggle } from '@/components/shared/lang-toggle'
import { TabHome } from './tab-home'
import { TabTheory } from './tab-theory'
import { TabTests } from './tab-tests'
import { TabDrive } from './tab-drive'
import { TabChat } from './tab-chat'
import { TabAbout } from './tab-about'
import { AuthScreen } from './auth-screen'
import { useStore } from '@/lib/store'
import type { DictKey } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const tabs: { id: string; label: DictKey; icon: typeof House; Comp: () => React.JSX.Element }[] = [
  { id: 'home', label: 'tabHome', icon: House, Comp: TabHome },
  { id: 'theory', label: 'tabTheory', icon: BookOpen, Comp: TabTheory },
  { id: 'tests', label: 'tabTests', icon: ClipboardCheck, Comp: TabTests },
  { id: 'drive', label: 'tabDrive', icon: Car, Comp: TabDrive },
  { id: 'chat', label: 'tabChat', icon: MessagesSquare, Comp: TabChat },
  { id: 'about', label: 'tabAbout', icon: Info, Comp: TabAbout },
]

export function StudentApp() {
  const { t, notices, session, ready, logout, tl } = useStore()
  const [active, setActive] = useState('home')
  const mainRef = useRef<HTMLElement>(null)
  const current = tabs.find((x) => x.id === active)!
  const unread = notices.filter((n) => !n.read).length

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-muted/60">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!session) return <AuthScreen />

  return (
    <div className="flex min-h-dvh flex-col bg-muted/60 md:items-center md:justify-center md:p-6">
      <div className="flex h-dvh w-full flex-col overflow-hidden bg-background md:h-[min(880px,calc(100dvh-3rem))] md:max-w-[420px] md:rounded-[2.25rem] md:border-[6px] md:border-foreground/90 md:shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-2 bg-primary px-4 pb-3 pt-4 text-primary-foreground">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary-foreground text-primary">
              <Car className="size-5" aria-hidden="true" />
            </span>
            <div className="leading-tight">
              <p className="text-base font-extrabold tracking-tight">AvtoEmir</p>
              <p className="max-w-[160px] truncate text-[11px] opacity-80">{session.fullName || t('appTagline')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LangToggle />
            <button type="button" onClick={logout} aria-label={tl({ ru: 'Выйти', kk: 'Шығу' })}
              title={tl({ ru: 'Выйти', kk: 'Шығу' })}
              className="flex size-8 items-center justify-center rounded-full bg-primary-foreground/15 hover:bg-primary-foreground/25">
              <LogOut className="size-4" aria-hidden="true" />
            </button>
          </div>
        </header>
        <main ref={mainRef} className="flex-1 overflow-y-auto px-4 py-4">
          <current.Comp />
        </main>
        <nav aria-label="Навигация" className="shrink-0 border-t bg-card pb-[env(safe-area-inset-bottom)]">
          <ul className="grid grid-cols-6">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = tab.id === active
              return (
                <li key={tab.id}>
                  <button type="button" aria-current={isActive ? 'page' : undefined}
                    onClick={() => { setActive(tab.id); mainRef.current?.scrollTo({ top: 0 }) }}
                    className={cn('relative flex w-full flex-col items-center gap-0.5 px-0.5 py-2 text-[10px] font-medium transition-colors',
                      isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}>
                    {isActive && <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-primary" aria-hidden="true" />}
                    <span className={cn('relative rounded-full px-3 py-1', isActive && 'bg-accent')}>
                      <Icon className="size-5" aria-hidden="true" />
                      {tab.id === 'chat' && unread > 0 && (
                        <span className="absolute right-1.5 top-0.5 size-2 rounded-full bg-destructive" aria-hidden="true" />
                      )}
                    </span>
                    <span className="w-full truncate text-center">{t(tab.label)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </div>
  )
}
