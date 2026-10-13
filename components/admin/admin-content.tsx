'use client'

import { useState, type ReactNode } from 'react'
import { Eye, EyeOff, Plus, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Stars } from '@/components/shared/section'
import { useStore } from '@/lib/store'
import { CATEGORIES, type Category, type Question, type School } from '@/lib/data'
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
  return (
    <Card title={tl({ ru: 'Информация об автошколе', kk: 'Автомектеп туралы ақпарат' })} action={<SaveButton onClick={() => setSchool(draft)} />}>
      <div className="flex flex-col gap-4">
        <Field label={tl({ ru: 'Название', kk: 'Атауы' })}>
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inputCls} />
        </Field>
        <BiInput label={tl({ ru: 'Описание', kk: 'Сипаттама' })} value={draft.about} onChange={(about) => setDraft({ ...draft, about })} multiline />
        <BiInput label={tl({ ru: 'Режим работы', kk: 'Жұмыс уақыты' })} value={draft.hours} onChange={(hours) => setDraft({ ...draft, hours })} />
        <Field label={tl({ ru: 'Телефоны (через запятую)', kk: 'Телефондар (үтір арқылы)' })}>
          <input
            value={draft.phones.join(', ')}
            onChange={(e) => setDraft({ ...draft, phones: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
            className={inputCls}
          />
        </Field>
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">{tl({ ru: 'Филиалы', kk: 'Филиалдар' })}</h3>
          {draft.branches.map((b, i) => {
            const update = (patch: Partial<typeof b>) =>
              setDraft({ ...draft, branches: draft.branches.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
            return (
              <div key={b.id} className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-3">
                <BiInput label={tl({ ru: 'Город', kk: 'Қала' })} value={b.city} onChange={(city) => update({ city })} />
                <BiInput label={tl({ ru: 'Адрес', kk: 'Мекенжай' })} value={b.address} onChange={(address) => update({ address })} />
                <Field label={tl({ ru: 'Ссылка 2GIS', kk: '2GIS сілтемесі' })}>
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

export function TheoryEditor() {
  const { theory, setTheory, tl } = useStore()
  const [title, setTitle] = useState<L>(emptyL())
  const [lessons, setLessons] = useState(3)
  return (
    <Card title={tl({ ru: 'Темы теории', kk: 'Теория тақырыптары' })}>
      <ul className="mb-4 divide-y rounded-xl border">
        {theory.map((topic, i) => (
          <li key={topic.id} className="flex items-center gap-3 p-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-primary">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{topic.title.ru}</p>
              <p className="truncate text-xs text-muted-foreground">{topic.title.kk}</p>
            </div>
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="sr-only">{tl({ ru: 'Уроков', kk: 'Сабақ' })}</span>
              <input
                type="number"
                min={1}
                max={50}
                value={topic.lessons}
                onChange={(e) => {
                  const n = Math.max(1, Math.min(50, Number(e.target.value) || 1))
                  setTheory(theory.map((x) => (x.id === topic.id ? { ...x, lessons: n, done: Math.min(x.done, n) } : x)))
                }}
                className={cn(inputCls, 'h-8 w-16')}
              />
              {tl({ ru: 'ур.', kk: 'сб.' })}
            </label>
            <Button
              variant="ghost"
              size="icon"
              aria-label={tl({ ru: 'Удалить', kk: 'Жою' })}
              onClick={() => setTheory(theory.filter((x) => x.id !== topic.id))}
            >
              <Trash2 className="size-4 text-destructive" aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>
      <form
        className="flex flex-col gap-3 rounded-xl border border-dashed p-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!title.ru.trim()) return
          setTheory([...theory, { id: uid(), title: { ru: title.ru.trim(), kk: title.kk.trim() || title.ru.trim() }, lessons, done: 0 }])
          setTitle(emptyL())
        }}
      >
        <BiInput label={tl({ ru: 'Новая тема', kk: 'Жаңа тақырып' })} value={title} onChange={setTitle} />
        <div className="flex items-end gap-2">
          <Field label={tl({ ru: 'Уроков', kk: 'Сабақ саны' })}>
            <input type="number" min={1} max={50} value={lessons} onChange={(e) => setLessons(Number(e.target.value) || 1)} className={cn(inputCls, 'w-24')} />
          </Field>
          <Button type="submit">
            <Plus className="size-4" aria-hidden="true" />
            {tl({ ru: 'Добавить', kk: 'Қосу' })}
          </Button>
        </div>
      </form>
    </Card>
  )
}

const emptyQuestion = (): Question => ({ id: '', q: emptyL(), options: [emptyL(), emptyL(), emptyL()], correct: 0, explain: emptyL() })

export function QuestionsEditor() {
  const { questions, setQuestions, tl } = useStore()
  const [draft, setDraft] = useState<Question>(emptyQuestion())
  return (
    <Card title={tl({ ru: 'Вопросы тестов', kk: 'Тест сұрақтары' })}>
      <ul className="mb-4 flex flex-col gap-2">
        {questions.map((q, i) => (
          <li key={q.id} className="rounded-xl border p-3">
            <div className="flex items-start gap-3">
              <span className="text-sm font-bold text-primary">{i + 1}.</span>
              <div className="flex-1">
                <p className="text-sm font-medium">{tl(q.q)}</p>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {q.options.map((o, j) => (
                    <li
                      key={j}
                      className={cn(
                        'rounded-md px-2 py-0.5 text-xs',
                        j === q.correct ? 'bg-success/15 font-semibold text-success' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {tl(o)}
                    </li>
                  ))}
                </ul>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={tl({ ru: 'Удалить', kk: 'Жою' })}
                disabled={questions.length <= 1}
                onClick={() => setQuestions(questions.filter((x) => x.id !== q.id))}
              >
                <Trash2 className="size-4 text-destructive" aria-hidden="true" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <form
        className="flex flex-col gap-3 rounded-xl border border-dashed p-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!draft.q.ru.trim() || draft.options.some((o) => !o.ru.trim())) return
          const fill = (v: L) => ({ ru: v.ru.trim(), kk: v.kk.trim() || v.ru.trim() })
          setQuestions([
            ...questions,
            { id: uid(), q: fill(draft.q), options: draft.options.map(fill), correct: draft.correct, explain: fill(draft.explain) },
          ])
          setDraft(emptyQuestion())
        }}
      >
        <h3 className="text-sm font-semibold">{tl({ ru: 'Новый вопрос', kk: 'Жаңа сұрақ' })}</h3>
        <BiInput label={tl({ ru: 'Вопрос', kk: 'Сұрақ' })} value={draft.q} onChange={(q) => setDraft({ ...draft, q })} />
        {draft.options.map((o, j) => (
          <div key={j} className="flex items-start gap-2">
            <label className="mt-6 flex items-center">
              <input
                type="radio"
                name="correct"
                checked={draft.correct === j}
                onChange={() => setDraft({ ...draft, correct: j })}
                className="size-4 accent-primary"
              />
              <span className="sr-only">{tl({ ru: 'Правильный ответ', kk: 'Дұрыс жауап' })}</span>
            </label>
            <div className="flex-1">
              <BiInput
                label={`${tl({ ru: 'Вариант', kk: 'Нұсқа' })} ${String.fromCharCode(65 + j)}`}
                value={o}
                onChange={(v) => setDraft({ ...draft, options: draft.options.map((x, k) => (k === j ? v : x)) })}
              />
            </div>
          </div>
        ))}
        <BiInput label={tl({ ru: 'Пояснение', kk: 'Түсініктеме' })} value={draft.explain} onChange={(explain) => setDraft({ ...draft, explain })} />
        <Button type="submit" className="self-start">
          <Plus className="size-4" aria-hidden="true" />
          {tl({ ru: 'Добавить вопрос', kk: 'Сұрақ қосу' })}
        </Button>
      </form>
    </Card>
  )
}

export function InstructorsEditor() {
  const { instructors, setInstructors, tl } = useStore()
  const [name, setName] = useState('')
  const [car, setCar] = useState('')
  const update = (id: string, patch: Partial<(typeof instructors)[number]>) =>
    setInstructors(instructors.map((i) => (i.id === id ? { ...i, ...patch } : i)))

  return (
    <Card title={tl({ ru: 'Инструкторы и расписание', kk: 'Нұсқаушылар және кесте' })}>
      <div className="mb-4 flex flex-col gap-3">
        {instructors.map((ins) => (
          <div key={ins.id} className="flex flex-col gap-3 rounded-xl border p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label={tl({ ru: 'ФИО', kk: 'Аты-жөні' })}>
                <input value={ins.name} onChange={(e) => update(ins.id, { name: e.target.value })} className={inputCls} />
              </Field>
              <Field label={tl({ ru: 'Автомобиль', kk: 'Автокөлік' })}>
                <input value={ins.car} onChange={(e) => update(ins.id, { car: e.target.value })} className={inputCls} />
              </Field>
            </div>
            <Field label={tl({ ru: 'Время занятий (через запятую)', kk: 'Сабақ уақыты (үтір арқылы)' })}>
              <input
                defaultValue={ins.slots.join(', ')}
                onBlur={(e) =>
                  update(ins.id, {
                    slots: e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter((s) => /^\d{1,2}:\d{2}$/.test(s)),
                  })
                }
                className={inputCls}
              />
            </Field>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1.5" role="group" aria-label={tl({ ru: 'Категории', kk: 'Санаттар' })}>
                {CATEGORIES.map((c) => {
                  const on = ins.categories.includes(c)
                  return (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        update(ins.id, {
                          categories: on ? ins.categories.filter((x) => x !== c) : ([...ins.categories, c] as Category[]),
                        })
                      }
                      className={cn(
                        'rounded-lg border px-3 py-1 text-xs font-bold',
                        on ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {c}
                    </button>
                  )
                })}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                disabled={instructors.length <= 1}
                onClick={() => setInstructors(instructors.filter((x) => x.id !== ins.id))}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                {tl({ ru: 'Удалить', kk: 'Жою' })}
              </Button>
            </div>
          </div>
        ))}
      </div>
      <form
        className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed p-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          setInstructors([
            ...instructors,
            { id: uid(), name: name.trim(), car: car.trim() || '—', categories: ['B'], slots: ['09:00', '11:00', '14:00', '16:00'] },
          ])
          setName('')
          setCar('')
        }}
      >
        <div className="min-w-40 flex-1">
          <Field label={tl({ ru: 'ФИО', kk: 'Аты-жөні' })}>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <div className="min-w-40 flex-1">
          <Field label={tl({ ru: 'Автомобиль', kk: 'Автокөлік' })}>
            <input value={car} onChange={(e) => setCar(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <Button type="submit">
          <Plus className="size-4" aria-hidden="true" />
          {tl({ ru: 'Добавить', kk: 'Қосу' })}
        </Button>
      </form>
    </Card>
  )
}

export function ReviewsEditor() {
  const { reviews, setReviews, tl } = useStore()
  return (
    <Card title={tl({ ru: 'Модерация отзывов', kk: 'Пікірлерді модерациялау' })}>
      <ul className="flex flex-col gap-2">
        {reviews.map((r) => (
          <li key={r.id} className={cn('flex items-start gap-3 rounded-xl border p-3', !r.visible && 'opacity-60')}>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{r.author}</span>
                <Stars value={r.rating} size="size-3.5" />
                <span className="text-xs text-muted-foreground">{new Date(r.date).toLocaleDateString('ru-RU')}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{r.text}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={r.visible ? tl({ ru: 'Скрыть', kk: 'Жасыру' }) : tl({ ru: 'Показать', kk: 'Көрсету' })}
              onClick={() => setReviews(reviews.map((x) => (x.id === r.id ? { ...x, visible: !x.visible } : x)))}
            >
              {r.visible ? <Eye className="size-4" aria-hidden="true" /> : <EyeOff className="size-4" aria-hidden="true" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={tl({ ru: 'Удалить', kk: 'Жою' })}
              onClick={() => setReviews(reviews.filter((x) => x.id !== r.id))}
            >
              <Trash2 className="size-4 text-destructive" aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  )
}
