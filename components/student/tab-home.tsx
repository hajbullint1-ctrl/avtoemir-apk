'use client'

import { useRef, useState } from 'react'
import { CheckCircle2, Clock, FileText, Headphones, IdCard, ImagePlus, Phone, ShieldAlert, Upload, UserPlus, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Section, ProgressBar } from '@/components/shared/section'
import { Countdown } from './countdown'
import { useStore } from '@/lib/store'
import { CATEGORIES, type Category, type DocKey } from '@/lib/data'
import { uploadStudentDocument } from '@/lib/cloud-features'
import type { DictKey } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const categoryLabel: Record<Category, DictKey> = {
  B: 'categoryB',
  B1: 'categoryB1',
  C: 'categoryC',
  C1: 'categoryC1',
}

function UploadSlot({ docKey, label }: { docKey: DocKey; label: string }) {
  const { me, setDoc, t, tl } = useStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const file = me.docs[docKey]
  const locked = me.status === 'pending' || me.status === 'approved'
  const isImage = file && !file.name.toLowerCase().endsWith('.pdf')

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={locked}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-muted/60 text-muted-foreground transition-colors',
          !locked && 'hover:border-primary hover:text-primary',
          file && 'border-solid border-primary/40',
        )}
        aria-label={`${file ? t('replace') : t('upload')}: ${label}`}
      >
        {file ? (
          isImage ? (
            <img src={file.url || '/placeholder.svg'} alt={label} className="size-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1 px-2 text-xs">
              <FileText className="size-6" aria-hidden="true" />
              <span className="line-clamp-2 break-all">{file.name}</span>
            </span>
          )
        ) : (
          <span className="flex flex-col items-center gap-1 text-xs font-medium">
            <ImagePlus className="size-6" aria-hidden="true" />
            {busy ? tl({ ru: 'Загрузка…', kk: 'Жүктелуде…' }) : t('upload')}
          </span>
        )}
        {file && (
          <span className="absolute right-1.5 top-1.5 rounded-full bg-card p-0.5 text-success shadow-sm">
            <CheckCircle2 className="size-4" aria-hidden="true" />
          </span>
        )}
      </button>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="sr-only"
        tabIndex={-1}
        disabled={busy || locked}
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          setBusy(true)
          try {
            const url = await uploadStudentDocument(me.id, docKey, f)
            setDoc(docKey, { name: f.name, url })
          } finally {
            setBusy(false)
          }
        }}
      />
    </div>
  )
}

function StatusCard() {
  const { me, t } = useStore()
  const map = {
    draft: { icon: ShieldAlert, text: t('statusDraft'), cls: 'bg-muted text-muted-foreground' },
    pending: { icon: Clock, text: t('statusPending'), cls: 'bg-warning/20 text-foreground' },
    approved: { icon: CheckCircle2, text: t('statusApproved'), cls: 'bg-success/15 text-success' },
    rejected: { icon: XCircle, text: t('statusRejected'), cls: 'bg-destructive/10 text-destructive' },
  }[me.status]
  const Icon = map.icon

  if (me.status === 'approved' && me.readyDate) {
    return (
      <section className="rounded-2xl bg-primary p-4 text-primary-foreground shadow-md">
        <div className="mb-1 flex items-center gap-2 text-sm font-medium opacity-90">
          <CheckCircle2 className="size-4" aria-hidden="true" />
          {t('statusApproved')}
        </div>
        <h2 className="mb-3 text-lg font-semibold">{t('countdownTitle')}</h2>
        <Countdown readyDate={me.readyDate} />
        <p className="mt-3 text-sm opacity-90">
          {t('readyOn')}: <strong>{new Date(me.readyDate).toLocaleDateString('ru-RU')}</strong>
        </p>
      </section>
    )
  }

  return (
    <div role="status" className={cn('flex items-center gap-3 rounded-2xl p-4 text-sm font-medium', map.cls)}>
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      {map.text}
    </div>
  )
}

export function TabHome() {
  const { me, setCategory, submitDocs, t, tl, theory, theoryProgress, results, bookings, school } = useStore()
  const allUploaded = Object.values(me.docs).every(Boolean)
  const canEdit = me.status === 'draft' || me.status === 'rejected'
  const doneIds = new Set(theoryProgress[me.id] ?? [])
  const totalLessons = theory.reduce((a, b) => a + (b.content?.length || b.lessons || 0), 0) || 1
  const doneLessons = theory.reduce((a, b) => a + (b.content ?? []).filter((l) => doneIds.has(l.id)).length, 0)
  const best = results.length ? Math.max(...results.map((r) => Math.round((r.score / r.total) * 100))) : 0

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-muted-foreground">{t('greeting')},</p>
        <h1 className="text-xl font-bold">{me.name}</h1>
      </div>

      <StatusCard />

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: t('theoryProgress'), value: `${Math.round((doneLessons / totalLessons) * 100)}%` },
          { label: t('testsBest'), value: `${best}%` },
          { label: t('lessonsBooked'), value: String(bookings.length) },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border bg-card p-3 text-center">
            <div className="text-lg font-bold text-primary">{s.value}</div>
            <div className="text-[11px] leading-tight text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <Section title={t('chooseCategory')}>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('chooseCategory')}>
          {CATEGORIES.map((c) => {
            const active = me.category === c
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={!canEdit}
                onClick={() => setCategory(c)}
                className={cn(
                  'flex flex-col items-start gap-0.5 rounded-xl border-2 p-3 text-left transition-colors disabled:opacity-70',
                  active ? 'border-primary bg-accent' : 'border-border hover:border-primary/50',
                )}
              >
                <span className={cn('text-2xl font-extrabold', active ? 'text-primary' : 'text-foreground')}>{c}</span>
                <span className="text-xs text-muted-foreground">{t(categoryLabel[c])}</span>
              </button>
            )
          })}
        </div>
      </Section>

      <Section title={t('documents')}>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{t('docsHint')}</p>

        <div className="flex flex-col gap-4">
          <div className="rounded-xl border p-3">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <IdCard className="size-4 text-primary" aria-hidden="true" />
              {t('idCard')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <UploadSlot docKey="idFront" label={t('idFront')} />
              <UploadSlot docKey="idBack" label={t('idBack')} />
            </div>
          </div>
          {(['psycho', 'narco'] as const).map((k) => (
            <div key={k} className="rounded-xl border p-3">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <FileText className="size-4 text-primary" aria-hidden="true" />
                {t(k)}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <UploadSlot docKey={k} label={t(k)} />
              </div>
            </div>
          ))}
        </div>

        {canEdit && (
          <>
            <ProgressBar
              className="mt-4"
              value={(Object.values(me.docs).filter(Boolean).length / 4) * 100}
              label={t('documents')}
            />
            <Button className="mt-4 h-11 w-full" disabled={!allUploaded} onClick={submitDocs}>
              <Upload className="size-4" aria-hidden="true" />
              {t('submitDocs')}
            </Button>
          </>
        )}
      </Section>

      <Section title={t('contacts')}>
        <div className="flex flex-col gap-2">
          {school.phoneEnrollment ? (
            <a
              href={`tel:${school.phoneEnrollment.replace(/[^\d+]/g, '')}`}
              className="flex items-center justify-between rounded-xl border border-primary/30 bg-accent/40 p-3 text-sm font-semibold hover:border-primary/50"
            >
              <span className="flex min-w-0 items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <UserPlus className="size-4" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {tl({ ru: 'Запись в автошколу', kk: 'Автомектепке жазылу' })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Phone className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                    {school.phoneEnrollment}
                  </span>
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
              <span className="flex min-w-0 items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                  <Headphones className="size-4" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {tl({ ru: 'Служба поддержки приложения', kk: 'Қолданба қолдау қызметі' })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Phone className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                    {school.phoneSupport}
                  </span>
                </span>
              </span>
              <span className="shrink-0 text-xs font-medium text-primary">{t('call')}</span>
            </a>
          ) : null}
        </div>
      </Section>
    </div>
  )
}
