'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, Eye, EyeOff, ImagePlus, Plus, Save, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Stars } from '@/components/shared/section'
import { useStore } from '@/lib/store'
import { CATEGORIES, type Category, type Question, type School, type TheoryLesson, type TheoryTopic } from '@/lib/data'
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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export { SchoolEditor } from './school-editor'

function LessonEditor({
  lesson,
  onChange,
  onRemove,
}: {
  lesson: TheoryLesson
  onChange: (l: TheoryLesson) => void
  onRemove: () => void
}) {
  const { tl } = useStore()
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-background p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">{tl({ ru: 'Урок', kk: 'Сабақ' })}</span>
        <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label={tl({ ru: 'Удалить урок', kk: 'Сабақты жою' })}>
          <Trash2 className="size-3.5 text-destructive" aria-hidden="true" />
        </Button>
      </div>
      <BiInput label={tl({ ru: 'Заголовок урока', kk: 'Сабақ тақырыбы' })} value={lesson.title} onChange={(title) => onChange({ ...lesson, title })} />
      <BiInput label={tl({ ru: 'Текст урока', kk: 'Сабақ мәтіні' })} value={lesson.body} onChange={(body) => onChange({ ...lesson, body })} multiline />
    </div>
  )
}

export function TheoryEditor() {
  const { theory, setTheory, tl } = useStore()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [title, setTitle] = useState<L>(emptyL())

  const updateTopic = (id: string, patch: Partial<TheoryTopic> | ((t: TheoryTopic) => TheoryTopic)) => {
    setTheory(
      theory.map((t) => {
        if (t.id !== id) return t
        return typeof patch === 'function' ? patch(t) : { ...t, ...patch }
      }),
    )
  }

  return (
    <Card title={tl({ ru: 'Темы и уроки теории', kk: 'Теория тақырыптары мен сабақтары' })}>
      <ul className="mb-4 flex flex-col gap-2">
        {theory.map((topic, i) => {
          const open = expanded === topic.id
          const content = topic.content ?? []
          return (
            <li key={topic.id} className="rounded-xl border">
              <div className="flex items-center gap-3 p-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-primary">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{topic.title.ru || '—'}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {content.length} {tl({ ru: 'уроков', kk: 'сабақ' })} • {topic.title.kk || ''}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="icon" aria-expanded={open} aria-label={tl({ ru: 'Редактировать', kk: 'Өңдеу' })} onClick={() => setExpanded(open ? null : topic.id)}>
                  {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </Button>
                <Button type="button" variant="ghost" size="icon" aria-label={tl({ ru: 'Удалить', kk: 'Жою' })} onClick={() => setTheory(theory.filter((x) => x.id !== topic.id))}>
                  <Trash2 className="size-4 text-destructive" aria-hidden="true" />
                </Button>
              </div>
              {open && (
                <div className="flex flex-col gap-3 border-t bg-muted/20 p-3">
                  <BiInput label={tl({ ru: 'Название темы', kk: 'Тақырып атауы' })} value={topic.title} onChange={(title) => updateTopic(topic.id, { title })} />
                  <div className="flex flex-col gap-2">
                    <h4 className="text-xs font-semibold text-muted-foreground">{tl({ ru: 'Уроки', kk: 'Сабақтар' })}</h4>
                    {content.map((lesson, li) => (
                      <LessonEditor
                        key={lesson.id}
                        lesson={lesson}
                        onChange={(updated) =>
                          updateTopic(topic.id, (t) => {
                            const next = [...(t.content ?? [])]
                            next[li] = updated
                            return { ...t, content: next, lessons: next.length }
                          })
                        }
                        onRemove={() =>
                          updateTopic(topic.id, (t) => {
                            const next = (t.content ?? []).filter((_, j) => j !== li)
                            return { ...t, content: next, lessons: Math.max(1, next.length), done: Math.min(t.done, next.length) }
                          })
                        }
                      />
                    ))}
                    <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => updateTopic(topic.id, (t) => {
                      const next = [...(t.content ?? []), { id: uid(), title: emptyL(), body: emptyL() }]
                      return { ...t, content: next, lessons: next.length }
                    })}>
                      <Plus className="size-4" aria-hidden="true" />
                      {tl({ ru: 'Добавить урок', kk: 'Сабақ қосу' })}
                    </Button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      <form className="flex flex-col gap-3 rounded-xl border border-dashed p-3" onSubmit={(e) => {
        e.preventDefault()
        if (!title.ru.trim()) return
        const newTopic: TheoryTopic = {
          id: uid(),
          title: { ru: title.ru.trim(), kk: title.kk.trim() || title.ru.trim() },
          lessons: 1,
          done: 0,
          content: [{ id: uid(), title: emptyL(), body: emptyL() }],
        }
        setTheory([...theory, newTopic])
        setTitle(emptyL())
        setExpanded(newTopic.id)
      }}>
        <BiInput label={tl({ ru: 'Новая тема', kk: 'Жаңа тақырып' })} value={title} onChange={setTitle} />
        <Button type="submit" className="self-start">
          <Plus className="size-4" aria-hidden="true" />
          {tl({ ru: 'Добавить тему', kk: 'Тақырып қосу' })}
        </Button>
      </form>
    </Card>
  )
}

const emptyQuestion = (): Question => ({
  id: '',
  q: emptyL(),
  options: [emptyL(), emptyL(), emptyL()],
  correct: 0,
  explain: emptyL(),
  imageUrl: null,
})

export function QuestionsEditor() {
  const { questions, setQuestions, tl } = useStore()
  const [draft, setDraft] = useState<Question>(emptyQuestion())
  const [editingId, setEditingId] = useState<string | null>(null)

  const startEdit = (q: Question) => {
    setEditingId(q.id)
    setDraft({ ...q, options: q.options.map((o) => ({ ...o })), imageUrl: q.imageUrl ?? null })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setDraft(emptyQuestion())
  }

  const saveQuestion = () => {
    if (!draft.q.ru.trim() || draft.options.some((o) => !o.ru.trim())) return
    const fill = (v: L) => ({ ru: v.ru.trim(), kk: v.kk.trim() || v.ru.trim() })
    const payload: Question = {
      id: editingId || uid(),
      q: fill(draft.q),
      options: draft.options.map(fill),
      correct: draft.correct,
      explain: fill(draft.explain),
      imageUrl: draft.imageUrl || null,
    }
    if (editingId) setQuestions(questions.map((x) => (x.id === editingId ? payload : x)))
    else setQuestions([...questions, payload])
    cancelEdit()
  }

  return (
    <Card title={tl({ ru: 'Вопросы тестов (в т.ч. дорожные знаки)', kk: 'Тест сұрақтары (жол белгілері)' })}>
      <ul className="mb-4 flex flex-col gap-2">
        {questions.map((q, i) => (
          <li key={q.id} className="rounded-xl border p-3">
            <div className="flex items-start gap-3">
              <span className="text-sm font-bold text-primary">{i + 1}.</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{tl(q.q)}</p>
                {q.imageUrl ? <img src={q.imageUrl} alt="" className="mt-2 max-h-24 rounded-lg border object-contain" /> : null}
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {q.options.map((o, j) => (
                    <li key={j} className={cn('rounded-md px-2 py-0.5 text-xs', j === q.correct ? 'bg-success/15 font-semibold text-success' : 'bg-muted text-muted-foreground')}>{tl(o)}</li>
                  ))}
                </ul>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(q)}>{tl({ ru: 'Изменить', kk: 'Өзгерту' })}</Button>
              <Button variant="ghost" size="icon" aria-label={tl({ ru: 'Удалить', kk: 'Жою' })} disabled={questions.length <= 1} onClick={() => setQuestions(questions.filter((x) => x.id !== q.id))}>
                <Trash2 className="size-4 text-destructive" aria-hidden="true" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-3 rounded-xl border border-dashed p-3">
        <h3 className="text-sm font-semibold">{editingId ? tl({ ru: 'Редактирование вопроса', kk: 'Сұрақты өңдеу' }) : tl({ ru: 'Новый вопрос', kk: 'Жаңа сұрақ' })}</h3>
        <BiInput label={tl({ ru: 'Вопрос', kk: 'Сұрақ' })} value={draft.q} onChange={(q) => setDraft({ ...draft, q })} />
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">{tl({ ru: 'Фото знака / иллюстрация (необязательно)', kk: 'Белгі фотосы / иллюстрация (міндетті емес)' })}</span>
          {draft.imageUrl ? (
            <div className="relative inline-block">
              <img src={draft.imageUrl} alt="" className="max-h-40 rounded-lg border object-contain" />
              <Button type="button" variant="secondary" size="icon" className="absolute right-1 top-1 size-8" onClick={() => setDraft({ ...draft, imageUrl: null })} aria-label={tl({ ru: 'Удалить фото', kk: 'Фотоны жою' })}>
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground hover:bg-muted/40">
              <ImagePlus className="size-4" />
              {tl({ ru: 'Загрузить изображение', kk: 'Сурет жүктеу' })}
              <input type="file" accept="image/*" className="sr-only" onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                const url = await readFileAsDataUrl(f)
                setDraft({ ...draft, imageUrl: url })
                e.target.value = ''
              }} />
            </label>
          )}
        </div>
        {draft.options.map((o, j) => (
          <div key={j} className="flex items-start gap-2">
            <label className="mt-6 flex items-center">
              <input type="radio" name="correct" checked={draft.correct === j} onChange={() => setDraft({ ...draft, correct: j })} className="size-4 accent-primary" />
            </label>
            <div className="flex-1">
              <BiInput label={`${tl({ ru: 'Вариант', kk: 'Нұсқа' })} ${String.fromCharCode(65 + j)}`} value={o} onChange={(v) => setDraft({ ...draft, options: draft.options.map((x, k) => (k === j ? v : x)) })} />
            </div>
          </div>
        ))}
        <BiInput label={tl({ ru: 'Пояснение', kk: 'Түсініктеме' })} value={draft.explain} onChange={(explain) => setDraft({ ...draft, explain })} />
        <div className="flex gap-2">
          <Button type="button" onClick={saveQuestion} className="self-start">
            <Plus className="size-4" aria-hidden="true" />
            {editingId ? tl({ ru: 'Сохранить', kk: 'Сақтау' }) : tl({ ru: 'Добавить вопрос', kk: 'Сұрақ қосу' })}
          </Button>
          {editingId && <Button type="button" variant="outline" onClick={cancelEdit}>{tl({ ru: 'Отмена', kk: 'Болдырмау' })}</Button>}
        </div>
      </div>
    </Card>
  )
}

export function InstructorsEditor() {
  const { instructors, setInstructors, tl } = useStore()
  const [name, setName] = useState('')
  const [car, setCar] = useState('')
  const update = (id: string, patch: Partial<(typeof instructors)[number]>) => setInstructors(instructors.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  return (
    <Card title={tl({ ru: 'Инструкторы и расписание', kk: 'Нұсқаушылар және кесте' })}>
      <div className="mb-4 flex flex-col gap-3">
        {instructors.map((ins) => (
          <div key={ins.id} className="flex flex-col gap-3 rounded-xl border p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label={tl({ ru: 'ФИО', kk: 'Аты-жөні' })}><input value={ins.name} onChange={(e) => update(ins.id, { name: e.target.value })} className={inputCls} /></Field>
              <Field label={tl({ ru: 'Автомобиль', kk: 'Автокөлік' })}><input value={ins.car} onChange={(e) => update(ins.id, { car: e.target.value })} className={inputCls} /></Field>
            </div>
            <Field label={tl({ ru: 'Время занятий (через запятую)', kk: 'Сабақ уақыты (үтір арқылы)' })}>
              <input defaultValue={ins.slots.join(', ')} onBlur={(e) => update(ins.id, { slots: e.target.value.split(',').map((s) => s.trim()).filter((s) => /^\d{1,2}:\d{2}$/.test(s)) })} className={inputCls} />
            </Field>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1.5" role="group">
                {CATEGORIES.map((c) => {
                  const on = ins.categories.includes(c)
                  return (
                    <button key={c} type="button" aria-pressed={on} onClick={() => update(ins.id, { categories: on ? ins.categories.filter((x) => x !== c) : ([...ins.categories, c] as Category[]) })} className={cn('rounded-lg border px-3 py-1 text-xs font-bold', on ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground')}>{c}</button>
                  )
                })}
              </div>
              <Button variant="ghost" size="sm" className="text-destructive" disabled={instructors.length <= 1} onClick={() => setInstructors(instructors.filter((x) => x.id !== ins.id))}>
                <Trash2 className="size-4" aria-hidden="true" />{tl({ ru: 'Удалить', kk: 'Жою' })}
              </Button>
            </div>
          </div>
        ))}
      </div>
      <form className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed p-3" onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) return
        setInstructors([...instructors, { id: uid(), name: name.trim(), car: car.trim() || '—', categories: ['B'], slots: ['09:00', '11:00', '14:00', '16:00'] }])
        setName('')
        setCar('')
      }}>
        <div className="min-w-40 flex-1"><Field label={tl({ ru: 'ФИО', kk: 'Аты-жөні' })}><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Field></div>
        <div className="min-w-40 flex-1"><Field label={tl({ ru: 'Автомобиль', kk: 'Автокөлік' })}><input value={car} onChange={(e) => setCar(e.target.value)} className={inputCls} /></Field></div>
        <Button type="submit"><Plus className="size-4" aria-hidden="true" />{tl({ ru: 'Добавить', kk: 'Қосу' })}</Button>
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
            <Button variant="ghost" size="icon" aria-label={r.visible ? tl({ ru: 'Скрыть', kk: 'Жасыру' }) : tl({ ru: 'Показать', kk: 'Көрсету' })} onClick={() => setReviews(reviews.map((x) => (x.id === r.id ? { ...x, visible: !x.visible } : x)))}>
              {r.visible ? <Eye className="size-4" aria-hidden="true" /> : <EyeOff className="size-4" aria-hidden="true" />}
            </Button>
            <Button variant="ghost" size="icon" aria-label={tl({ ru: 'Удалить', kk: 'Жою' })} onClick={() => setReviews(reviews.filter((x) => x.id !== r.id))}>
              <Trash2 className="size-4 text-destructive" aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  )
}
