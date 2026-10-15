'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Bell, BookOpen, Building2, Car, ClipboardCheck, Lock, MessageSquare, MessageSquareText, Smartphone, Users } from 'lucide-react'
import { LangToggle } from '@/components/shared/lang-toggle'
import { AdminStudents } from './admin-students'
import { AdminNotifications } from './admin-notifications'
import { AdminMessages } from './admin-messages'
import { AdminInstructorChat } from './admin-instructor-chat'
import { InstructorsEditor, QuestionsEditor, ReviewsEditor, SchoolEditor, TheoryEditor } from './admin-content'
import { useStore } from '@/lib/store'
import { checkAdminPassword, hasAdminSession, setAdminSession } from '@/lib/auth'
import type { L } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const sections: { id: string; label: L; icon: typeof Users; Comp: () => React.JSX.Element }[] = [
  { id: 'students', label: { ru: 'Студенты и документы', kk: 'Студенттер мен құжаттар' }, icon: Users, Comp: AdminStudents },
  { id: 'messages', label: { ru: 'Сообщения', kk: 'Хабарламалар' }, icon: MessageSquare, Comp: AdminMessages },
  { id: 'instructors-chat', label: { ru: 'Чат инструкторов', kk: 'Нұсқаушылар чаты' }, icon: Car, Comp: AdminInstructorChat },
  { id: 'notifications', label: { ru: 'Уведомления', kk: 'Хабарландырулар' }, icon: Bell, Comp: AdminNotifications },
  { id: 'school', label: { ru: 'Об автошколе', kk: 'Автомектеп туралы' }, icon: Building2, Comp: SchoolEditor },
  { id: 'theory', label: { ru: 'Теория', kk: 'Теория' }, icon: BookOpen, Comp: TheoryEditor },
  { id: 'tests', label: { ru: 'Тесты', kk: 'Тесттер' }, icon: ClipboardCheck, Comp: QuestionsEditor },
  { id: 'instructors', label: { ru: 'Инструкторы', kk: 'Нұсқаушылар' }, icon: Car, Comp: InstructorsEditor },
  { id: 'reviews', label: { ru: 'Отзывы', kk: 'Пікірлер' }, icon: MessageSquareText, Comp: ReviewsEditor },
]

function AdminGate({ onUnlock }: { onUnlock: () => void }) {
  const { tl } = useStore()
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
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
        <form className="flex flex-col gap-3" onSubmit={(e) => {
          e.preventDefault()
          if (checkAdminPassword(password)) { setAdminSession(); onUnlock() } else setError(true)
        }}>
          <input type="password" autoFocus value={password} onChange={(e) => { setPassword(e.target.value); setError(false) }}
            placeholder="••••••••" className="h-11 rounded-xl border bg-background px-3 text-sm outline-none ring-primary focus:ring-2" />
          {error && <p className="text-sm text-destructive" role="alert">{tl({ ru: 'Неверный пароль', kk: 'Құпия сөз қате' })}</p>}
          <Button type="submit" className="w-full">{tl({ ru: 'Войти', kk: 'Кіру' })}</Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link href="/" className="underline-offset-2 hover:underline">{tl({ ru: 'Вернуться в приложение', kk: 'Қолданбаға оралу' })}</Link>
        </p>
      </div>
    </div>
  )
}

export function AdminApp() {
  const { tl, students } = useStore()
  const [active, setActive] = useState('students')
  const [unlocked, setUnlocked] = useState(false)
  const [checked, setChecked] = useState(false)
  const current = sections.find((s) => s.id === active)!
  const pending = students.filter((s) => s.status === 'pending').length

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
      <aside className="shrink-0 bg-sidebar text-sidebar-foreground lg:sticky lg:top-0 lg:h-dvh lg:w-64">
        <div className="flex items-center justify-between gap-2 p-4">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
              <Car className="size-5" aria-hidden="true" />
            </span>
            <div className="leading-tight">
              <p className="font-extrabold">AvtoEmir</p>
              <p className="text-[11px] opacity-70">{tl({ ru: 'Панель администратора', kk: 'Әкімші панелі' })}</p>
            </div>
          </div>
          <LangToggle className="lg:hidden" />
        </div>
        <nav aria-label={tl({ ru: 'Разделы', kk: 'Бөлімдер' })} className="overflow-x-auto px-2 pb-2 lg:pb-4">
          <ul className="flex gap-1 lg:flex-col">
            {sections.map((s) => {
              const Icon = s.icon
              const on = s.id === active
              return (
                <li key={s.id}>
                  <button type="button" aria-current={on ? 'page' : undefined} onClick={() => setActive(s.id)}
                    className={cn(
                      'flex w-full items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      on ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'opacity-80 hover:bg-sidebar-accent/60 hover:opacity-100',
                    )}>
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="flex-1 text-left">{tl(s.label)}</span>
                    {s.id === 'students' && pending > 0 && (
                      <span className="rounded-full bg-warning px-1.5 text-xs font-bold text-foreground">{pending}</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="hidden px-4 lg:block">
          <Link href="/" className="flex items-center gap-2 rounded-lg border border-sidebar-border px-3 py-2 text-sm opacity-80 hover:opacity-100">
            <Smartphone className="size-4" aria-hidden="true" />
            {tl({ ru: 'Приложение студента', kk: 'Студент қосымшасы' })}
          </Link>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b bg-card px-5 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label={tl({ ru: 'Назад', kk: 'Артқа' })} className="text-muted-foreground hover:text-foreground lg:hidden">
              <ArrowLeft className="size-5" aria-hidden="true" />
            </Link>
            <h1 className="text-xl font-bold">{tl(current.label)}</h1>
          </div>
          <LangToggle tone="dark" className="hidden lg:inline-flex" />
        </header>
        <main className="flex-1 p-4 lg:p-6">
          <div className="mx-auto max-w-6xl">
            <current.Comp />
          </div>
        </main>
      </div>
    </div>
  )
}
