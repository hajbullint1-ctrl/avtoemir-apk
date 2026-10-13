'use client'

import { useState } from 'react'
import { BookOpen, CheckCircle2, ChevronLeft, ChevronRight, RotateCcw, ThumbsUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Section, ProgressBar } from '@/components/shared/section'
import { RoadSignGraphic } from './road-sign'
import { useStore } from '@/lib/store'
import { roadSigns } from '@/lib/data'
import { cn } from '@/lib/utils'

function Curriculum() {
  const { theory, setTheory, t, tl } = useStore()
  const total = theory.reduce((a, b) => a + b.lessons, 0)
  const done = theory.reduce((a, b) => a + b.done, 0)

  return (
    <Section title={t('curriculum')} action={<span className="text-sm font-semibold text-primary">{Math.round((done / total) * 100)}%</span>}>
      <ProgressBar value={(done / total) * 100} label={t('curriculum')} className="mb-4" />
      <ol className="flex flex-col gap-2">
        {theory.map((topic, idx) => {
          const complete = topic.done >= topic.lessons
          return (
            <li key={topic.id} className="flex items-center gap-3 rounded-xl border p-3">
              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold',
                  complete ? 'bg-success/15 text-success' : 'bg-accent text-primary',
                )}
              >
                {complete ? <CheckCircle2 className="size-5" aria-hidden="true" /> : idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug">{tl(topic.title)}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <ProgressBar value={(topic.done / topic.lessons) * 100} className="h-1.5" label={tl(topic.title)} />
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {topic.done}/{topic.lessons}
                  </span>
                </div>
              </div>
              {!complete && (
                <Button
                  size="sm"
                  variant="outline"
                  aria-label={`${t('completeLesson')}: ${tl(topic.title)}`}
                  onClick={() =>
                    setTheory(theory.map((x) => (x.id === topic.id ? { ...x, done: Math.min(x.lessons, x.done + 1) } : x)))
                  }
                >
                  <BookOpen className="size-4" aria-hidden="true" />
                </Button>
              )}
            </li>
          )
        })}
      </ol>
    </Section>
  )
}

function Flashcards() {
  const { t, tl, learnedSigns, toggleSign } = useStore()
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const sign = roadSigns[index]
  const go = (d: number) => {
    setFlipped(false)
    setIndex((i) => (i + d + roadSigns.length) % roadSigns.length)
  }

  return (
    <Section
      title={t('roadSigns')}
      action={
        <span className="text-xs font-medium text-muted-foreground">
          {t('learned')}: {learnedSigns.length}/{roadSigns.length}
        </span>
      }
    >
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-label={t('showMeaning')}
        className="group w-full [perspective:1000px]"
      >
        <div
          className={cn(
            'relative h-64 w-full transition-transform duration-500 [transform-style:preserve-3d]',
            flipped && '[transform:rotateY(180deg)]',
          )}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl border bg-muted/50 [backface-visibility:hidden]">
            <RoadSignGraphic sign={sign} />
            <span className="rounded-full bg-card px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
              {sign.code}
            </span>
            <span className="text-xs text-muted-foreground">{t('flashcardHint')}</span>
          </div>
          <div className="absolute inset-0 flex flex-col justify-center gap-2 rounded-2xl bg-primary p-5 text-left text-primary-foreground [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <span className="text-xs font-semibold opacity-80">{sign.code}</span>
            <span className="text-lg font-bold leading-snug">{tl(sign.name)}</span>
            <span className="text-sm leading-relaxed opacity-90">{tl(sign.meaning)}</span>
          </div>
        </div>
      </button>

      <div className="mt-3 flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => go(-1)} aria-label="Назад">
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            toggleSign(sign.id, false)
            go(1)
          }}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          {t('dontKnow')}
        </Button>
        <Button
          className="flex-1"
          onClick={() => {
            toggleSign(sign.id, true)
            go(1)
          }}
        >
          <ThumbsUp className="size-4" aria-hidden="true" />
          {t('know')}
        </Button>
        <Button variant="outline" size="icon" onClick={() => go(1)} aria-label="Вперёд">
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
      <div className="mt-3 flex justify-center gap-1.5" aria-hidden="true">
        {roadSigns.map((s, i) => (
          <span
            key={s.id}
            className={cn(
              'size-1.5 rounded-full',
              i === index ? 'bg-primary' : learnedSigns.includes(s.id) ? 'bg-success' : 'bg-border',
            )}
          />
        ))}
      </div>
    </Section>
  )
}

export function TabTheory() {
  return (
    <div className="flex flex-col gap-4">
      <Flashcards />
      <Curriculum />
    </div>
  )
}
