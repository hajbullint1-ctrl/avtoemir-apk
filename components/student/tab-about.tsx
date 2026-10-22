'use client'

import { useState } from 'react'
import { Clock, ExternalLink, Globe, Share2, MapPin, MessageSquarePlus, Phone, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Section, Stars } from '@/components/shared/section'
import { useStore } from '@/lib/store'
import { CATEGORIES } from '@/lib/data'
import type { DictKey } from '@/lib/i18n'
import { cn, toWhatsAppNumber } from '@/lib/utils'

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
              <svg viewBox="0 0 20 20" aria-hidden="true" className={cn('size-7', rating >= i ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted')}>
                <path d="M10 1.5l2.5 5.3 5.8.8-4.2 4.1 1 5.8L10 14.8 4.9 17.5l1-5.8L1.7 7.6l5.8-.8L10 1.5z" />
              </svg>
            </button>
          ))}
        </div>
      </fieldset>
      <input className="rounded-lg border bg-background px-3 py-2 text-sm" placeholder={t('yourName')} value={name} onChange={(e) => setName(e.target.value)} required />
      <textarea className="min-h-[80px] rounded-lg border bg-background px-3 py-2 text-sm" placeholder={t('yourReview')} value={text} onChange={(e) => setText(e.target.value)} required />
      <Button type="submit">{t('publish')}</Button>
    </form>
  )
}

export function TabAbout() {
  const { t, tl, lang, school, reviews } = useStore()
  const [formOpen, setFormOpen] = useState(false)
  const visible = reviews.filter((r) => r.visible)
  const avg = visible.length ? visible.reduce((s, r) => s + r.rating, 0) / visible.length : 0

  return (
    <div className="flex flex-col gap-4 pb-24">
      <Section title={t('aboutSchool')}>
        <p className="text-sm leading-relaxed text-muted-foreground">{school.about[lang]}</p>
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="size-4 shrink-0" aria-hidden="true" />
          <span>{school.hours[lang]}</span>
        </div>
      </Section>

      <Section title={t('branches')}>
        <ul className="flex flex-col gap-2">
          {school.branches.map((b) => (
            <li key={b.id} className="rounded-xl border p-3">
              <div className="text-sm font-semibold">{b.city[lang]}</div>
              <div className="mt-0.5 flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{b.address[lang]}</span>
              </div>
              {b.link ? (
                <a href={b.link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                  {t('open2gis')}
                  <ExternalLink className="size-3" aria-hidden="true" />
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t('workHours')}>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>{school.hours[lang]}</span>
        </div>
      </Section>

      <Section title={t('contacts')}>
        <div className="flex flex-col gap-2">
          {school.phoneEnrollment ? (
            <a
              href={`https://wa.me/${toWhatsAppNumber(school.phoneEnrollment)}`}
              target="_blank"
              rel="noopener noreferrer"
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
              <span className="shrink-0 text-xs font-medium text-primary">{t('whatsapp')}</span>
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
            <a href={school.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl border p-3 text-sm font-semibold hover:border-primary/50">
              <span className="flex items-center gap-2">
                <Globe className="size-4 text-primary" aria-hidden="true" />
                Instagram
              </span>
              <ExternalLink className="size-4 text-muted-foreground" aria-hidden="true" />
            </a>
          ) : null}
          {school.website ? (
            <a href={school.website} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl border p-3 text-sm font-semibold hover:border-primary/50">
              <span className="flex items-center gap-2">
                <Globe className="size-4 text-primary" aria-hidden="true" />
                {tl({ ru: 'Официальный сайт', kk: 'Ресмі сайт' })}
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
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
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

      <Section title={tl({ ru: 'Данные и аккаунт', kk: 'Деректер және аккаунт' })}>
        <div className="flex flex-col gap-2 text-sm">
          <a href="/privacy" className="rounded-xl border p-3 font-medium hover:border-primary/50">
            {tl({ ru: 'Политика конфиденциальности', kk: 'Құпиялылық саясаты' })}
          </a>
          <a href="/delete-account" className="rounded-xl border border-destructive/30 p-3 font-medium text-destructive hover:bg-destructive/5">
            {tl({ ru: 'Удаление аккаунта (веб)', kk: 'Аккаунтты жою (веб)' })}
          </a>
        </div>
      </Section>
    </div>
  )
}
