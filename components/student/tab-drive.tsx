'use client'

import { useMemo, useState } from 'react'
import { CalendarCheck, Car, MapPin, Route, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Section } from '@/components/shared/section'
import { HillDiagram, ParallelDiagram, SlalomDiagram } from './maneuver-diagrams'
import { useStore } from '@/lib/store'
import { examRoutes } from '@/lib/data'
import { cn } from '@/lib/utils'

const WEEKDAYS = {
  ru: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
  kk: ['Жс', 'Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сн'],
}
const MONTHS = {
  ru: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  kk: ['қаң', 'ақп', 'нау', 'сәу', 'мам', 'мау', 'шіл', 'там', 'қыр', 'қаз', 'қар', 'жел'],
}
const MONTHS_FULL = {
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
  kk: ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'],
}

const toKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function isBusy(date: string, time: string, instructorId: string) {
  const s = `${date}${time}${instructorId}`
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997
  return h % 4 === 0
}

function BookingForm() {
  const { t, lang, instructors, me, bookings, addBooking, cancelBooking } = useStore()
  const days = useMemo(() => {
    const out: Date[] = []
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    while (out.length < 12) {
      d.setDate(d.getDate() + 1)
      if (d.getDay() !== 0) out.push(new Date(d))
    }
    return out
  }, [])
  const available = instructors.filter((i) => i.categories.includes(me.category))
  const list = available.length ? available : instructors
  const [date, setDate] = useState(toKey(days[0]))
  const [instructorId, setInstructorId] = useState(list[0]?.id ?? '')
  const [time, setTime] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const instructor = instructors.find((i) => i.id === instructorId) ?? list[0]

  const taken = (slot: string) =>
    isBusy(date, slot, instructor.id) || bookings.some((b) => b.date === date && b.time === slot && b.instructorId === instructor.id)

  return (
    <>
      <Section title={t('booking')}>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">{t('chooseInstructor')}</h3>
        <div className="mb-4 flex flex-col gap-2" role="radiogroup" aria-label={t('chooseInstructor')}>
          {list.map((i) => (
            <button
              key={i.id}
              type="button"
              role="radio"
              aria-checked={instructor.id === i.id}
              onClick={() => {
                setInstructorId(i.id)
                setTime(null)
              }}
              className={cn(
                'flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors',
                instructor.id === i.id ? 'border-primary bg-accent' : 'hover:border-primary/50',
              )}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {i.name
                  .split(' ')
                  .map((w) => w[0])
                  .join('')}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{i.name}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Car className="size-3.5" aria-hidden="true" />
                  {i.car}
                </span>
              </span>
              <span className="text-xs font-semibold text-primary">{i.categories.join(', ')}</span>
            </button>
          ))}
        </div>

        <h3 className="mb-2 text-sm font-medium text-muted-foreground">{t('chooseDate')}</h3>
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label={t('chooseDate')}>
          {days.map((d) => {
            const key = toKey(d)
            const active = key === date
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setDate(key)
                  setTime(null)
                }}
                className={cn(
                  'flex w-14 shrink-0 flex-col items-center rounded-xl border py-2 transition-colors',
                  active ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:border-primary/50',
                )}
              >
                <span className="text-[11px] uppercase opacity-80">{WEEKDAYS[lang][d.getDay()]}</span>
                <span className="text-lg font-bold">{d.getDate()}</span>
                <span className="text-[10px] opacity-80">{MONTHS[lang][d.getMonth()]}</span>
              </button>
            )
          })}
        </div>

        <h3 className="mb-2 text-sm font-medium text-muted-foreground">{t('chooseTime')}</h3>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('chooseTime')}>
          {instructor.slots.map((slot) => {
            const busy = taken(slot)
            return (
              <button
                key={slot}
                type="button"
                role="radio"
                aria-checked={time === slot}
                disabled={busy}
                onClick={() => setTime(slot)}
                className={cn(
                  'rounded-lg border py-2 text-sm font-semibold tabular-nums transition-colors',
                  busy && 'cursor-not-allowed bg-muted text-muted-foreground line-through',
                  !busy && time === slot && 'border-primary bg-primary text-primary-foreground',
                  !busy && time !== slot && 'hover:border-primary/50',
                )}
              >
                {slot}
                {busy && <span className="sr-only"> ({t('slotTaken')})</span>}
              </button>
            )
          })}
        </div>

        <Button
          className="mt-4 h-11 w-full"
          disabled={!time}
          onClick={() => {
            if (!time) return
            addBooking({ date, time, instructorId: instructor.id })
            setTime(null)
            setDone(true)
            setTimeout(() => setDone(false), 2500)
          }}
        >
          <CalendarCheck className="size-4" aria-hidden="true" />
          {done ? t('booked') : t('confirmBooking')}
        </Button>
      </Section>

      <Section title={t('myLessons')}>
        {bookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noLessons')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {bookings.map((b) => {
              const ins = instructors.find((i) => i.id === b.instructorId)
              return (
                <li key={b.id} className="flex items-center gap-3 rounded-xl border p-3">
                  <CalendarCheck className="size-5 text-primary" aria-hidden="true" />
                  <div className="flex-1 text-sm">
                    <p className="font-semibold">
                      {Number(b.date.slice(8, 10))} {MONTHS_FULL[lang][Number(b.date.slice(5, 7)) - 1]}, {b.time}
                    </p>
                    <p className="text-xs text-muted-foreground">{ins?.name}</p>
                  </div>
                  <Button variant="ghost" size="icon" aria-label={t('cancel')} onClick={() => cancelBooking(b.id)}>
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </Section>
    </>
  )
}

function RangeMap() {
  const { t, tl } = useStore()
  const maneuvers = [
    { key: 'parallel' as const, Diagram: ParallelDiagram },
    { key: 'hill' as const, Diagram: HillDiagram },
    { key: 'slalom' as const, Diagram: SlalomDiagram },
  ]
  return (
    <>
      <Section title={t('rangeMap')}>
        <div className="relative overflow-hidden rounded-xl">
          <img src="/images/driving-range.png" alt={t('rangeMap')} className="aspect-video w-full object-cover" />
          {[
            { n: 1, cls: 'left-[18%] top-[30%]' },
            { n: 2, cls: 'left-[55%] top-[22%]' },
            { n: 3, cls: 'left-[70%] top-[65%]' },
          ].map((p) => (
            <span
              key={p.n}
              className={cn(
                'absolute flex size-7 items-center justify-center rounded-full border-2 border-primary-foreground bg-primary text-xs font-bold text-primary-foreground shadow-md',
                p.cls,
              )}
            >
              {p.n}
            </span>
          ))}
        </div>
        <h3 className="mb-2 mt-4 text-sm font-semibold">{t('maneuvers')}</h3>
        <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-3">
          {maneuvers.map(({ key, Diagram }, i) => (
            <figure key={key} className="rounded-xl border p-2">
              <Diagram />
              <figcaption className="mt-1.5 flex items-start gap-1.5 text-xs font-medium leading-tight">
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {i + 1}
                </span>
                {t(key)}
              </figcaption>
            </figure>
          ))}
        </div>
      </Section>

      <Section title={t('examRoutes')}>
        <div className="flex flex-col gap-3">
          {examRoutes.map((r) => (
            <div key={r.id} className="rounded-xl border p-3">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Route className="size-4 text-primary" aria-hidden="true" />
                {tl(r.name)}
              </h3>
              <ol className="relative ml-2 border-l-2 border-dashed border-primary/30 pl-4">
                {r.steps.map((s, i) => (
                  <li key={i} className="relative pb-2 text-sm last:pb-0">
                    <MapPin className="absolute -left-[25px] top-0.5 size-4 rounded-full bg-card text-primary" aria-hidden="true" />
                    {tl(s)}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </Section>
    </>
  )
}

export function TabDrive() {
  return (
    <div className="flex flex-col gap-4">
      <BookingForm />
      <RangeMap />
    </div>
  )
}
