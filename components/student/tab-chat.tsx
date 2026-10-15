'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, CalendarClock, FileCheck2, Info, Megaphone, SendHorizontal, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Section } from '@/components/shared/section'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

function Chat() {
  const { t, me, instructors, messages, sendMessage } = useStore()
  const threads = [{ id: 'admin', name: t('administration'), sub: 'AvtoEmir' }].concat(
    instructors.map((i) => ({
      id: i.id,
      name: i.name,
      sub: i.phone ? i.phone : t('instructor'),
    })),
  )
  const [thread, setThread] = useState('admin')
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const current = messages.filter((m) => {
    if (m.thread !== thread) return false
    // Messages sent before profiles were attached stay visible; new ones belong to one student.
    if (!m.studentId) return true
    return m.studentId === me.id
  })
  const active = threads.find((x) => x.id === thread) ?? threads[0]

  useEffect(() => {
    // If selected instructor was removed, fall back to admin
    if (!threads.some((th) => th.id === thread)) setThread('admin')
  }, [threads, thread])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [current.length])

  const submit = () => {
    const v = text.trim()
    if (!v) return
    sendMessage(thread, v)
    setText('')
  }

  return (
    <Section title={t('messages')}>
      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label={t('messages')}>
        {threads.map((th) => (
          <button
            key={th.id}
            type="button"
            role="tab"
            aria-selected={thread === th.id}
            onClick={() => setThread(th.id)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition-colors',
              thread === th.id ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:border-primary/50',
            )}
          >
            <span
              className={cn(
                'flex size-7 items-center justify-center rounded-full text-[11px] font-bold',
                thread === th.id ? 'bg-primary-foreground text-primary' : 'bg-accent text-primary',
              )}
            >
              {th.id === 'admin' ? <ShieldCheck className="size-4" aria-hidden="true" /> : th.name.split(' ').map((w) => w[0]).join('')}
            </span>
            {th.name.split(' ')[0]}
          </button>
        ))}
      </div>

      <div className="rounded-xl border bg-muted/40">
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <span className="size-2 rounded-full bg-success" aria-hidden="true" />
          <span className="text-sm font-semibold">{active?.name ?? t('administration')}</span>
          <span className="text-xs text-muted-foreground">
            • {active?.sub ?? 'AvtoEmir'} • {t('online')}
          </span>
        </div>
        <div ref={listRef} className="flex h-64 flex-col gap-2 overflow-y-auto p-3" aria-live="polite">
          {current.map((m) => (
            <div
              key={m.id}
              className={cn(
                'max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed',
                m.fromMe ? 'self-end rounded-br-sm bg-primary text-primary-foreground' : 'self-start rounded-bl-sm border bg-card',
              )}
            >
              {m.text}
              <span className={cn('mt-0.5 block text-right text-[10px]', m.fromMe ? 'opacity-75' : 'text-muted-foreground')}>
                {m.time}
              </span>
            </div>
          ))}
        </div>
        <form
          className="flex gap-2 border-t p-2"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <label htmlFor="chat-input" className="sr-only">
            {t('typeMessage')}
          </label>
          <input
            id="chat-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.nativeEvent.isComposing || e.keyCode === 229)) e.preventDefault()
            }}
            placeholder={t('typeMessage')}
            className="h-10 min-w-0 flex-1 rounded-lg border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <Button type="submit" size="icon" className="size-10" aria-label={t('send')} disabled={!text.trim()}>
            <SendHorizontal className="size-4" aria-hidden="true" />
          </Button>
        </form>
      </div>
    </Section>
  )
}

function Notifications() {
  const { t, tl, notices, markNoticesRead } = useStore()
  const icons: Record<string, typeof Bell> = {
    lesson: CalendarClock,
    docs: FileCheck2,
    info: Info,
    announce: Megaphone,
  }
  const unread = notices.filter((n) => !n.read).length
  return (
    <Section
      title={
        <span className="flex items-center gap-2">
          <Bell className="size-4 text-primary" aria-hidden="true" />
          {t('notifications')}
          {unread > 0 && (
            <span className="rounded-full bg-destructive px-1.5 text-xs font-semibold text-primary-foreground">{unread}</span>
          )}
        </span>
      }
      action={
        unread > 0 ? (
          <button type="button" onClick={markNoticesRead} className="text-xs font-medium text-primary hover:underline">
            ✓✓
            <span className="sr-only">Прочитано</span>
          </button>
        ) : undefined
      }
    >
      <ul className="flex flex-col gap-2">
        {notices.map((n) => {
          const Icon = icons[n.kind] ?? Bell
          return (
            <li key={n.id} className={cn('flex gap-3 rounded-xl border p-3', !n.read && 'border-primary/40 bg-accent/60')}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-xs">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{tl(n.title)}</p>
                <p className="text-sm text-muted-foreground">{tl(n.body)}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{n.time}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}

export function TabChat() {
  return (
    <div className="flex flex-col gap-4">
      <Notifications />
      <Chat />
    </div>
  )
}
