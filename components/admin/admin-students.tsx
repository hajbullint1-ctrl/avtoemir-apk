'use client'

import { useEffect, useMemo, useState } from 'react'
import { KeyRound, Phone, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { DOC_KEYS, type DocStatus, type Student } from '@/lib/data'
import { adminResetPassword, listAccounts, type Account } from '@/lib/auth'
import { OnlineBadge } from '@/components/shared/online-badge'
import { cn } from '@/lib/utils'

const statusText: Record<DocStatus, { ru: string; kk: string }> = {
  draft: { ru: 'Черновик', kk: 'Жоба' },
  pending: { ru: 'На проверке', kk: 'Тексеруде' },
  approved: { ru: 'Подтверждено', kk: 'Расталды' },
  rejected: { ru: 'Отклонено', kk: 'Қабылданбады' },
}

const statusCls: Record<DocStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending: 'bg-warning/25 text-foreground',
  approved: 'bg-success/15 text-success',
  rejected: 'bg-destructive/10 text-destructive',
}

const docLabel: Record<(typeof DOC_KEYS)[number], { ru: string; kk: string }> = {
  idFront: { ru: 'Уд. личности (лицо)', kk: 'Жеке куәлік (бет)' },
  idBack: { ru: 'Уд. личности (оборот)', kk: 'Жеке куәлік (сырт)' },
  psycho: { ru: 'Психосправка', kk: 'Психоанықтама' },
  narco: { ru: 'Наркосправка', kk: 'Наркоанықтама' },
}

export function StatusBadge({ status }: { status: DocStatus }) {
  const { tl } = useStore()
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold', statusCls[status])}>
      {tl(statusText[status])}
    </span>
  )
}

function PasswordPanel({ accountId }: { accountId: string }) {
  const { tl } = useStore()
  const [password, setPassword] = useState<string | null>(null)
  const [newPw, setNewPw] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  const reset = () => {
    const pw = newPw.trim() || Math.random().toString(36).slice(2, 10)
    const res = adminResetPassword(accountId, pw)
    if (!res.ok) {
      setMsg(tl({ ru: 'Пароль не менее 4 символов', kk: 'Құпия сөз кемінде 4 таңба' }))
      return
    }
    setPassword(res.password)
    setNewPw('')
    setMsg(tl({
      ru: 'Новый пароль задан. Передайте его студенту — старый посмотреть нельзя.',
      kk: 'Жаңа құпия сөз орнатылды. Студентке беріңіз — ескісін көру мүмкін емес.',
    }))
  }

  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <h3 className="mb-2 flex items-center gap-2 font-semibold">
        <KeyRound className="size-4 text-primary" aria-hidden="true" />
        {tl({ ru: 'Пароль студента', kk: 'Студент құпия сөзі' })}
      </h3>
      <p className="mb-2 text-xs text-muted-foreground">
        {tl({
          ru: 'Пароли не хранятся открытым текстом. Задайте новый — он один раз покажется здесь.',
          kk: 'Құпия сөздер ашық сақталмайды. Жаңасын орнатыңыз — бір рет осында көрсетіледі.',
        })}
      </p>
      {password && (
        <code className="mb-2 block rounded-lg border bg-card px-3 py-1.5 text-sm font-semibold tracking-wide">{password}</code>
      )}
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground">
          {tl({ ru: 'Новый пароль (пусто = сгенерировать)', kk: 'Жаңа құпия сөз (бос = генерация)' })}
          <input
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="••••"
            className="h-10 rounded-lg border bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        </label>
        <Button type="button" size="sm" className="h-10" onClick={reset}>
          <RefreshCw className="size-4" aria-hidden="true" />
          {tl({ ru: 'Сбросить пароль', kk: 'Құпия сөзді ысыру' })}
        </Button>
      </div>
      {msg && <p className="mt-2 text-xs text-muted-foreground">{msg}</p>}
    </div>
  )
}

function StudentDetail({ student, account }: { student: Student; account: Account | null }) {
  const { tl, approveStudent, rejectStudent, resetStudentDocs, archiveStudent, unarchiveStudent, deleteStudent, presence } = useStore()
  const [date, setDate] = useState(student.readyDate ?? '')
  const uploaded = DOC_KEYS.filter((k) => student.docs[k])
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => setDate(student.readyDate ?? ''), [student.id, student.readyDate])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
            {student.name.split(' ').map((w) => w[0]).join('')}
          </span>
          <div>
            <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold">
              {student.name}
              <OnlineBadge
                lastSeen={presence[student.id]}
                onlineLabel={tl({ ru: 'онлайн', kk: 'онлайн' })}
                offlineLabel={tl({ ru: 'не в сети', kk: 'желіде емес' })}
              />
            </h2>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <Phone className="size-3.5" aria-hidden="true" />
              {student.phone}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-accent px-3 py-1 text-sm font-extrabold text-primary">
            {tl({ ru: 'Категория', kk: 'Санат' })} {student.category}
          </span>
          <StatusBadge status={student.status} />
          {student.archived && (
            <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
              {tl({ ru: 'В архиве', kk: 'Мұрағатта' })}
            </span>
          )}
        </div>
      </div>

      {account && <PasswordPanel accountId={account.id} />}

      <div>
        <h3 className="mb-3 font-semibold">
          {tl({ ru: 'Документы', kk: 'Құжаттар' })} ({uploaded.length}/4)
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {DOC_KEYS.map((k) => {
            const f = student.docs[k]
            return (
              <div key={k} className="rounded-xl border bg-card p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">{tl(docLabel[k])}</p>
                {f?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.url} alt={f.name} className="h-28 w-full rounded-lg object-cover" />
                ) : (
                  <div className="flex h-28 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">—</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            {tl({ ru: 'Дата готовности', kk: 'Дайындық күні' })}
            <input
              type="date"
              min={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 rounded-lg border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </label>
          <Button disabled={!date || student.status === 'approved'} onClick={() => date && approveStudent(student.id, date)}>
            {tl({ ru: 'Подтвердить', kk: 'Растау' })}
          </Button>
          <Button
            variant="outline"
            className="text-destructive"
            disabled={student.status === 'rejected'}
            onClick={() => rejectStudent(student.id)}
          >
            {tl({ ru: 'Отклонить', kk: 'Қабылдамау' })}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const ok = window.confirm(
                tl({
                  ru: 'Сбросить документы этого студента? Он сможет загрузить и отправить их ещё раз.',
                  kk: 'Осы студенттің құжаттарын ысыру керек пе? Ол қайта жүктеп жібере алады.',
                }),
              )
              if (ok) resetStudentDocs(student.id)
            }}
          >
            {tl({ ru: 'Сбросить документы', kk: 'Құжаттарды ысыру' })}
          </Button>
          {student.archived ? (
            <Button variant="outline" onClick={() => unarchiveStudent(student.id)}>
              {tl({ ru: 'Из архива', kk: 'Мұрағаттан' })}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => {
                const ok = window.confirm(
                  tl({
                    ru: `Отправить «${student.name}» в архив? В основном списке не будет виден, данные и документы сохранятся.`,
                    kk: `«${student.name}» мұрағатқа жіберу керек пе? Деректер сақталады.`,
                  }),
                )
                if (ok) archiveStudent(student.id)
              }}
            >
              {tl({ ru: 'В архив', kk: 'Мұрағатқа' })}
            </Button>
          )}
          <Button
            variant="outline"
            className="text-destructive"
            onClick={() => {
              const ok = window.confirm(
                tl({
                  ru: `Удалить аккаунт «${student.name}» навсегда? Вход по этому телефону и все документы будут удалены.`,
                  kk: `«${student.name}» аккаунтын біржола жою керек пе?`,
                }),
              )
              if (ok) deleteStudent(student.id)
            }}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            {tl({ ru: 'Удалить аккаунт', kk: 'Аккаунтты жою' })}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function AdminStudents() {
  const { students, tl, presence, deleteStudent } = useStore()
  const [filter, setFilter] = useState<DocStatus | 'all' | 'archived'>('all')
  const [tick, setTick] = useState(0)
  const accounts = useMemo(() => listAccounts(), [tick, students])

  const confirmDelete = (s: Student) => {
    const ok = window.confirm(
      tl({
        ru: `Удалить аккаунт «${s.name}» навсегда? Вход по этому телефону и все документы будут удалены.`,
        kk: `«${s.name}» аккаунтын біржола жою керек пе?`,
      }),
    )
    if (!ok) return
    deleteStudent(s.id)
    setTick((n) => n + 1)
  }

  const isDemoEntry = (id?: string, phone?: string, name?: string) => {
    if (id === 'me') return true
    const digits = (phone || '').replace(/\D/g, '')
    if (digits === '77015551234' || digits === '87015551234' || digits.endsWith('7015551234')) return true
    if ((name || '').trim().toLowerCase() === 'айдана серикова') return true
    return false
  }

  const merged = useMemo(() => {
    const realStudents = students.filter((s) => s?.id && !isDemoEntry(s.id, s.phone, s.name))
    const byPhone = new Map(realStudents.map((s) => [s.phone.replace(/[^\d+]/g, ''), s]))
    const byId = new Map(realStudents.map((s) => [s.id, s]))
    const list: { student: Student; account: Account | null }[] = []
    for (const a of accounts) {
      if (isDemoEntry(a.id, a.phone, a.fullName)) continue
      const s =
        byId.get(a.id) ||
        byPhone.get(a.phone) ||
        ({
          id: a.id,
          name: a.fullName,
          phone: a.phone,
          category: 'B' as const,
          docs: { idFront: null, idBack: null, psycho: null, narco: null },
          status: 'draft' as const,
          readyDate: null,
          submittedAt: null,
        } satisfies Student)
      list.push({ student: { ...s, name: a.fullName || s.name, phone: a.phone || s.phone }, account: a })
    }
    for (const s of realStudents) {
      if (!list.some((x) => x.student.id === s.id || x.student.phone === s.phone)) {
        list.push({ student: s, account: null })
      }
    }
    return list
  }, [accounts, students])

  const list = useMemo(() => {
    if (filter === 'archived') return merged.filter((x) => x.student.archived)
    const active = merged.filter((x) => !x.student.archived)
    if (filter === 'all') return active
    return active.filter((x) => x.student.status === filter)
  }, [merged, filter])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  useEffect(() => {
    if (!list.length) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !list.some((x) => x.student.id === selectedId)) {
      setSelectedId(list[0].student.id)
    }
  }, [list, selectedId])

  const selected = list.find((x) => x.student.id === selectedId) ?? null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {(['all', 'pending', 'approved', 'rejected', 'draft', 'archived'] as const).map((f) => {
          const count =
            f === 'archived'
              ? merged.filter((x) => x.student.archived).length
              : f === 'all'
                ? merged.filter((x) => !x.student.archived).length
                : merged.filter((x) => !x.student.archived && x.student.status === f).length
          const label =
            f === 'all'
              ? tl({ ru: 'Активные', kk: 'Белсенді' })
              : f === 'archived'
                ? tl({ ru: 'Архив', kk: 'Мұрағат' })
                : tl(statusText[f])
          return (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {label} ({count})
            </button>
          )
        })}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border bg-card">
          <ul className="divide-y">
            {list.map(({ student: s }) => (
              <li key={s.id} className="flex items-stretch">
                <button
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  aria-current={s.id === selected?.student.id}
                  className={cn(
                    'flex min-w-0 flex-1 items-center gap-3 p-3 text-left transition-colors hover:bg-muted/60',
                    s.id === selected?.student.id && 'bg-accent',
                  )}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                    {s.name.split(' ').map((w) => w[0]).join('')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 truncate text-sm font-semibold">
                      <span className="truncate">{s.name}</span>
                      <OnlineBadge
                        lastSeen={presence[s.id]}
                        onlineLabel={tl({ ru: 'онлайн', kk: 'онлайн' })}
                        offlineLabel={tl({ ru: 'не в сети', kk: 'желіде емес' })}
                        compact
                      />
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{s.phone}</span>
                  </span>
                  {s.archived ? (
                    <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                      {tl({ ru: 'Архив', kk: 'Мұрағат' })}
                    </span>
                  ) : (
                    <StatusBadge status={s.status} />
                  )}
                </button>
                <button
                  type="button"
                  title={tl({ ru: 'Удалить аккаунт', kk: 'Аккаунтты жою' })}
                  className="flex items-center px-3 text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation()
                    confirmDelete(s)
                  }}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
            {list.length === 0 && <li className="p-4 text-sm text-muted-foreground">—</li>}
          </ul>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          {selected ? (
            <StudentDetail student={selected.student} account={selected.account} />
          ) : (
            <p className="text-sm text-muted-foreground">{tl({ ru: 'Выберите студента', kk: 'Студентті таңдаңыз' })}</p>
          )}
        </div>
      </div>
    </div>
  )
}
