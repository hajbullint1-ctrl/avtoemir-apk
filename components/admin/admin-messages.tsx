'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MessageSquare, SendHorizontal, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { studentFullName } from '@/lib/student-name'
import { OnlineBadge } from '@/components/shared/online-badge'
import { cn } from '@/lib/utils'

/**
 * Admin inbox: one thread per student (messages.thread === "admin" + studentId).
 * Student messages: fromMe === true. Admin replies: fromMe === false.
 */
export function AdminMessages() {
  const { messages, students, profiles, presence, replyAsAdmin, deleteMessage, deleteChat, tl } = useStore()
  const listRef = useRef<HTMLDivElement>(null)
  const [text, setText] = useState('')

  const threads = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of students) {
      if (s.id === 'me' && students.some((x) => x.id !== 'me')) continue
      const name = studentFullName(s.id, s.name, profiles, students) || s.name
      map.set(s.id, name)
    }
    for (const m of messages) {
      if (m.thread !== 'admin' || !m.studentId || map.has(m.studentId)) continue
      map.set(m.studentId, studentFullName(m.studentId, m.authorName, profiles, students) || m.authorName || '')
    }
    const legacy = messages.some((m) => m.thread === 'admin' && !m.studentId)
    const list = [...map.entries()].map(([id, name]) => ({ id, name: name || '—', legacy: false }))
    if (legacy) list.push({ id: 'legacy', name: tl({ ru: 'Без профиля', kk: 'Профильсіз' }), legacy: true })
    return list
  }, [messages, students, profiles, tl])

  const [active, setActive] = useState<string>('')
  useEffect(() => {
    if (!active && threads[0]) setActive(threads[0].id)
    else if (active && threads.length && !threads.some((t) => t.id === active)) setActive(threads[0]?.id ?? '')
  }, [threads, active])

  const current = useMemo(
    () =>
      messages.filter((m) => {
        if (m.thread !== 'admin') return false
        if (active === 'legacy') return !m.studentId
        return m.studentId === active
      }),
    [messages, active],
  )

  const activeThread = threads.find((t) => t.id === active)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [current.length, active])

  const submit = () => {
    const v = text.trim()
    if (!v || !active || active === 'legacy') return
    replyAsAdmin('admin', v, { studentId: active, authorName: tl({ ru: 'Администрация', kk: 'Әкімшілік' }) })
    setText('')
  }

  const labelOf = (studentId?: string, authorName?: string) =>
    studentFullName(studentId, authorName, profiles, students) || tl({ ru: 'Студент', kk: 'Студент' })

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <MessageSquare className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">
              {tl({ ru: 'Сообщения студентов', kk: 'Студенттердің хабарламалары' })}
            </h2>
            <p className="text-sm text-muted-foreground">
              {tl({
                ru: 'Имя берётся из профиля (full_name). Ответ уходит в чат этого студента.',
                kk: 'Аты профильден (full_name) алынады. Жауап сол студенттің чатына кетеді.',
              })}
            </p>
          </div>
        </div>

        {threads.length > 0 && (
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {threads.map((th) => (
              <button
                key={th.id}
                type="button"
                onClick={() => setActive(th.id)}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1 text-sm',
                  active === th.id ? 'border-primary bg-primary text-primary-foreground' : 'bg-card',
                )}
              >
                <OnlineBadge lastSeen={th.id === 'legacy' ? undefined : presence[th.id]} onlineLabel="" offlineLabel="" compact />
                {th.name}
              </button>
            ))}
          </div>
        )}

        <div className="rounded-xl border bg-muted/40">
          <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              {active && active !== 'legacy' && (
                <OnlineBadge
                  lastSeen={presence[active]}
                  onlineLabel={tl({ ru: 'онлайн', kk: 'онлайн' })}
                  offlineLabel={tl({ ru: 'не в сети', kk: 'желіде емес' })}
                />
              )}
              <span className="truncate text-sm font-semibold">
                {activeThread?.name ?? tl({ ru: 'Выберите студента', kk: 'Студентті таңдаңыз' })}
              </span>
            </div>
            {active && current.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => {
                  if (active === 'legacy') {
                    for (const m of current) deleteMessage(m.id)
                  } else {
                    deleteChat('admin', active)
                  }
                }}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                {tl({ ru: 'Удалить чат', kk: 'Чатты жою' })}
              </Button>
            )}
          </div>

          <div ref={listRef} className="flex h-80 flex-col gap-2 overflow-y-auto p-3" aria-live="polite">
            {current.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {tl({
                  ru: 'Пока нет сообщений. Когда студент напишет в «Администрация», оно появится здесь с его именем.',
                  kk: 'Әзірге хабарлама жоқ. Студент «Әкімшілік» чатына жазса, атымен мұнда көрінеді.',
                })}
              </p>
            ) : (
              current.map((m) => {
                const isStudent = m.fromMe
                const who = isStudent
                  ? labelOf(m.studentId ?? (active !== 'legacy' ? active : undefined), m.authorName)
                  : m.authorName || tl({ ru: 'Вы (админ)', kk: 'Сіз (админ)' })
                return (
                  <div
                    key={m.id}
                    className={cn(
                      'group relative max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed',
                      isStudent
                        ? 'self-start rounded-bl-sm border bg-card'
                        : 'self-end rounded-br-sm bg-primary text-primary-foreground',
                    )}
                  >
                    <span className={cn('mb-0.5 block text-[10px] font-medium', isStudent ? 'text-muted-foreground' : 'opacity-80')}>
                      {who}
                    </span>
                    {m.text}
                    <span className={cn('mt-0.5 flex items-center justify-end gap-2 text-[10px]', isStudent ? 'text-muted-foreground' : 'opacity-75')}>
                      {m.time}
                      <button
                        type="button"
                        className="opacity-70 hover:opacity-100"
                        aria-label={tl({ ru: 'Удалить сообщение', kk: 'Хабарламаны жою' })}
                        onClick={() => deleteMessage(m.id)}
                      >
                        <Trash2 className="size-3" aria-hidden="true" />
                      </button>
                    </span>
                  </div>
                )
              })
            )}
          </div>

          <form
            className="flex gap-2 border-t p-2"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={!active || active === 'legacy'}
              className="h-10 min-w-0 flex-1 rounded-lg border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
              placeholder={tl({ ru: 'Ответ студенту…', kk: 'Студентке жауап…' })}
            />
            <Button type="submit" size="icon" aria-label={tl({ ru: 'Отправить', kk: 'Жіберу' })} disabled={!text.trim() || !active || active === 'legacy'}>
              <SendHorizontal className="size-4" aria-hidden="true" />
            </Button>
          </form>
        </div>
      </section>
    </div>
  )
}
