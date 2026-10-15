'use client'

import { useState } from 'react'
import { Clock, ExternalLink, Globe, Share2, MapPin, MessageSquarePlus, Phone, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Section, Stars } from '@/components/shared/section'
import { useStore } from '@/lib/store'
import { CATEGORIES } from '@/lib/data'
import type { DictKey } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const steps: { ru: string; kk: string }[] = [
  { ru: 'Выберите категорию в приложении', kk: 'Қосымшада санатты таңдаңыз' },
  { ru: 'Загрузите удостоверение и две медсправки', kk: 'Жеке куәлік пен екі медициналық анықтаманы жүктеңіз' },
  { ru: 'Дождитесь подтверждения администратора', kk: 'Әкімшінің растауын күтіңіз' },
  { ru: 'Оплатите обучение в филиале и начните занятия', kk: 'Оқу ақысын филиалда төлеп, сабақты бастаңыз' },
]

const catKey: Record<string, DictKey> = { B: 'categoryB', B1: 'categoryB1', C: 'categoryC', C1: 'categoryC1' }

function ReviewForm({ onClose }: { onClose: () => void }) {
  const { t, addReview } = useStore()
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [rating, setRating] = useState(5)
  const [sent, setSent] = useState(false)

  if (sent) {
    return (
      <div role="status" className="rounded-xl bg-success/10 p-3 text-sm font-medium text-success">
        {t('reviewSent')}
      </div>
    )
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-xl border bg-muted/40 p-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim() || !text.trim()) return
        addReview({ author: name.trim().slice(0, 60), text: text.trim().slice(0, 600), rating })
        setSent(true)
        setTimeout(onClose, 2500)
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{t('addReview')}</span>
        <button type="button" onClick={onClose} aria-label={t('close')} className="text-muted-foreground hover:text-foreground">
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <fieldset>
        <legend className="mb-1 text-xs font-medium text-muted-foreground">{t('rating')}</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} type="button" onClick={() => setRating(i)} aria-label={`${i}`} aria-pressed={rating === i}>
              <svg viewBox="0 0 20 20" aria-hidden="true" className={cn('size-7', i <= rating ? 'fill-warning' : 'fill-border')}>
                <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z" />
              </svg>
            </button>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        {t('yourName')}
        <input
          required
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-10 rounded-lg border bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        {t('yourReview')}
        <textarea
          required
          maxLength={600}
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="rounded-lg border bg-card p-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        />
      </label>
      <Button type="submit">{t('publish')}</Button>
    </form>
  )
}

export function TabAbout() {
  const { t, tl, lang, school, reviews } = useStore()
  const [formOpen, setFormOpen] = useState(false)
  const visible = reviews.filter((r) => r.visible)
  const avg = visible.length ? visible.reduce((a, r) => a + r.rating, 0) / visible.length : 0

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl bg-primary p-5 text-primary-foreground shadow-md">
        <h1 className="text-2xl font-extrabold tracking-tight">{school.name}</h1>
        <p className="mt-2 text-sm leading-relaxed opacity-90">{tl(school.about)}</p>
        <p className="mt-3 rounded-lg bg-primary-foreground/15 px-3 py-2 text-xs font-medium">{t('noPayments')}</p>
      </section>

      <Section title={t('branches')}>
        <div className="flex flex-col gap-3">
          {school.branches.map((b) => (
            <div key={b.id} className="rounded-xl border p-3">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                  <MapPin className="size-5" aria-hidden="true" />
                </span>
                <div className="flex-1">
                  <p className="font-semibold">{tl(b.city)}</p>
                  <p className="text-sm text-muted-foreground">{tl(b.address)}</p>
                </div>
              </div>
              {b.link ? (
                <a
                  href={b.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex h-10 items-center justify-center gap-2 rounded-lg bg-[#19aa1e] text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  {t('open2gis')}
                  <ExternalLink className="size-4" aria-hidden="true" />
                </a>
              ) : null}
            </div>
          ))}
        </div>
      </Section>

      <Section title={t('contacts')}>
        <div className="mb-3 flex items-center gap-3 text-sm">
          <Clock className="size-4 text-primary" aria-hidden="true" />
          <span>
            <span className="font-medium">{t('workHours')}: </span>
            {tl(school.hours)}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {school.phoneEnrollment ? (
            <a
              href={`tel:${school.phoneEnrollment.replace(/[^\d+]/g, '')}`}
              className="flex items-center justify-between rounded-xl border border-primary/30 bg-accent/40 p-3 text-sm font-semibold hover:border-primary/50"
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[11px] font-medium text-muted-foreground">
                  {tl({ ru: 'Запись в автошколу', kk: 'Автомектепке жазылу' })}
                </span>
                <span className="flex items-center gap-2">
                  <Phone className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  {school.phoneEnrollment}
                </span>
              </span>
              <span className="shrink-0 text-xs font-medium text-primary">{t('call')}</span>
            </a>
          ) : null}
          {school.phoneSupport ? (
            <a
              href={`tel:${school.phoneSupport.replace(/[^\d+]/g, '')}`}
              className="flex items-center justify-between rounded-xl border p-3 text-sm font-semibold hover:border-primary/50"
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[11px] font-medium text-muted-foreground">
                  {tl({ ru: 'Служба поддержки приложения', kk: 'Қолданба қолдау қызметі' })}
                </span>
                <span className="flex items-center gap-2">
                  <Phone className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  {school.phoneSupport}
                </span>
              </span>
              <span className="shrink-0 text-xs font-medium text-primary">{t('call')}</span>
            </a>
          ) : null}
          {school.phones.map((p) => (
            <a
              key={p}
              href={`tel:${p.replace(/[^\d+]/g, '')}`}
              className="flex items-center justify-between rounded-xl border p-3 text-sm font-semibold hover:border-primary/50"
            >
              <span className="flex items-center gap-2">
                <Phone className="size-4 text-primary" aria-hidden="true" />
                {p}
              </span>
              <span className="text-xs font-medium text-primary">{t('call')}</span>
            </a>
          ))}
          {school.instagram ? (
            <a
              href={school.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border p-3 text-sm font-semibold hover:border-primary/50"
            >
              <span className="flex items-center gap-2">
                <Share2 className="size-4 text-primary" aria-hidden="true" />
                Instagram
              </span>
              <ExternalLink className="size-4 text-muted-foreground" aria-hidden="true" />
            </a>
          ) : null}
          {school.website ? (
            <a
              href={school.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border p-3 text-sm font-semibold hover:border-primary/50"
            >
              <span className="flex items-center gap-2">
                <Globe className="size-4 text-primary" aria-hidden="true" />
                {tl({ ru: 'Официальный сайт', kk: 'Ресми сайт' })}
              </span>
              <ExternalLink className="size-4 text-muted-foreground" aria-hidden="true" />
            </a>
          ) : null}
        </div>
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
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </span>
              <span className="pt-0.5">{s[lang]}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        title={
          <span className="flex items-center gap-2">
            {t('reviews')}
            <span className="text-sm font-medium text-muted-foreground">
              {avg.toFixed(1)} ★ • {visible.length}
            </span>
          </span>
        }
      >
        {formOpen ? (
          <div className="mb-3">
            <ReviewForm onClose={() => setFormOpen(false)} />
          </div>
        ) : (
          <Button variant="outline" className="mb-3 w-full" onClick={() => setFormOpen(true)}>
            <MessageSquarePlus className="size-4" aria-hidden="true" />
            {t('addReview')}
          </Button>
        )}
        <ul className="flex flex-col gap-2">
          {visible.map((r) => (
            <li key={r.id} className="rounded-xl border p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-semibold">{r.author}</span>
                <Stars value={r.rating} size="size-3.5" />
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{r.text}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{new Date(r.date).toLocaleDateString('ru-RU')}</p>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  )
}
