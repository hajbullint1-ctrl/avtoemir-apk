'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Car, SendHorizontal, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { studentFullName } from '@/lib/student-name'
import { cn } from '@/lib/utils'

/** Separate admin inbox for student ↔ instructor threads (not the administration chat). */
export function AdminInstructorChat() {
  const { instructors, messages, students, profiles, replyAsAdmin, deleteMessage, deleteChat, tl } = useStore()
  const listRef = useRef<HTMLDivElement>(null)
  const [text, setText] = useState('')
  const [active, setActive] = useState(instructors[0]?.id ?? '')
  const [target, setTarget] = useState('')

  useEffect(() => {
    if (!instructors.some((i) => i.id === active)) setActive(instructors[0]?.id ?? '')
  }, [instructors, active])

  const current = useMemo(() => messages.filter((m) => m.thread === active), [messages, active])
  const instructor = instructors.find((i) => i.id === active)
  const targets = useMemo(() => {
    const ids = new Set<string>()
    for (const m of current) if (m.studentId) ids.add(m.studentId)
    for (const s of students) {
      if (s.id === 'me' && students.some((x) => x.id !== 'me')) continue
      ids.add(s.id)
    }
    return [...ids].map((id) => ({
      id,
      name: studentFullName(id, undefined, profiles, students) || id,
    }))
  }, [current, students, profiles])

  useEffect(() => {
    if (!targets.some((x) => x.id === target)) setTarget(targets[0]?.id ?? '')
  }, [targets, target])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [current.length, active])

  const submit = () => {
    const v = text.trim()
    if (!v || !active) return
    replyAsAdmin(active, v, {
      studentId: target || undefined,
      authorName: instructor?.name || tl({ ru: 'Инструктор', kk: 'Нұсқаушы' }),
    })
    setText('')
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Car className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">
              {tl({ ru: 'Чат инструкторов', kk: 'Нұсқаушылар чаты' })}
            </h2>
            <p className="text-sm text-muted-foreground">
              {tl({
                ru: 'Переписка студентов с инструкторами. Ответ приходит в чат выбранного инструктора.',
                kk: 'Студенттердің нұсқаушылармен хаттамасы. Жауап таңдалған нұсқаушы чатына түседі.',
              })}
            </p>
          </div>
        </div>

        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {instructors.map((i) => (
            <button
              key={i.id}
              type="button"
              onClick={() => setActive(i.id)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1 text-sm',
                active === i.id ? 'border-primary bg-primary text-primary-foreground' : 'bg-card',
              )}
            >
              {i.name.split(' ')[0]}
            </button>
          ))}
        </div>

        <div className="rounded-xl border bg-muted/40">
          <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
            <span className="truncate text-sm font-semibold">{instructor?.name ?? '—'}</span>
            {active && current.length > 0 && (
              <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => deleteChat(active)}>
                <Trash2 className="size-4" aria-hidden="true" />
                {tl({ ru: 'Удалить чат', kk: 'Чатты жою' })}
              </Button>
            )}
          </div>
          <div ref={listRef} className="flex h-80 flex-col gap-2 overflow-y-auto p-3">
            {current.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {tl({ ru: 'В этом чате пока пусто', kk: 'Бұл чатта әзірге бос' })}
              </p>
            ) : (
              current.map((m) => {
                const isStudent = m.fromMe
                const who = isStudent
                  ? studentFullName(m.studentId, m.authorName, profiles, students) ||
                    tl({ ru: 'Студент', kk: 'Студент' })
                  : m.authorName || instructor?.name || tl({ ru: 'Инструктор', kk: 'Нұсқаушы' })
                return (
                  <div
                    key={m.id}
                    className={cn(
                      'max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed',
                      isStudent ? 'self-start rounded-bl-sm border bg-card' : 'self-end rounded-br-sm bg-primary text-primary-foreground',
                    )}
                  >
                    <span className={cn('mb-0.5 block text-[10px] font-medium', isStudent ? 'text-muted-foreground' : 'opacity-80')}>
                      {who}
                    </span>
                    {m.text}
                    <span className={cn('mt-0.5 flex items-center justify-end gap-2 text-[10px]', isStudent ? 'text-muted-foreground' : 'opacity-75')}>
                      {m.time}
                      <button type="button" aria-label={tl({ ru: 'Удалить сообщение', kk: 'Хабарламаны жою' })} onClick={() => deleteMessage(m.id)}>
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
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="h-10 max-w-[40%] rounded-lg border bg-card px-2 text-sm"
              aria-label={tl({ ru: 'Кому', kk: 'Кімге' })}
            >
              {targets.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={!active || !target}
              className="h-10 min-w-0 flex-1 rounded-lg border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              placeholder={tl({ ru: 'Ответ от имени инструктора…', kk: 'Нұсқаушы атынан жауап…' })}
            />
            <Button type="submit" size="icon" disabled={!text.trim() || !active || !target} aria-label={tl({ ru: 'Отправить', kk: 'Жіберу' })}>
              <SendHorizontal className="size-4" aria-hidden="true" />
            </Button>
          </form>
        </div>
      </section>
    </div>
  )
}
