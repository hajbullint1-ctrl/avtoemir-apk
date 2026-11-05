'use client'

import { useRef, useState } from 'react'
import { BookOpen, Car, ClipboardCheck, House, Info, LogOut, MessagesSquare } from 'lucide-react'
import { LangToggle } from '@/components/shared/lang-toggle'
import { ThemeToggle } from '@/components/shared/theme-toggle'
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
  const { t, notices, session, ready, logout, tl, maintenanceMode, me } = useStore()
  const [active, setActive] = useState('home')
  const [showAbout, setShowAbout] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const isGuest = !session || session.accountId === 'guest_play_review'
  const unread = notices.filter((n) => (!n.studentId || n.studentId === me.id) && !n.read).length

  // Leave About / guest mode and return to the real login screen
  const exitToLogin = () => {
    setShowAbout(false)
    if (session?.accountId === 'guest_play_review') logout()
  }

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-muted/60">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  // Unauthenticated or guest: only login screen + public "About"
  if (isGuest) {
    if (showAbout) {
      return (
        <div className="flex min-h-dvh flex-col bg-muted/60 md:items-center md:justify-center md:p-6">
          <div className="flex h-dvh w-full flex-col overflow-hidden bg-background md:h-[min(880px,calc(100dvh-3rem))] md:max-w-[420px] md:rounded-[2.25rem] md:border-[6px] md:border-foreground/90 md:shadow-2xl">
            <header className="app-safe-header flex shrink-0 items-center justify-between gap-2 bg-primary px-4 pb-3 text-primary-foreground">
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary-foreground text-primary">
                  <Info className="size-5" aria-hidden="true" />
                </span>
                <div className="leading-tight">
                  <p className="text-base font-extrabold tracking-tight">AvtoEmir</p>
                  <p className="text-[11px] opacity-80">{tl({ ru: 'О нас', kk: 'Біз туралы' })}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={exitToLogin}
                className="rounded-full bg-primary-foreground/15 px-3 py-1.5 text-xs font-medium hover:bg-primary-foreground/25"
              >
                {tl({ ru: 'К входу', kk: 'Кіруге' })}
              </button>
            </header>
            <main className="flex-1 overflow-y-auto px-4 py-4">
              <TabAbout />
              <div className="mt-6 rounded-xl border border-primary/20 bg-accent/40 p-3 text-sm">
                <p>
                  {tl({
                    ru: 'Чтобы записаться на вождение, проходить тесты и пользоваться личным кабинетом, войдите под своим номером ученика или подайте заявку. Администратор: ',
                    kk: 'Жүргізуге жазылу, тесттер тапсыру және жеке кабинет үшін оқушы нөмірімен кіріңіз немесе өтініш беріңіз. Әкімші: ',
                  })}
                  <a href="tel:87083425171" className="font-semibold text-primary hover:underline">87083425171</a>
                </p>
                <button
                  type="button"
                  onClick={exitToLogin}
                  className="mt-3 w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                >
                  {tl({ ru: 'Вернуться к входу', kk: 'Кіруге оралу' })}
                </button>
              </div>
            </main>
            <nav className="shrink-0 border-t bg-card pb-[env(safe-area-inset-bottom)]">
              <ul className="grid grid-cols-3">
                {[
                  { id: 'home', label: tl({ ru: 'Главная', kk: 'Басты' }), icon: House },
                  { id: 'about', label: tl({ ru: 'О нас', kk: 'Біз туралы' }), icon: Info },
                  { id: 'login', label: tl({ ru: 'Вход', kk: 'Кіру' }), icon: LogOut },
                ].map((tab) => {
                  const Icon = tab.icon
                  const locked = tab.id !== 'about'
                  return (
                    <li key={tab.id}>
                      <button
                        type="button"
                        onClick={() => { if (locked) exitToLogin() }}
                        className={cn(
                          'flex w-full flex-col items-center gap-0.5 py-2 text-[10px] font-medium',
                          locked ? 'text-muted-foreground' : 'text-primary',
                        )}
                      >
                        <Icon className="size-5" />
                        <span>{tab.label}</span>
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
    return (
      <div className="relative">
        <AuthScreen onGuest={() => setShowAbout(true)} />
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center md:bottom-8">
          <button
            type="button"
            onClick={() => setShowAbout(true)}
            className="pointer-events-auto rounded-full border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-md hover:bg-muted"
          >
            {tl({ ru: 'О нас', kk: 'Біз туралы' })}
          </button>
        </div>
      </div>
    )
  }

  if (maintenanceMode) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-muted/60 p-6 text-center">
        <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-lg">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-warning/25 text-2xl" aria-hidden="true">
            🔧
          </div>
          <h1 className="text-xl font-bold">
            {tl({ ru: 'Технические работы', kk: 'Техникалық жұмыстар' })}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {tl({
              ru: 'Сейчас ведутся технические работы. Приложение временно недоступно. Попробуйте позже.',
              kk: 'Қазір техникалық жұмыстар жүргізілуде. Қосымша уақытша қолжетімсіз. Кейінірек қайталап көріңіз.',
            })}
          </p>
          <button
            type="button"
            onClick={logout}
            className="mt-6 w-full rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-muted"
          >
            {tl({ ru: 'Выйти', kk: 'Шығу' })}
          </button>
        </div>
      </div>
    )
  }

  const current = tabs.find((x) => x.id === active) ?? tabs[0]

  return (
    <div className="flex min-h-dvh flex-col bg-muted/60 md:items-center md:justify-center md:p-6">
      <div className="flex h-dvh w-full flex-col overflow-hidden bg-background md:h-[min(880px,calc(100dvh-3rem))] md:max-w-[420px] md:rounded-[2.25rem] md:border-[6px] md:border-foreground/90 md:shadow-2xl">
        <header className="app-safe-header flex shrink-0 items-center justify-between gap-2 bg-primary px-4 pb-3 text-primary-foreground">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary-foreground text-primary">
              <Car className="size-5" aria-hidden="true" />
            </span>
            <div className="leading-tight">
              <p className="text-base font-extrabold tracking-tight">AvtoEmir</p>
              <p className="max-w-[160px] truncate text-[11px] opacity-80">{t('appTagline')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
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
