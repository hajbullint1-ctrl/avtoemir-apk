'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { type School } from '@/lib/data'
import type { L } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const inputCls =
  'h-10 w-full rounded-lg border bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
const uid = () => Math.random().toString(36).slice(2, 9)
const emptyL = (): L => ({ ru: '', kk: '' })

function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
      {label}
      {children}
    </label>
  )
}

function BiInput({ label, value, onChange, multiline }: { label: string; value: L; onChange: (v: L) => void; multiline?: boolean }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {(['ru', 'kk'] as const).map((lng) => (
        <Field key={lng} label={`${label} (${lng === 'ru' ? 'RU' : 'ҚАЗ'})`}>
          {multiline ? (
            <textarea
              rows={3}
              value={value[lng]}
              onChange={(e) => onChange({ ...value, [lng]: e.target.value })}
              className={cn(inputCls, 'h-auto py-2')}
            />
          ) : (
            <input value={value[lng]} onChange={(e) => onChange({ ...value, [lng]: e.target.value })} className={inputCls} />
          )}
        </Field>
      ))}
    </div>
  )
}

function SaveButton({ onClick }: { onClick: () => void }) {
  const { tl } = useStore()
  const [saved, setSaved] = useState(false)
  return (
    <Button
      onClick={() => {
        onClick()
        setSaved(true)
        setTimeout(() => setSaved(false), 1800)
      }}
    >
      <Save className="size-4" aria-hidden="true" />
      {saved ? tl({ ru: 'Сохранено', kk: 'Сақталды' }) : tl({ ru: 'Сохранить', kk: 'Сақтау' })}
    </Button>
  )
}

export function SchoolEditor() {
  const { school, setSchool, tl } = useStore()
  const [draft, setDraft] = useState<School>(school)
  const [dirty, setDirty] = useState(false)
  // Sync from cloud only when user is not editing
  useEffect(() => {
    if (dirty) return
    setDraft({
      ...school,
      website: school.website ?? '',
      instagram: school.instagram ?? '',
      phones: school.phones?.length ? school.phones : [''],
      branches: school.branches?.length ? school.branches : [],
    })
  }, [school, dirty])
  const patch = (p: Partial<School>) => {
    setDirty(true)
    setDraft((d) => ({ ...d, ...p }))
  }
  return (
    <Card title={tl({ ru: 'Информация об автошколе', kk: 'Автомектеп туралы ақпарат' })} action={<SaveButton onClick={() => { setSchool(draft); setDirty(false) }} />}>
      <div className="flex flex-col gap-4">
        <Field label={tl({ ru: 'Название', kk: 'Атауы' })}>
          <input value={draft.name} onChange={(e) => patch({ name: e.target.value })} className={inputCls} />
        </Field>
        <BiInput label={tl({ ru: 'Описание', kk: 'Сипаттама' })} value={draft.about} onChange={(about) => patch({ about })} multiline />
        <BiInput label={tl({ ru: 'Режим работы', kk: 'Жұмыс уақыты' })} value={draft.hours} onChange={(hours) => patch({ hours })} />
        <Field label={tl({ ru: 'Телефоны (через запятую)', kk: 'Телефондар (үтір арқылы)' })}>
          <input
            value={draft.phones.join(', ')}
            onChange={(e) => patch({ phones: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
            className={inputCls}
          />
        </Field>
        <Field label={tl({ ru: 'Телефон для записи в автошколу', kk: 'Автомектепке жазылу телефоны' })}>
          <input
            type="tel"
            value={draft.phoneEnrollment ?? ''}
            onChange={(e) => patch({ phoneEnrollment: e.target.value })}
            placeholder="+7 7XX XXX XX XX"
            className={inputCls}
          />
        </Field>
        <Field label={tl({ ru: 'Телефон службы поддержки приложения', kk: 'Қолданба қолдау қызметінің телефоны' })}>
          <input
            type="tel"
            value={draft.phoneSupport ?? ''}
            onChange={(e) => patch({ phoneSupport: e.target.value })}
            placeholder="+7 7XX XXX XX XX"
            className={inputCls}
          />
        </Field>
        <Field label="Instagram">
          <input
            type="url"
            value={draft.instagram}
            onChange={(e) => patch({ instagram: e.target.value })}
            placeholder="https://www.instagram.com/..."
            className={inputCls}
          />
        </Field>
        <Field label={tl({ ru: 'Официальный сайт', kk: 'Ресми сайт' })}>
          <input
            type="url"
            value={draft.website}
            onChange={(e) => patch({ website: e.target.value })}
            placeholder="https://avtoemir.autos"
            className={inputCls}
          />
        </Field>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{tl({ ru: 'Филиалы', kk: 'Филиалдар' })}</h3>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setDirty(true)
                setDraft({
                  ...draft,
                  branches: [
                    ...draft.branches,
                    { id: uid(), city: emptyL(), address: emptyL(), link: '' },
                  ],
                })
              }}
            >
              <Plus className="size-4" aria-hidden="true" />
              {tl({ ru: 'Добавить филиал', kk: 'Филиал қосу' })}
            </Button>
          </div>
          {draft.branches.map((b, i) => {
            const update = (p: Partial<typeof b>) => {
              setDirty(true)
              setDraft({ ...draft, branches: draft.branches.map((x, j) => (j === i ? { ...x, ...p } : x)) })
            }
            return (
              <div key={b.id} className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-3">
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={tl({ ru: 'Удалить филиал', kk: 'Филиалды жою' })}
                    disabled={draft.branches.length <= 1}
                    onClick={() => {
                      setDirty(true)
                      setDraft({ ...draft, branches: draft.branches.filter((_, j) => j !== i) })
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" aria-hidden="true" />
                  </Button>
                </div>
                <BiInput label={tl({ ru: 'Город', kk: 'Қала' })} value={b.city} onChange={(city) => update({ city })} />
                <BiInput label={tl({ ru: 'Адрес', kk: 'Мекенжай' })} value={b.address} onChange={(address) => update({ address })} />
                <Field label={tl({ ru: 'Ссылка 2GIS (оставьте пустой, если нет)', kk: '2GIS сілтемесі (жоқ болса бос қалдырыңыз)' })}>
                  <input type="url" value={b.link} onChange={(e) => update({ link: e.target.value })} className={inputCls} />
                </Field>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
