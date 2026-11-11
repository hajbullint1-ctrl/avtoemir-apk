'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Bell, BookOpen, Building2, CalendarCheck, Car, ClipboardCheck, ClipboardList,
  Lock, Map, MessageSquare, MessageSquareText, Smartphone, Users, UserX, Signpost, Wrench,
} from 'lucide-react'
import { LangToggle } from '@/components/shared/lang-toggle'
import { AdminStudents } from './admin-students'
import { AdminDeletedAccounts } from './admin-deleted'
import { AdminNotifications } from './admin-notifications'
import { AdminMessages } from './admin-messages'
import { AdminInstructorChat } from './admin-instructor-chat'
import { AdminBookings } from './admin-bookings'
import { AdminRoutes } from './admin-routes'
import { InstructorsEditor, QuestionsEditor, ReviewsEditor, SchoolEditor, TheoryEditor, RoadSignsEditor } from './admin-content'
import { AdminTestResults } from './admin-test-results'
import { AdminRegistrationRequests } from './admin-registration-requests'
import { useStore } from '@/lib/store'
import { checkAdminPassword, hasAdminSession, setAdminSession } from '@/lib/auth'
import type { L } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const sections: { id: string; label: L; icon: typeof Users; Comp: () => React.JSX.Element }[] = [
  { id: 'students', label: { ru: 'Студенты и документы', kk: 'Студенттер мен құжаттар' }, icon: Users, Comp: AdminStudents },
  { id: 'deleted', label: { ru: 'Удалённые аккаунты', kk: 'Жойылған аккаунттар' }, icon: UserX, Comp: AdminDeletedAccounts },
  { id: 'reg-requests', label: { ru: 'Заявки на регистрацию', kk: 'Тіркелу өтініштері' }, icon: ClipboardList, Comp: AdminRegistrationRequests },
  { id: 'bookings', label: { ru: 'Записи на вождение', kk: 'Жүргізу жазбалары' }, icon: CalendarCheck, Comp: AdminBookings },
  { id: 'messages', label: { ru: 'Сообщения', kk: 'Хабарламалар' }, icon: MessageSquare, Comp: AdminMessages },
  { id: 'instructors-chat', label: { ru: 'Чат инструкторов', kk: 'Нұсқаушылар чаты' }, icon: Car, Comp: AdminInstructorChat },
  { id: 'notifications', label: { ru: 'Уведомления', kk: 'Хабарландырулар' }, icon: Bell, Comp: AdminNotifications },
  { id: 'school', label: { ru: 'Автошкола', kk: 'Автомектеп' }, icon: Building2, Comp: SchoolEditor },
  { id: 'routes', label: { ru: 'Маршруты', kk: 'Маршруттар' }, icon: Map, Comp: AdminRoutes },
  { id: 'theory', label: { ru: 'Теория', kk: 'Теория' }, icon: BookOpen, Comp: TheoryEditor },
  { id: 'road-signs', label: { ru: 'Дорожные знаки', kk: 'Жол белгілері' }, icon: Signpost, Comp: RoadSignsEditor },
  { id: 'tests', label: { ru: 'Тесты', kk: 'Тесттер' }, icon: ClipboardCheck, Comp: QuestionsEditor },
  { id: 'test-history', label: { ru: 'История тестов', kk: 'Тесттер тарихы' }, icon: ClipboardCheck, Comp: AdminTestResults },
  { id: 'instructors', label: { ru: 'Инструкторы', kk: 'Нұсқаушылар' }, icon: Car, Comp: InstructorsEditor },
  { id: 'reviews', label: { ru: 'Отзывы', kk: 'Пікірлер' }, icon: MessageSquareText, Comp: ReviewsEditor },
]

function AdminGate({ onUnlock }: { onUnlock: () => void }) {
  const { tl } = useStore()
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-muted/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-lg">
        <div className="mb-4 flex flex-col items-center gap-2 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Lock className="size-6" aria-hidden="true" />
          </span>
          <h1 className="text-lg font-extrabold">{tl({ ru: 'Панель администратора', kk: 'Әкімші панелі' })}</h1>
          <p className="text-sm text-muted-foreground">{tl({ ru: 'Введите пароль для доступа', kk: 'Кіру үшін құпия сөзді енгізіңіз' })}</p>
        </div>
        <form
          className="flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault()
            setError(false)
            setBusy(true)
            try {
              const res = await fetch('/api/admin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
              })
              const data = await res.json().catch(() => ({}))
              if (res.ok && data?.ok) {
                setAdminSession()
                onUnlock()
                return
              }
              if (checkAdminPassword(password)) {
                setAdminSession()
                onUnlock()
                return
              }
              setError(true)
            } catch {
              if (checkAdminPassword(password)) {
                setAdminSession()
                onUnlock()
              } else setError(true)
            } finally {
              setBusy(false)
            }
          }}
        >
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none ring-primary focus:ring-2"
            placeholder="••••••••"
          />
          {error && (
            <p className="text-sm text-destructive">{tl({ ru: 'Неверный пароль', kk: 'Құпия сөз қате' })}</p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {tl({ ru: 'Войти', kk: 'Кіру' })}
          </Button>
        </form>
        <Link href="/" className="mt-4 block text-center text-sm text-muted-foreground hover:text-foreground">
          {tl({ ru: 'На главную', kk: 'Басты бетке' })}
        </Link>
      </div>
    </div>
  )
}

export function AdminApp() {
  const { tl, students, maintenanceMode, setMaintenanceMode, bookings, deletedRecords } = useStore()
  const [active, setActive] = useState('students')
  const [unlocked, setUnlocked] = useState(false)
  const [checked, setChecked] = useState(false)
  const current = sections.find((s) => s.id === active) || sections[0]
  const pending = students.filter((s) => s.status === 'pending').length
  const bookingCount = bookings.length
  const deletedCount = deletedRecords?.length || 0

  useEffect(() => {
    setUnlocked(hasAdminSession())
    setChecked(true)
  }, [])

  if (!checked) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!unlocked) return <AdminGate onUnlock={() => setUnlocked(true)} />

  return (
    <div className="flex min-h-dvh flex-col bg-muted/50 lg:flex-row">
      {/* Left sidebar — old layout */}
      <aside className="shrink-0 bg-sidebar text-sidebar-foreground lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:flex-col">
        <div className="flex items-center justify-between gap-2 p-4">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
              <Car className="size-5" aria-hidden="true" />
            </span>
            <div className="leading-tight text-left">
              <p className="font-extrabold">AvtoEmir</p>
              <p className="text-[11px] opacity-70">{tl({ ru: 'Панель администратора', kk: 'Әкімші панелі' })}</p>
            </div>
          </div>
          <LangToggle tone="dark" className="lg:hidden" />
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-3">
          <ul className="flex flex-row gap-1 overflow-x-auto px-2 lg:flex-col lg:overflow-visible lg:px-0">
            {sections.map((s) => {
              const Icon = s.icon
              const on = active === s.id
              return (
                <li key={s.id} className="shrink-0 lg:w-full">
                  <button
                    type="button"
                    onClick={() => setActive(s.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors',
                      on
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : 'opacity-80 hover:bg-sidebar-accent hover:opacity-100',
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{tl(s.label)}</span>
                    {s.id === 'students' && pending > 0 && (
                      <span className="ml-auto rounded-full bg-primary/20 px-1.5 text-xs font-bold">{pending}</span>
                    )}
                    {s.id === 'bookings' && bookingCount > 0 && (
                      <span className="ml-auto rounded-full bg-primary/20 px-1.5 text-xs font-bold">{bookingCount}</span>
                    )}
                    {s.id === 'deleted' && deletedCount > 0 && (
                      <span className="ml-auto rounded-full bg-primary/20 px-1.5 text-xs font-bold">{deletedCount}</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="hidden space-y-2 p-4 lg:block">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg border border-sidebar-border px-3 py-2 text-left text-sm opacity-80 hover:opacity-100"
          >
            <Smartphone className="size-4" aria-hidden="true" />
            {tl({ ru: 'Приложение студента', kk: 'Студент қосымшасы' })}
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b bg-card px-5 py-4">
          <div className="flex min-w-0 items-center gap-3 text-left">
            <Link
              href="/"
              aria-label={tl({ ru: 'Назад', kk: 'Артқа' })}
              className="text-muted-foreground hover:text-foreground lg:hidden"
            >
              <ArrowLeft className="size-5" aria-hidden="true" />
            </Link>
            <h1 className="truncate text-xl font-bold">{tl(current.label)}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant={maintenanceMode ? 'default' : 'outline'}
              size="sm"
              className={cn('gap-1.5', maintenanceMode && 'bg-warning text-foreground hover:bg-warning/90')}
              onClick={() => setMaintenanceMode(!maintenanceMode)}
            >
              <Wrench className="size-4" aria-hidden="true" />
              {maintenanceMode
                ? tl({ ru: 'Снять техработы', kk: 'Техжұмысты өшіру' })
                : tl({ ru: 'Техработы', kk: 'Техжұмыс' })}
            </Button>
            <LangToggle tone="dark" className="hidden lg:inline-flex" />
          </div>
        </header>
        {maintenanceMode && (
          <div className="border-b border-warning/40 bg-warning/15 px-5 py-2 text-left text-sm font-medium">
            {tl({
              ru: 'Включён режим технических работ — у всех учеников приложение заблокировано',
              kk: 'Техникалық жұмыс режимі қосулы — барлық оқушыларда қосымша бұғатталған',
            })}
          </div>
        )}
        <main className="flex-1 p-4 lg:p-6">
          <div className="mx-auto max-w-6xl">
            <current.Comp />
          </div>
        </main>
      </div>
    </div>
  )
}
