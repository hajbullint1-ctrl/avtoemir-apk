'use client'

import { useEffect, useState } from 'react'
import { Check, Phone, User, X, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import {
  listRegistrationRequests,
  approveRegistrationRequest,
  setRegistrationRequestStatus,
  type RegistrationRequest,
} from '@/lib/registration-requests'
import { cn } from '@/lib/utils'

function formatWhen(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

export function AdminRegistrationRequests() {
  const { tl } = useStore()
  const [items, setItems] = useState<RegistrationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)

  const load = async () => {
    setLoading(true)
    setLoadError(false)
    const list = await listRegistrationRequests()
    setItems(list)
    // If still empty after a real attempt, surface a soft error (table/RLS/network)
    if (list.length === 0) setLoadError(true)
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const onApprove = async (r: RegistrationRequest) => {
    setBusyId(r.id)
    setInfo(null)
    try {
      const res = await approveRegistrationRequest(r)
      if (res.ok) {
        setInfo(
          res.tempPassword
            ? tl({
                ru: `Одобрено. Временный пароль: ${res.tempPassword}. Попросите ученика войти и сменить его через «Забыли пароль?».`,
                kk: `Мақұлданды. Уақытша құпия сөз: ${res.tempPassword}. Оқушыға «Құпия сөзді ұмыттыңыз ба?» арқылы өзгертуді айтыңыз.`,
              })
            : tl({ ru: 'Уже был в системе — заявка отмечена одобренной.', kk: 'Жүйеде болған — өтініш мақұлданды деп белгіленді.' }),
        )
        await load()
      } else {
        setInfo(tl({ ru: 'Не удалось одобрить', kk: 'Мақұлдау сәтсіз' }))
      }
    } finally {
      setBusyId(null)
    }
  }

  const onReject = async (r: RegistrationRequest) => {
    const ok = window.confirm(tl({ ru: 'Отклонить эту заявку?', kk: 'Бұл өтінішті қабылдамау керек пе?' }))
    if (!ok) return
    setBusyId(r.id)
    try {
      await setRegistrationRequestStatus(r.id, 'rejected')
      await load()
    } finally {
      setBusyId(null)
    }
  }

  const pending = items.filter((i) => i.status === 'pending')
  const done = items.filter((i) => i.status !== 'pending')

  return (
    <div className="flex flex-col gap-4">
      {loadError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {tl({
            ru: 'Не удалось загрузить заявки (проверьте подключение или таблицу registration_requests в Supabase).',
            kk: 'Өтініштер жүктелмеді (қосылымды немесе Supabase-тегі registration_requests кестесін тексеріңіз).',
          })}
        </p>
      )}
      <section className="rounded-2xl border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ClipboardList className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">
              {tl({ ru: 'Заявки на регистрацию', kk: 'Тіркелу өтініштері' })}
            </h2>
            <p className="text-sm text-muted-foreground">
              {tl({
                ru: 'Новые ученики, которые ещё не в базе. Одобрение добавит их в систему.',
                kk: 'Базада жоқ жаңа оқушылар. Мақұлдау оларды жүйеге қосады.',
              })}
            </p>
          </div>
        </div>

        {info && (
          <p className="mb-3 rounded-lg bg-success/10 px-3 py-2 text-sm text-success" role="status">
            {info}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">{tl({ ru: 'Загрузка…', kk: 'Жүктелуде…' })}</p>
        ) : pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {tl({ ru: 'Нет новых заявок', kk: 'Жаңа өтініш жоқ' })}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pending.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 font-semibold">
                    <User className="size-4 text-muted-foreground" />
                    {r.full_name}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm">
                    <Phone className="size-3.5 text-primary" />
                    <a href={`tel:${r.phone}`} className="text-primary hover:underline">
                      {r.phone}
                    </a>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatWhen(r.created_at)}
                    {r.category ? ` · ${r.category}` : ''}
                    {r.branch ? ` · ${r.branch}` : ''}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    className="gap-1"
                    disabled={busyId === r.id}
                    onClick={() => onApprove(r)}
                  >
                    <Check className="size-4" />
                    {tl({ ru: 'Одобрить', kk: 'Мақұлдау' })}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-destructive"
                    disabled={busyId === r.id}
                    onClick={() => onReject(r)}
                  >
                    <X className="size-4" />
                    {tl({ ru: 'Отклонить', kk: 'Қабылдамау' })}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {done.length > 0 && (
        <section className="rounded-2xl border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
            {tl({ ru: 'Обработанные', kk: 'Өңделгендер' })}
          </h3>
          <ul className="flex flex-col gap-2">
            {done.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="font-medium">{r.full_name}</span>
                  <span className="ml-2 text-muted-foreground">{r.phone}</span>
                </span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    r.status === 'approved' ? 'bg-success/15 text-success' : 'bg-destructive/10 text-destructive',
                  )}
                >
                  {r.status === 'approved'
                    ? tl({ ru: 'Одобрено', kk: 'Мақұлданды' })
                    : tl({ ru: 'Отклонено', kk: 'Қабылданбады' })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
