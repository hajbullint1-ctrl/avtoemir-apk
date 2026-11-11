'use client'

import { useMemo, useState } from 'react'
import { RotateCcw, Trash2, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'

export function AdminDeletedAccounts() {
  const { deletedRecords, restoreDeletedAccount, purgeDeletedRecord, tl } = useStore()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const list = useMemo(
    () =>
      [...deletedRecords].sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || '')),
    [deletedRecords],
  )

  const restore = (id: string, name: string) => {
    const ok = window.confirm(
      tl({
        ru: `Восстановить аккаунт «${name}»? Студент снова сможет войти (если был сохранён пароль).`,
        kk: `«${name}» аккаунтын қалпына келтіру керек пе?`,
      }),
    )
    if (!ok) return
    setBusyId(id)
    setMsg(null)
    try {
      const done = restoreDeletedAccount(id)
      setMsg(
        done
          ? tl({
              ru: `«${name}» восстановлен. Если вход не работает — задайте новый пароль в разделе «Студенты».`,
              kk: `«${name}» қалпына келтірілді. Кіру жұмыс істемесе — «Студенттер» бөлімінде жаңа құпия сөз беріңіз.`,
            })
          : tl({ ru: 'Не удалось восстановить', kk: 'Қалпына келтіру сәтсіз' }),
      )
    } finally {
      setBusyId(null)
    }
  }

  const removeForever = (id: string, name: string) => {
    const ok = window.confirm(
      tl({
        ru: `Удалить «${name}» из списка удалённых навсегда? Восстановить потом будет нельзя.`,
        kk: `«${name}» тізімнен біржола өшіру керек пе? Кейін қалпына келтіру мүмкін емес.`,
      }),
    )
    if (!ok) return
    purgeDeletedRecord(id)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border bg-card p-4">
        <div className="mb-1 flex items-center gap-2">
          <UserX className="size-5 text-primary" aria-hidden="true" />
          <h2 className="text-base font-extrabold">
            {tl({ ru: 'Удалённые аккаунты', kk: 'Жойылған аккаунттар' })}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {tl({
            ru: 'Здесь хранятся снимки аккаунтов после удаления. Можно восстановить доступ или стереть запись навсегда. Синхронизируется через Supabase.',
            kk: 'Жойылған аккаунттардың көшірмесі осында. Қалпына келтіруге немесе біржола өшіруге болады. Supabase арқылы синхрондалады.',
          })}
        </p>
        {msg && <p className="mt-3 rounded-lg bg-accent/50 px-3 py-2 text-sm">{msg}</p>}
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <ul className="divide-y">
          {list.map((r) => {
            const name = r.account?.fullName || r.student?.name || r.id
            const phone = r.account?.phone || r.student?.phone || '—'
            const date = r.deletedAt
              ? new Date(r.deletedAt).toLocaleString('ru-RU', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—'
            const hasPw = !!(r.account?.passwordHash && !r.account.passwordHash.includes('needs-reset'))
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                  {name
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {phone}
                    {r.student?.category ? ` · ${r.student.category}` : ''}
                    {r.student?.status ? ` · ${r.student.status}` : ''}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {tl({ ru: 'Удалён', kk: 'Жойылған' })}: {date}
                    {!hasPw
                      ? ` · ${tl({ ru: 'пароль нужно сбросить', kk: 'құпия сөзді ысыру керек' })}`
                      : ''}
                  </p>
                </div>
                <div className="flex w-full gap-2 sm:w-auto">
                  <Button
                    size="sm"
                    disabled={busyId === r.id}
                    onClick={() => restore(r.id, name)}
                    className="flex-1 sm:flex-none"
                  >
                    <RotateCcw className="size-3.5" aria-hidden="true" />
                    {tl({ ru: 'Восстановить', kk: 'Қалпына келтіру' })}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive flex-1 sm:flex-none"
                    onClick={() => removeForever(r.id, name)}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                    {tl({ ru: 'Стереть', kk: 'Өшіру' })}
                  </Button>
                </div>
              </li>
            )
          })}
          {list.length === 0 && (
            <li className="p-6 text-center text-sm text-muted-foreground">
              {tl({ ru: 'Удалённых аккаунтов нет', kk: 'Жойылған аккаунттар жоқ' })}
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
