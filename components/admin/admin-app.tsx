'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Bell, BookOpen, Building2, CalendarCheck, Car, ClipboardCheck, ClipboardList, Lock, Map, MessageSquare, MessageSquareText, Smartphone, Users, UserX, Signpost, Wrench } from 'lucide-react'
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
        <form className="flex flex-col gap-3" onSubmit={async (e) => {
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
        }}>
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
  const { tl, maintenanceMode, setMaintenanceMode } = useStore()
  const [unlocked, setUnlocked] = useState(false)
  const [section, setSection] = useState(sections[0].id)

  useEffect(() => {
    setUnlocked(hasAdminSession())
  }, [])

  if (!unlocked) return <AdminGate onUnlock={() => setUnlocked(true)} />

  const Active = sections.find((s) => s.id === section)?.Comp || sections[0].Comp

  return (
    <div className="flex min-h-dvh flex-col bg-muted/40">
      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link
            href="/"
            className="flex size-9 items-center justify-center rounded-xl border bg-background text-muted-foreground hover:bg-muted"
            aria-label="Back"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-extrabold">{tl({ ru: 'Админ-панель', kk: 'Әкімші панелі' })}</h1>
            <p className="truncate text-xs text-muted-foreground">AvtoEmir</p>
          </div>
          <LangToggle />
        </div>
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3">
          {sections.map((s) => {
            const Icon = s.icon
            const on = section === s.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                  on ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {tl(s.label)}
              </button>
            )
          })}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-3">
          <div className="flex items-center gap-2 text-sm">
            <Wrench className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="font-semibold">{tl({ ru: 'Режим обслуживания', kk: 'Қызмет көрсету режимі' })}</span>
            <span className="text-muted-foreground">
              {maintenanceMode
                ? tl({ ru: 'включён — студенты видят заглушку', kk: 'қосулы' })
                : tl({ ru: 'выключен', kk: 'өшірулі' })}
            </span>
          </div>
          <Button
            size="sm"
            variant={maintenanceMode ? 'default' : 'outline'}
            onClick={() => setMaintenanceMode(!maintenanceMode)}
          >
            <Smartphone className="size-3.5" aria-hidden="true" />
            {maintenanceMode
              ? tl({ ru: 'Выключить', kk: 'Өшіру' })
              : tl({ ru: 'Включить', kk: 'Қосу' })}
          </Button>
        </div>
        <Active />
      </main>
    </div>
  )
}
