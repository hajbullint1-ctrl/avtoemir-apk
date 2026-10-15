'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MessageSquare, SendHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

/**
 * Admin inbox: threads = students who wrote to administration (thread "admin").
 * Student messages: fromMe === true
 * Admin replies: fromMe === false (shown on student side as school reply)
 */
export function AdminMessages() {
  const { messages, students, replyAsAdmin, tl } = useStore()
  const listRef = useRef<HTMLDivElement>(null)
  const [text, setText] = useState('')

  const adminMsgs = useMemo(() => messages.filter((m) => m.thread === 'admin'), [messages])

  // Group by approximate student: we only have one shared "admin" thread in current model.
  // Show full admin thread; optional filter by student name is future work.
  const [activeThread] = useState('admin')
  const current = adminMsgs

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [current.length])

  const submit = () => {
    const v = text.trim()
    if (!v) return
    replyAsAdmin(activeThread, v)
    setText('')
  }

  const studentHint =
    students.find((s) => s.status === 'pending')?.name ||
    students[0]?.name ||
    tl({ ru: 'Студенты', kk: 'Студенттер' })

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
                ru: 'Ответы уходят в чат кабинета студента (Администрация) и сохраняются в базе.',
                kk: 'Жауаптар студент кабинетіндегі чатқа (Әкімшілік) кетеді және базаға сақталады.',
              })}
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-muted/40">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <span className="size-2 rounded-full bg-success" aria-hidden="true" />
            <span className="text-sm font-semibold">
              {tl({ ru: 'Администрация ↔ студенты', kk: 'Әкімшілік ↔ студенттер' })}
            </span>
            <span className="text-xs text-muted-foreground">• {studentHint}</span>
          </div>

          <div ref={listRef} className="flex h-80 flex-col gap-2 overflow-y-auto p-3" aria-live="polite">
            {current.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {tl({
                  ru: 'Пока нет сообщений. Когда студент напишет в чат «Администрация», оно появится здесь.',
                  kk: 'Әзірге хабарлама жоқ. Студент «Әкімшілік» чатына жазса, мұнда көрінеді.',
                })}
              </p>
            ) : (
              current.map((m) => {
                // fromMe true = student; false = admin reply
                const isStudent = m.fromMe
                return (
                  <div
                    key={m.id}
                    className={cn(
                      'max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed',
                      isStudent
                        ? 'self-start rounded-bl-sm border bg-card'
                        : 'self-end rounded-br-sm bg-primary text-primary-foreground',
                    )}
                  >
                    <span className={cn('mb-0.5 block text-[10px] font-medium', isStudent ? 'text-muted-foreground' : 'opacity-80')}>
                      {isStudent
                        ? tl({ ru: 'Студент', kk: 'Студент' })
                        : tl({ ru: 'Вы (админ)', kk: 'Сіз (админ)' })}
                    </span>
                    {m.text}
                    <span
                      className={cn(
                        'mt-0.5 block text-right text-[10px]',
                        isStudent ? 'text-muted-foreground' : 'opacity-75',
                      )}
                    >
                      {m.time}
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
              className="h-10 min-w-0 flex-1 rounded-lg border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              placeholder={tl({ ru: 'Ответ студенту…', kk: 'Студентке жауап…' })}
            />
            <Button type="submit" size="icon" aria-label={tl({ ru: 'Отправить', kk: 'Жіберу' })}>
              <SendHorizontal className="size-4" aria-hidden="true" />
            </Button>
          </form>
        </div>
      </section>
    </div>
  )
}
