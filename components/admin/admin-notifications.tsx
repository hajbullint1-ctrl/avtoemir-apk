'use client'

import { useState } from 'react'
import { Bell, Megaphone, Send, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import type { L } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const inputCls =
  'h-10 w-full rounded-lg border bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50'

export function AdminNotifications() {
  const { broadcastNotice, deleteNotice, notices, tl } = useStore()
  const [titleRu, setTitleRu] = useState('')
  const [titleKk, setTitleKk] = useState('')
  const [bodyRu, setBodyRu] = useState('')
  const [bodyKk, setBodyKk] = useState('')
  const [sent, setSent] = useState(false)

  const sentList = notices.filter((n) => n.kind === 'announce' || n.kind === 'info')

  const onSend = (e: React.FormEvent) => {
    e.preventDefault()
    const title: L = { ru: titleRu.trim(), kk: titleKk.trim() || titleRu.trim() }
    const body: L = { ru: bodyRu.trim(), kk: bodyKk.trim() || bodyRu.trim() }
    if (!title.ru || !body.ru) return
    broadcastNotice(title, body)
    setTitleRu('')
    setTitleKk('')
    setBodyRu('')
    setBodyKk('')
    setSent(true)
    setTimeout(() => setSent(false), 2500)
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Megaphone className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">
              {tl({ ru: 'Отправить объявление', kk: 'Хабарландыру жіберу' })}
            </h2>
            <p className="text-sm text-muted-foreground">
              {tl({
                ru: 'Сообщение появится у всех студентов в ленте уведомлений и сохранится в базе.',
                kk: 'Хабарлама барлық студенттердің лентасында пайда болады және базаға сақталады.',
              })}
            </p>
          </div>
        </div>
        <form className="flex flex-col gap-3" onSubmit={onSend}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              {tl({ ru: 'Заголовок (RU)', kk: 'Тақырып (RU)' })}
              <input
                required
                value={titleRu}
                onChange={(e) => setTitleRu(e.target.value)}
                className={inputCls}
                placeholder={tl({ ru: 'Например: Изменение расписания', kk: 'Мысалы: Кесте өзгерісі' })}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              {tl({ ru: 'Заголовок (ҚАЗ)', kk: 'Тақырып (ҚАЗ)' })}
              <input
                value={titleKk}
                onChange={(e) => setTitleKk(e.target.value)}
                className={inputCls}
                placeholder={tl({ ru: 'Необязательно', kk: 'Міндетті емес' })}
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              {tl({ ru: 'Текст (RU)', kk: 'Мәтін (RU)' })}
              <textarea
                required
                rows={4}
                value={bodyRu}
                onChange={(e) => setBodyRu(e.target.value)}
                className={cn(inputCls, 'h-auto py-2')}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              {tl({ ru: 'Текст (ҚАЗ)', kk: 'Мәтін (ҚАЗ)' })}
              <textarea
                rows={4}
                value={bodyKk}
                onChange={(e) => setBodyKk(e.target.value)}
                className={cn(inputCls, 'h-auto py-2')}
              />
            </label>
          </div>
          {sent && (
            <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success" role="status">
              {tl({
                ru: 'Объявление отправлено и сохранено в базе',
                kk: 'Хабарландыру жіберілді және базаға сақталды',
              })}
            </p>
          )}
          <Button type="submit" className="self-start">
            <Send className="size-4" aria-hidden="true" />
            {tl({ ru: 'Отправить всем студентам', kk: 'Барлық студенттерге жіберу' })}
          </Button>
        </form>
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Bell className="size-5 text-primary" aria-hidden="true" />
          {tl({ ru: 'История объявлений', kk: 'Хабарландырулар тарихы' })}
        </h2>
        {sentList.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {tl({ ru: 'Пока нет отправленных объявлений', kk: 'Әзірге хабарландыру жоқ' })}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sentList.map((n) => (
              <li key={n.id} className="rounded-xl border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{tl(n.title)}</p>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {n.time}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive"
                      aria-label={tl({ ru: 'Удалить уведомление', kk: 'Хабарландыруды жою' })}
                      onClick={() => deleteNotice(n.id)}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{tl(n.body)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
