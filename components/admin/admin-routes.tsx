'use client'

import { useState } from 'react'
import { MapPin, Plus, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import type { L } from '@/lib/i18n'
import type { SchoolRoute } from '@/lib/data'
import { cn } from '@/lib/utils'

const inputCls =
  'h-10 w-full rounded-lg border bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
const uid = () => Math.random().toString(36).slice(2, 9)
const emptyL = (): L => ({ ru: '', kk: '' })

function BiInput({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string
  value: L
  onChange: (v: L) => void
  multiline?: boolean
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {(['ru', 'kk'] as const).map((lng) => (
        <label key={lng} className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          {label} ({lng === 'ru' ? 'RU' : 'ҚАЗ'})
          {multiline ? (
            <textarea
              rows={3}
              value={value[lng]}
              onChange={(e) => onChange({ ...value, [lng]: e.target.value })}
              className={cn(inputCls, 'h-auto py-2')}
            />
          ) : (
            <input
              value={value[lng]}
              onChange={(e) => onChange({ ...value, [lng]: e.target.value })}
              className={inputCls}
            />
          )}
        </label>
      ))}
    </div>
  )
}

export function AdminRoutes() {
  const { school, setSchool, tl } = useStore()
  const [examAddress, setExamAddress] = useState<L>(
    school.examAddress || {
      ru: 'Специализированный отдел г. Туркестан по обслуживанию населения, Қазыбек би улица, 9/9, с. 30 лет Казахстана, район Сауран, Туркестанская область, 161223',
      kk: 'Түркістан қ. халыққа қызмет көрсетудің мамандандырылған бөлімі, Қазыбек би көшесі, 9/9, Қазақстанның 30 жылдығы а., Сауран ауданы, Түркістан облысы, 161223',
    },
  )
  const [routes, setRoutes] = useState<SchoolRoute[]>(school.routes?.length ? school.routes : [])
  const [saved, setSaved] = useState(false)

  const save = () => {
    setSchool({
      ...school,
      examAddress: {
        ru: examAddress.ru.trim(),
        kk: examAddress.kk.trim() || examAddress.ru.trim(),
      },
      routes: routes.map((r) => ({
        ...r,
        name: { ru: r.name.ru.trim(), kk: r.name.kk.trim() || r.name.ru.trim() },
        steps: r.steps
          .map((s) => ({ ru: s.ru.trim(), kk: s.kk.trim() || s.ru.trim() }))
          .filter((s) => s.ru),
      })),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  const updateRoute = (id: string, patch: Partial<SchoolRoute>) => {
    setRoutes((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="mb-1 text-lg font-semibold">
          {tl({ ru: 'Адрес экзамена', kk: 'Емтихан мекенжайы' })}
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {tl({
            ru: 'Показывается ученикам в разделе «Экзаменационные маршруты»',
            kk: 'Оқушыларға «Емтихан бағыттары» бөлімінде көрсетіледі',
          })}
        </p>
        <BiInput
          label={tl({ ru: 'Адрес', kk: 'Мекенжай' })}
          value={examAddress}
          onChange={setExamAddress}
          multiline
        />
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">
              {tl({ ru: 'Наши маршруты', kk: 'Біздің бағыттар' })}
            </h2>
            <p className="text-sm text-muted-foreground">
              {tl({
                ru: 'Учебные маршруты автошколы (можно менять шаги)',
                kk: 'Автомектептің оқу бағыттары (қадамдарды өзгертуге болады)',
              })}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setRoutes([
                ...routes,
                {
                  id: uid(),
                  name: { ru: `Маршрут №${routes.length + 1}`, kk: `№${routes.length + 1} бағыт` },
                  steps: [emptyL()],
                },
              ])
            }
          >
            <Plus className="size-4" />
            {tl({ ru: 'Добавить маршрут', kk: 'Бағыт қосу' })}
          </Button>
        </div>

        {routes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {tl({ ru: 'Маршрутов пока нет — добавьте первый', kk: 'Бағыттар жоқ — біріншісін қосыңыз' })}
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {routes.map((r, idx) => (
              <li key={r.id} className="rounded-xl border p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <MapPin className="size-4 text-primary" />
                    {tl({ ru: 'Маршрут', kk: 'Бағыт' })} {idx + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setRoutes(routes.filter((x) => x.id !== r.id))}
                    aria-label={tl({ ru: 'Удалить', kk: 'Жою' })}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
                <BiInput
                  label={tl({ ru: 'Название', kk: 'Атауы' })}
                  value={r.name}
                  onChange={(name) => updateRoute(r.id, { name })}
                />
                <div className="mt-3 flex flex-col gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {tl({ ru: 'Точки маршрута', kk: 'Бағыт нүктелері' })}
                  </span>
                  {r.steps.map((step, si) => (
                    <div key={si} className="flex items-start gap-2">
                      <span className="mt-2 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                        {si + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <BiInput
                          label={tl({ ru: 'Шаг', kk: 'Қадам' })}
                          value={step}
                          onChange={(v) => {
                            const next = [...r.steps]
                            next[si] = v
                            updateRoute(r.id, { steps: next })
                          }}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-5"
                        disabled={r.steps.length <= 1}
                        onClick={() => updateRoute(r.id, { steps: r.steps.filter((_, j) => j !== si) })}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={() => updateRoute(r.id, { steps: [...r.steps, emptyL()] })}
                  >
                    <Plus className="size-4" />
                    {tl({ ru: 'Добавить точку', kk: 'Нүкте қосу' })}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex justify-end">
        <Button type="button" onClick={save}>
          <Save className="size-4" />
          {saved ? tl({ ru: 'Сохранено', kk: 'Сақталды' }) : tl({ ru: 'Сохранить', kk: 'Сақтау' })}
        </Button>
      </div>
    </div>
  )
}
