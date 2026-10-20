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
import { cn, toWhatsAppNumber } from '@/lib/utils'

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
      <p className="text-center text-xs font-medium text-muted-foreground">{label}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        disabled={locked || busy}
        onChange={async (e) => {
          const f = e.target.files?.[0]
          if (!f) return
          setBusy(true)
          try {
            const url = await uploadStudentDocument(me.id, docKey, f)
            setDoc(docKey, { name: f.name, url })
          } catch {
            const url = URL.createObjectURL(f)
            setDoc(docKey, { name: f.name, url })
          } finally {
            setBusy(false)
          }
        }}
      />
    </div>
  )
}

export function TabHome() {
  const { t, tl, me, school, setCategory, submitDocs } = useStore()

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
              <div className="text-[10px] leading-tight text-muted-foreground">{t(categoryLabel[c])}</div>
            </button>
          ))}
        </div>
      </Section>

      <Section title={t('documents')}>
        <p className="mb-3 text-sm text-muted-foreground">{t('docsHint')}</p>
        <div className="grid grid-cols-2 gap-3">
          <UploadSlot docKey="idFront" label={t('idFront')} />
          <UploadSlot docKey="idBack" label={t('idBack')} />
          <UploadSlot docKey="psycho" label={t('psycho')} />
          <UploadSlot docKey="narco" label={t('narco')} />
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
            <Countdown readyDate={me.readyDate} />
          </div>
        ) : null}
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
