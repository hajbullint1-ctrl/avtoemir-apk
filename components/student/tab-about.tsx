'use client'

import { useState } from 'react'
import { ExternalLink, MapPin, Phone, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Section, Stars } from '@/components/shared/section'
import { useStore } from '@/lib/store'
import { CATEGORIES } from '@/lib/data'
import type { DictKey } from '@/lib/i18n'
import { cn, toWhatsAppNumber } from '@/lib/utils'

const catKey: Record<string, DictKey> = { A: 'categoryA', A1: 'categoryA1', B: 'categoryB', B1: 'categoryB1', C: 'categoryC', C1: 'categoryC1', E: 'categoryE', E1: 'categoryE1' }

const steps = [
  { ru: 'Выберите категорию и загрузите документы в приложении', kk: 'Санатты таңдап, құжаттарды қосымшаға жүктеңіз' },
  { ru: 'Дождитесь проверки администратором', kk: 'Әкімшінің тексеруін күтіңіз' },
  { ru: 'Изучайте теорию и сдавайте тесты', kk: 'Теорияны оқып, тесттер тапсырыңыз' },
  { ru: 'Запишитесь на практические занятия', kk: 'Практикалық сабақтарға жазылыңыз' },
]

export function TabAbout() {
  const { t, tl, lang, school, reviews, addReview } = useStore()
  const [open, setOpen] = useState(false)
  const [author, setAuthor] = useState('')
  const [text, setText] = useState('')
  const [rating, setRating] = useState(5)
  const [sent, setSent] = useState(false)

  const visible = reviews.filter((r) => r.visible)

  return (
    <div className="flex flex-col gap-4 pb-8">
      <Section title={t('aboutSchool')}>
        <p className="text-sm leading-relaxed text-muted-foreground">{tl(school.about)}</p>
        <div className="mt-3 flex flex-col gap-2 text-sm">
          <p className="flex items-center gap-2">
            <span className="font-semibold">{t('workHours')}:</span>
            <span>{tl(school.hours)}</span>
          </p>
          {school.website ? (
            <a href={school.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
              <ExternalLink className="size-4" aria-hidden="true" />
              {school.website.replace(/^https?:\/\//, '')}
            </a>
          ) : null}
          {school.instagram ? (
            <a href={school.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
              <ExternalLink className="size-4" aria-hidden="true" />
              Instagram
            </a>
          ) : null}
        </div>
      </Section>

      <Section title={t('branches')}>
        <ul className="flex flex-col gap-2">
          {school.branches.map((b) => (
            <li key={b.id} className="rounded-xl border p-3">
              <p className="font-semibold">{tl(b.city)}</p>
              <p className="mt-1 flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                {tl(b.address)}
              </p>
              {b.link ? (
                <a
                  href={b.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  {t('open2gis')}
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t('categories')}>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES.map((c) => (
            <div key={c} className="rounded-xl bg-accent p-2 text-center">
              <div className="text-xl font-extrabold text-primary">{c}</div>
              <div className="text-[10px] leading-tight text-muted-foreground">{t(catKey[c])}</div>
            </div>
          ))}
        </div>
        <h3 className="mb-2 mt-4 text-sm font-semibold">{t('enrollSteps')}</h3>
        <ol className="flex flex-col gap-2">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
              <span className="pt-0.5">{s[lang]}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section title={t('reviews')}>
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tl({ ru: 'Пока нет отзывов', kk: 'Әзірге пікір жоқ' })}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {visible.map((r) => (
              <li key={r.id} className="rounded-xl border p-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{r.author}</span>
                  <Stars value={r.rating} size="size-3.5" />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{r.text}</p>
              </li>
            ))}
          </ul>
        )}
        <Button className="mt-3 w-full" variant="outline" onClick={() => setOpen(true)}>
          {t('addReview')}
        </Button>
      </Section>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border bg-card p-4 shadow-xl">
            <h3 className="text-lg font-semibold">{t('addReview')}</h3>
            {sent ? (
              <p className="mt-3 text-sm text-muted-foreground">{t('reviewSent')}</p>
            ) : (
              <form
                className="mt-3 flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!author.trim() || !text.trim()) return
                  addReview({ author: author.trim(), text: text.trim(), rating })
                  setSent(true)
                  setTimeout(() => {
                    setOpen(false)
                    setSent(false)
                    setAuthor('')
                    setText('')
                    setRating(5)
                  }, 1500)
                }}
              >
                <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                  {t('yourName')}
                  <input value={author} onChange={(e) => setAuthor(e.target.value)} className="h-10 rounded-lg border bg-background px-3 text-sm" />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                  {t('yourReview')}
                  <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className="rounded-lg border bg-background px-3 py-2 text-sm" />
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">{t('rating')}</span>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setRating(n)} className={cn('p-0.5', n <= rating ? 'text-amber-500' : 'text-muted-foreground')}>
                      <Star className="size-5 fill-current" />
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">{t('publish')}</Button>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('close')}</Button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
