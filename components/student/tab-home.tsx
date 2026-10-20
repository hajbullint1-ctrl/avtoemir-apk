'use client'

import { useRef, useState } from 'react'
import { CheckCircle2, Clock, FileText, Headphones, IdCard, ImagePlus, Phone, ShieldAlert, Upload, UserPlus, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Section } from '@/components/shared/section'
import { Countdown } from '@/components/student/countdown'
import { useStore } from '@/lib/store'
import { CATEGORIES, DOC_KEYS, type DocKey, type Category } from '@/lib/data'
import type { DictKey } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const docLabels: Record<DocKey, DictKey> = {
  idFront: 'idFront',
  idBack: 'idBack',
  psycho: 'psycho',
  narco: 'narco',
}

const catKey: Record<Category, DictKey> = {
  B: 'categoryB',
  B1: 'categoryB1',
  C: 'categoryC',
  C1: 'categoryC1',
}

export function TabHome() {
  const {
    t,
    tl,
    lang,
    me,
    school,
    setCategory,
    setDoc,
    submitDocs,
  } = useStore()
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const statusIcon =
    me.status === 'approved' ? (
      <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
    ) : me.status === 'rejected' ? (
      <XCircle className="size-5 text-destructive" aria-hidden="true" />
    ) : me.status === 'pending' ? (
      <Clock className="size-5 text-amber-500" aria-hidden="true" />
    ) : (
      <FileText className="size-5 text-muted-foreground" aria-hidden="true" />
    )

  const statusText =
    me.status === 'approved'
      ? t('statusApproved')
      : me.status === 'rejected'
        ? t('statusRejected')
        : me.status === 'pending'
          ? t('statusPending')
          : t('statusDraft')

  const onPick = (key: DocKey, file: File | null) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setDoc(key, { name: file.name, url })
  }

  return (
    <div className="flex flex-col gap-4 pb-24">
      <Section title={t('enrollment')}>
        <p className="mb-3 text-sm text-muted-foreground">{t('chooseCategory')}</p>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                'rounded-xl border p-2 text-center transition-colors',
                me.category === c ? 'border-primary bg-accent' : 'hover:border-primary/40',
              )}
            >
              <div className="text-lg font-extrabold text-primary">{c}</div>
              <div className="text-[10px] leading-tight text-muted-foreground">{t(catKey[c])}</div>
            </button>
          ))}
        </div>
      </Section>

      <Section title={t('documents')}>
        <p className="mb-3 text-sm text-muted-foreground">{t('docsHint')}</p>
        <div className="flex flex-col gap-2">
          {DOC_KEYS.map((key) => {
            const doc = me.docs[key]
            return (
              <div key={key} className="flex items-center justify-between gap-2 rounded-xl border p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                    {key.startsWith('id') ? (
                      <IdCard className="size-4" aria-hidden="true" />
                    ) : (
                      <ShieldAlert className="size-4" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{t(docLabels[key])}</div>
                    {doc ? (
                      <div className="truncate text-xs text-muted-foreground">{doc.name}</div>
                    ) : (
                      <div className="text-xs text-muted-foreground">{t('upload')}</div>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <input
                    ref={(el) => {
                      fileRefs.current[key] = el
                    }}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => onPick(key, e.target.files?.[0] ?? null)}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => fileRefs.current[key]?.click()}
                  >
                    {doc ? t('replace') : t('upload')}
                    <Upload className="size-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl border p-3">
          {statusIcon}
          <span className="text-sm font-medium">{statusText}</span>
        </div>
        {me.status === 'draft' || me.status === 'rejected' ? (
          <Button className="mt-3 w-full" size="lg" onClick={() => submitDocs()}>
            {t('submitDocs')}
          </Button>
        ) : null}
        {me.status === 'approved' && me.readyDate ? (
          <div className="mt-3">
            <Countdown target={me.readyDate} />
          </div>
        ) : null}
      </Section>

      <Section title={t('contacts')}>
        <div className="flex flex-col gap-2">
          {school.phoneEnrollment ? (
            <a
              href={`https://wa.me/${school.phoneEnrollment.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
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
              <span className="shrink-0 text-xs font-medium text-primary">{t('whatsapp')}</span>
            </a>
          ) : null}
          {school.phoneSupport ? (
            <a
              href={`https://wa.me/${school.phoneSupport.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
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
              <span className="shrink-0 text-xs font-medium text-primary">{t('whatsapp')}</span>
            </a>
          ) : null}
        </div>
      </Section>
    </div>
  )
}
