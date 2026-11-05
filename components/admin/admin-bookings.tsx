'use client'

import { useState } from 'react'
import { CalendarCheck, Car, Eraser, Phone, Trash2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

function formatDate(date: string) {
  const d = Number(date.slice(8, 10))
  const m = Number(date.slice(5, 7)) - 1
  const y = date.slice(0, 4)
  return `${d} ${MONTHS[m] || ''} ${y}`
}

export function AdminBookings() {
  const { bookings, instructors, students, cancelBooking, tl } = useStore()
  const [cleared, setCleared] = useState(false)

  const sorted = [...bookings].sort((a, b) => {
    const ka = `${a.date}T${a.time}`
    const kb = `${b.date}T${b.time}`
    return ka.localeCompare(kb)
  })

  /** Старые записи без привязки к ученику */
  const anonymous = sorted.filter((b) => !b.studentId)

  const byInstructor = instructors.map((ins) => ({
    ins,
    items: sorted.filter((b) => b.instructorId === ins.id),
  }))

  const orphan = sorted.filter((b) => !instructors.some((i) => i.id === b.instructorId))

  const clearAnonymous = () => {
    if (anonymous.length === 0) return
    const ok = window.confirm(
      tl({
        ru: `Удалить ${anonymous.length} старых записей без ученика? Это нельзя отменить.`,
        kk: `${anonymous.length} оқушысыз ескі жазбаны жою керек пе? Қайтару мүмкін емес.`,
      }),
    )
    if (!ok) return
    for (const b of anonymous) cancelBooking(b.id)
    setCleared(true)
    setTimeout(() => setCleared(false), 2000)
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="mb-1 text-lg font-semibold">
              {tl({ ru: 'Записи на вождение', kk: 'Жүргізу жазбалары' })}
            </h2>
            <p className="text-sm text-muted-foreground">
              {tl({
                ru: 'Кто к какому инструктору записался и на какое время',
                kk: 'Кім қай нұсқаушыға және қай уақытқа жазылған',
              })}
            </p>
          </div>
          {anonymous.length > 0 ? (
            <Button type="button" variant="outline" className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10" onClick={clearAnonymous}>
              <Eraser className="size-4" aria-hidden="true" />
              {cleared
                ? tl({ ru: 'Очищено', kk: 'Тазаланды' })
                : tl({
                    ru: `Очистить старые (${anonymous.length})`,
                    kk: `Ескілерін тазалау (${anonymous.length})`,
                  })}
            </Button>
          ) : null}
        </div>

        {anonymous.length > 0 ? (
          <div className="mb-4 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
            {tl({
              ru: `Есть ${anonymous.length} записей без ученика (старые). Ученикам они больше не показываются. Можно удалить кнопкой выше.`,
              kk: `${anonymous.length} оқушысыз жазба бар (ескі). Оқушыларға көрсетілмейді. Жоғарыдағы батырмамен жоюға болады.`,
            })}
          </div>
        ) : null}

        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {tl({ ru: 'Пока нет записей', kk: 'Әзірге жазба жоқ' })}
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {byInstructor.map(({ ins, items }) => (
              <div key={ins.id} className="rounded-xl border">
                <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-4 py-3">
                  <span className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {ins.name
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{ins.name}</p>
                    <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Car className="size-3.5" />
                        {ins.car}
                      </span>
                      {ins.phone ? (
                        <a href={`tel:${ins.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                          <Phone className="size-3.5" />
                          {ins.phone}
                        </a>
                      ) : null}
                    </p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    {items.length} {tl({ ru: 'записей', kk: 'жазба' })}
                  </span>
                </div>

                {items.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">
                    {tl({ ru: 'Нет записей к этому инструктору', kk: 'Бұл нұсқаушыға жазба жоқ' })}
                  </p>
                ) : (
                  <ul className="divide-y">
                    {items.map((b) => {
                      const student =
                        students.find((s) => s.id === b.studentId) ||
                        students.find((s) => s.name && s.name === b.studentName)
                      const name = b.studentName || student?.name || tl({ ru: 'Ученик', kk: 'Оқушы' })
                      const phone = b.studentPhone || student?.phone || ''
                      const isAnon = !b.studentId
                      return (
                        <li key={b.id} className="flex items-center gap-3 px-4 py-3">
                          <CalendarCheck className="size-5 shrink-0 text-primary" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">
                              {formatDate(b.date)}, {b.time}
                              {isAnon ? (
                                <span className="ml-2 rounded-full bg-warning/25 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                                  {tl({ ru: 'без ученика', kk: 'оқушысыз' })}
                                </span>
                              ) : null}
                            </p>
                            <p className="flex items-center gap-1 text-sm">
                              <User className="size-3.5 text-muted-foreground" />
                              {isAnon ? tl({ ru: 'Неизвестно', kk: 'Белгісіз' }) : name}
                            </p>
                            {phone ? (
                              <a
                                href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                                className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                              >
                                <Phone className="size-3" />
                                {phone}
                              </a>
                            ) : null}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={tl({ ru: 'Отменить', kk: 'Бас тарту' })}
                            onClick={() => cancelBooking(b.id, { notifyStudent: true })}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            ))}

            {orphan.length > 0 ? (
              <div className="rounded-xl border border-dashed p-4">
                <p className="mb-2 text-sm font-semibold text-muted-foreground">
                  {tl({ ru: 'Без инструктора', kk: 'Нұсқаушысыз' })}
                </p>
                <ul className="flex flex-col gap-2">
                  {orphan.map((b) => (
                    <li key={b.id} className="flex items-center justify-between text-sm">
                      <span>
                        {formatDate(b.date)}, {b.time} — {b.studentName || '—'}
                      </span>
                      <Button variant="ghost" size="icon" onClick={() => cancelBooking(b.id, { notifyStudent: true })}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  )
}
