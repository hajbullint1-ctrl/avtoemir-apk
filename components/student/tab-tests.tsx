'use client'

import { useState } from 'react'
import { Award, CheckCircle2, ClipboardList, Play, RotateCcw, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Section, ProgressBar } from '@/components/shared/section'
import { useStore } from '@/lib/store'
import type { Question } from '@/lib/data'
import { cn } from '@/lib/utils'
import { getMistakeIds, recordMistake, resolveMistake } from '@/lib/mistakes'

/** How many questions in one practice exam */
export const EXAM_QUESTION_COUNT = 40

/** Random sample of N unique questions (Fisher–Yates) */
export function pickRandomQuestions(pool: Question[], count: number): Question[] {
  if (pool.length <= count) return [...pool]
  const arr = [...pool]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.slice(0, count)
}

function Exam({
  items,
  mode,
  studentId,
  onDone,
}: {
  items: Question[]
  mode: 'practice' | 'mistakes'
  studentId: string
  onDone: () => void
}) {
  const { t, tl, addResult } = useStore()
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const total = items.length
  const q = items[index]

  if (!q || total === 0) {
    return (
      <Section>
        <p className="text-sm text-muted-foreground">{t('noHistory')}</p>
        <Button className="mt-4 w-full" onClick={onDone}>
          {t('retry')}
        </Button>
      </Section>
    )
  }

  if (finished) {
    const pct = Math.round((score / total) * 100)
    const passed = pct >= 80
    return (
      <Section className="text-center">
        <div
          className={cn(
            'mx-auto mb-3 flex size-16 items-center justify-center rounded-full',
            passed ? 'bg-success/15 text-success' : 'bg-destructive/10 text-destructive',
          )}
        >
          {passed ? <Award className="size-8" aria-hidden="true" /> : <XCircle className="size-8" aria-hidden="true" />}
        </div>
        <h2 className="text-lg font-bold">{passed ? t('passed') : t('failed')}</h2>
        <p className="mt-1 text-3xl font-extrabold text-primary">{pct}%</p>
        <p className="text-sm text-muted-foreground">
          {score} {t('of')} {total}
        </p>
        <Button className="mt-4 w-full" onClick={onDone}>
          <RotateCcw className="size-4" aria-hidden="true" />
          {t('retry')}
        </Button>
      </Section>
    )
  }

  const answered = picked !== null
  const isLast = index === total - 1

  return (
    <Section>
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>
          {t('question')} {index + 1} {t('of')} {total}
        </span>
        <span className="tabular-nums">{score} ✓</span>
      </div>
      <ProgressBar value={((index + (answered ? 1 : 0)) / total) * 100} className="mb-4" label={t('question')} />
      <h2 className="mb-4 text-base font-semibold leading-snug text-pretty">{tl(q.q)}</h2>
      {q.imageUrl ? (
        <div className="mb-4 overflow-hidden rounded-xl border bg-muted/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={q.imageUrl} alt="" className="mx-auto max-h-48 w-full object-contain p-2" />
        </div>
      ) : null}
      <div className="flex flex-col gap-2" role="radiogroup" aria-label={tl(q.q)}>
        {q.options.map((opt, i) => {
          const isCorrect = i === q.correct
          const isPicked = i === picked
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={isPicked}
              disabled={answered}
              onClick={() => {
                setPicked(i)
                if (isCorrect) {
                  setScore((s) => s + 1)
                  if (mode === 'mistakes') resolveMistake(studentId, q.id)
                } else if (!isCorrect) {
                  recordMistake(studentId, q.id)
                }
              }}
              className={cn(
                'flex items-center gap-3 rounded-xl border-2 p-3 text-left text-sm transition-colors',
                !answered && 'hover:border-primary/60',
                answered && isCorrect && 'border-success bg-success/10',
                answered && isPicked && !isCorrect && 'border-destructive bg-destructive/10',
              )}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{tl(opt)}</span>
              {answered && isCorrect && <CheckCircle2 className="size-5 text-success" aria-hidden="true" />}
              {answered && isPicked && !isCorrect && <XCircle className="size-5 text-destructive" aria-hidden="true" />}
            </button>
          )
        })}
      </div>

      {answered && (
        <div
          role="status"
          className={cn('mt-4 rounded-xl p-3 text-sm', picked === q.correct ? 'bg-success/10' : 'bg-destructive/10')}
        >
          <p className={cn('font-semibold', picked === q.correct ? 'text-success' : 'text-destructive')}>
            {picked === q.correct ? t('correct') : t('wrong')}
          </p>
          <p className="mt-1 leading-relaxed">
            <span className="font-medium">{t('explanation')}: </span>
            {tl(q.explain)}
          </p>
        </div>
      )}

      <Button
        className="mt-4 h-11 w-full"
        disabled={!answered}
        onClick={() => {
          if (isLast) {
            if (mode === 'practice') addResult(score, total)
            setFinished(true)
          } else {
            setIndex((i) => i + 1)
            setPicked(null)
          }
        }}
      >
        {isLast ? t('finish') : t('next')}
      </Button>
    </Section>
  )
}

function History() {
  const { results, t } = useStore()
  const avg = results.length
    ? Math.round(results.reduce((a, r) => a + (r.score / r.total) * 100, 0) / results.length)
    : 0
  return (
    <Section title={t('history')}>
      {results.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('noHistory')}</p>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-accent p-3">
              <div className="text-xl font-bold text-primary">{avg}%</div>
              <div className="text-xs text-muted-foreground">{t('avgScore')}</div>
            </div>
            <div className="rounded-xl bg-accent p-3">
              <div className="text-xl font-bold text-primary">{results.length}</div>
              <div className="text-xs text-muted-foreground">{t('attempts')}</div>
            </div>
          </div>
          <div className="flex h-28 items-end gap-2" aria-hidden="true">
            {results.slice(-8).map((r) => {
              const pct = Math.round((r.score / r.total) * 100)
              return (
                <div key={r.id} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">{pct}%</span>
                  <div
                    className={cn('w-full rounded-t-md', pct >= 80 ? 'bg-success' : 'bg-primary/60')}
                    style={{ height: `${Math.max(6, pct * 0.8)}px` }}
                  />
                </div>
              )
            })}
          </div>
          <ul className="mt-4 divide-y text-sm">
            {[...results].reverse().map((r) => {
              const pct = Math.round((r.score / r.total) * 100)
              return (
                <li key={r.id} className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">{new Date(r.date).toLocaleDateString('ru-RU')}</span>
                  <span className="tabular-nums">
                    {r.score}/{r.total}
                  </span>
                  <span className={cn('font-semibold', pct >= 80 ? 'text-success' : 'text-foreground')}>{pct}%</span>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </Section>
  )
}

export function TabTests() {
  const { t, tl, questions, me } = useStore()
  const [running, setRunning] = useState(false)
  const [examItems, setExamItems] = useState<Question[]>([])
  const [mode, setMode] = useState<'practice' | 'mistakes'>('practice')
  const [key, setKey] = useState(0)
  const [mistakeCount, setMistakeCount] = useState(() => getMistakeIds(me.id).length)

  const refreshMistakes = () => setMistakeCount(getMistakeIds(me.id).length)

  const startPractice = () => {
    setMode('practice')
    setExamItems(pickRandomQuestions(questions, EXAM_QUESTION_COUNT))
    setKey((k) => k + 1)
    setRunning(true)
  }

  const startMistakes = () => {
    const ids = new Set(getMistakeIds(me.id))
    const pool = questions.filter((q) => ids.has(q.id))
    if (pool.length === 0) return
    setMode('mistakes')
    setExamItems(pool)
    setKey((k) => k + 1)
    setRunning(true)
  }

  return (
    <div className="flex flex-col gap-4">
      {running ? (
        <Exam
          key={key}
          items={examItems}
          mode={mode}
          studentId={me.id}
          onDone={() => {
            setRunning(false)
            setExamItems([])
            refreshMistakes()
          }}
        />
      ) : (
        <>
          <section className="rounded-2xl bg-primary p-5 text-primary-foreground shadow-md">
            <ClipboardList className="mb-3 size-8" aria-hidden="true" />
            <h1 className="text-lg font-bold">{t('practiceExam')}</h1>
            <p className="mt-1 text-sm opacity-90">
              {EXAM_QUESTION_COUNT} {t('examInfo')}
            </p>
            <Button
              variant="secondary"
              className="mt-4 h-11 w-full"
              disabled={questions.length === 0}
              onClick={startPractice}
            >
              <Play className="size-4" aria-hidden="true" />
              {t('startExam')}
            </Button>
          </section>

          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="text-base font-bold">
              {tl({ ru: 'Работа над ошибками', kk: 'Қателермен жұмыс' })}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {tl({
                ru: mistakeCount
                  ? `Неверных ответов: ${mistakeCount}. Повторите их, пока не ответите правильно.`
                  : 'Пока нет ошибок. Они появятся после неверных ответов в пробном тесте.',
                kk: mistakeCount
                  ? `Қате жауаптар: ${mistakeCount}. Дұрыс жауап бергенше қайталаңыз.`
                  : 'Әзірге қате жоқ. Пробный тестте қате жауап берсеңіз осында пайда болады.',
              })}
            </p>
            <Button
              variant="outline"
              className="mt-4 h-11 w-full"
              disabled={mistakeCount === 0}
              onClick={startMistakes}
            >
              <Play className="size-4" aria-hidden="true" />
              {tl({ ru: 'Повторить ошибки', kk: 'Қателерді қайталау' })}
            </Button>
          </section>
        </>
      )}
      <History />
    </div>
  )
}
