'use client'

import { useRef, useState } from 'react'
import { CheckCircle2, Clock, FileText, Headphones, IdCard, Phone, ShieldAlert, UserPlus, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Section, ProgressBar } from '@/components/shared/section'
import { Countdown } from './countdown'
import { useStore } from '@/lib/store'
import { CATEGORIES, type Category } from '@/lib/data'
import type { DictKey } from '@/lib/i18n'
import { cn, toWhatsAppNumber } from '@/lib/utils'

const categoryLabel: Record<Category, DictKey> = {
  A: 'categoryA',
  A1: 'categoryA1',
  B: 'categoryB',
  B1: 'categoryB1',
  C: 'categoryC',
  C1: 'categoryC1',
  E: 'categoryE',
  E1: 'categoryE1',
}

export function TabHome() {
  const { t, tl, me, school, setCategory, deleteMyAccount, notices } = useStore()

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
      <section className="rounded-2xl border bg-card p-4">
        <div className="flex items-center gap-3">
          <span
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground"
            aria-hidden="true"
          >
            {(me.name || '?').trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{t('greeting')}</p>
            <h1 className="truncate text-lg font-bold leading-tight">{me.name || '—'}</h1>
            {me.phone ? (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{me.phone}</p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          className="mt-3 w-full rounded-xl border border-destructive/40 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
          onClick={() => {
            const ok = window.confirm(
              tl({
                ru: 'Удалить аккаунт и все связанные данные? Это действие нельзя отменить.',
                kk: 'Аккаунтты және барлық деректерді жою керек пе? Бұл әрекетті қайтару мүмкін емес.',
              }),
            )
            if (!ok) return
            deleteMyAccount()
          }}
        >
          {tl({ ru: 'Удалить аккаунт', kk: 'Аккаунтты жою' })}
        </button>
        <a href="/delete-account" className="mt-2 block text-center text-xs text-muted-foreground underline-offset-2 hover:underline">
          {tl({ ru: 'Или запросить удаление на сайте', kk: 'Немесе сайтта жоюды сұрау' })}
        </a>
        <a href="/privacy" className="mt-1 block text-center text-xs text-muted-foreground underline-offset-2 hover:underline">
          {tl({ ru: 'Политика конфиденциальности', kk: 'Құпиялылық саясаты' })}
        </a>
      </section>

      {(() => {
        const myNotices = notices.filter(
          (n) => (!n.studentId || n.studentId === me.id) && !(n.dismissedBy || []).includes(me.id),
        ).slice(0, 5)
        if (myNotices.length === 0) return null
        return (
          <Section title={tl({ ru: 'Уведомления', kk: 'Хабарландырулар' })}>
            <ul className="flex flex-col gap-2">
              {myNotices.map((n) => (
                <li key={n.id} className="rounded-xl border bg-card p-3 text-sm">
                  <p className="font-semibold">{tl(n.title)}</p>
                  <p className="mt-1 text-muted-foreground">{tl(n.body)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{n.time}</p>
                </li>
              ))}
            </ul>
          </Section>
        )
      })()}

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

      <Section title={tl({ ru: 'Документы для сертификата', kk: 'Сертификат үшін құжаттар' })}>
        <p className="mb-3 text-sm text-muted-foreground">
          {tl({
            ru: 'Чтобы получить сертификат, отправьте фото документов (удостоверение личности с двух сторон, справка из психоневрологического и наркологического диспансеров) в WhatsApp. Администратор проверит их и укажет дату готовности сертификата.',
            kk: 'Сертификат алу үшін құжаттардың фотосын (жеке куәліктің екі жағы, психоневрологиялық және наркологиялық диспансер анықтамалары) WhatsApp-қа жіберіңіз. Әкімші тексеріп, сертификаттың дайын болу күнін белгілейді.',
          })}
        </p>

        {(() => {
          const full = (me.name || '').trim()
          const parts = full.split(/\s+/).filter(Boolean)
          const firstName = parts[0] || '—'
          const lastName = parts.slice(1).join(' ') || '—'
          const phone = me.phone || '—'
          const text = encodeURIComponent(
            `Здравствуйте! Отправляю документы для автошколы. Мои данные: Имя: ${firstName}, Фамилия: ${lastName}, Телефон/Логин: ${phone}`,
          )
          const href = `https://wa.me/77083425171?text=${text}`
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-base font-bold text-white shadow-sm transition-opacity hover:opacity-90 active:opacity-80"
            >
              <span aria-hidden="true">💬</span>
              {tl({ ru: 'Отправить документы в WhatsApp', kk: 'Құжаттарды WhatsApp-қа жіберу' })}
            </a>
          )
        })()}

        <div className="mt-4 flex items-center gap-2 rounded-xl border p-3">
          {statusIcon}
          <span className="text-sm font-medium">{statusText}</span>
        </div>

        {me.status === 'approved' && me.readyDate ? (
          <div className="mt-3 rounded-xl border border-success/40 bg-success/10 p-3">
            <p className="text-sm font-semibold text-success">
              {tl({ ru: 'Документы подтверждены', kk: 'Құжаттар расталды' })}
            </p>
            <p className="mt-1 text-sm">
              {tl({
                ru: `Сертификат будет готов: ${me.readyDate}`,
                kk: `Сертификат дайын болады: ${me.readyDate}`,
              })}
            </p>
            <div className="mt-2">
              <Countdown readyDate={me.readyDate} />
            </div>
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
