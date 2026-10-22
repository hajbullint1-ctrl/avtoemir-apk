'use client'

import { useEffect, useMemo, useState } from 'react'
import JSZip from 'jszip'
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Download,
  Eye,
  EyeOff,
  FileArchive,
  FileText,
  KeyRound,
  Maximize2,
  Phone,
  RefreshCw,
  Trash2,
  X,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { OnlineBadge } from '@/components/shared/online-badge'
import { DOC_KEYS, type DocFile, type DocKey, type DocStatus, type Student } from '@/lib/data'
import {
  adminResetPassword,
  getAccountPassword,
  listAccounts,
  listPasswordRecoveryRequests,
  resolvePasswordRecovery,
  type Account,
  type PasswordRecoveryRequest,
} from '@/lib/auth'
import { cn } from '@/lib/utils'

const docLabels: Record<DocKey, { ru: string; kk: string }> = {
  idFront: { ru: 'Удостоверение — лицевая', kk: 'Жеке куәлік — алды' },
  idBack: { ru: 'Удостоверение — обратная', kk: 'Жеке куәлік — арты' },
  psycho: { ru: 'Справка ПНД', kk: 'ПНД анықтамасы' },
  narco: { ru: 'Справка НД', kk: 'НД анықтамасы' },
}

const statusText: Record<DocStatus, { ru: string; kk: string }> = {
  draft: { ru: 'Не отправлено', kk: 'Жіберілмеген' },
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

export function StatusBadge({ status }: { status: DocStatus }) {
  const { tl } = useStore()
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold', statusCls[status])}>
      {tl(statusText[status])}
    </span>
  )
}

function fileName(student: Student, key: DocKey, file: DocFile) {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'png'
  return `${student.name.replace(/\s+/g, '_')}_${key}.${ext}`
}

async function saveRemoteFile(url: string, name: string) {
  if (!url || url.startsWith('blob:')) throw new Error('unreachable')
  const res = await fetch(url)
  if (!res.ok) throw new Error('fetch')
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(objectUrl), 4000)
}

function PreviewModal({
  file,
  title,
  onClose,
  onDownload,
}: {
  file: DocFile
  title: string
  onClose: () => void
  onDownload: () => void
}) {
  const { tl } = useStore()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const isPdf = file.name.toLowerCase().endsWith('.pdf')

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex flex-col bg-foreground/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="flex items-center justify-between gap-3 p-4 text-primary-foreground" onClick={(e) => e.stopPropagation()}>
        <p className="truncate font-semibold">{title}</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onDownload}>
            <Download className="size-4" aria-hidden="true" />
            {tl({ ru: 'Скачать', kk: 'Жүктеу' })}
          </Button>
          <Button variant="secondary" size="icon" onClick={onClose} aria-label={tl({ ru: 'Закрыть', kk: 'Жабу' })}>
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
        {isPdf ? (
          <iframe src={file.url} title={title} className="size-full rounded-lg bg-card" />
        ) : (
          <img src={file.url || '/placeholder.svg'} alt={title} className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" />
        )}
      </div>
    </div>
  )
}

export function AdminStudents() {
  const { students, tl, presence, deleteStudent } = useStore()
  const [filter, setFilter] = useState<DocStatus | 'all'>('all')
  const [tick, setTick] = useState(0)
  const accounts = useMemo(() => listAccounts(), [tick, students])
  const recovery = useMemo(() => listPasswordRecoveryRequests(), [tick])

  const confirmDelete = (s: Student) => {
    const ok = window.confirm(
      tl({
        ru: `Удалить аккаунт «${s.name}» навсегда? Вход по этому телефону и все документы будут удалены.`,
        kk: `«${s.name}» аккаунтын біржола жою керек пе? Осы телефонмен кіру және барлық құжаттар өшеді.`,
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

  const list = useMemo(
    () => (filter === 'all' ? merged : merged.filter((x) => x.student.status === filter)),
    [merged, filter],
  )

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
        {(['all', 'pending', 'approved', 'rejected', 'draft'] as const).map((f) => (
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
            {f === 'all' ? tl({ ru: 'Все', kk: 'Барлығы' }) : tl(statusText[f])} (
            {merged.filter((x) => f === 'all' || x.student.status === f).length})
          </button>
        ))}
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
                    {s.name
                      .split(' ')
                      .map((w) => w[0])
                      .join('')}
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
                  <StatusBadge status={s.status} />
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
        <div className="rounded-2xl border bg-card p-5">
          {selected ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">{selected.student.name}</h2>
                  <p className="text-sm text-muted-foreground">{selected.student.phone}</p>
                </div>
                <StatusBadge status={selected.student.status} />
              </div>
              <Button
                variant="outline"
                className="h-10 text-destructive"
                onClick={() => confirmDelete(selected.student)}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                {tl({ ru: 'Удалить аккаунт', kk: 'Аккаунтты жою' })}
              </Button>
              <p className="text-sm text-muted-foreground">
                {tl({
                  ru: 'Документы и остальные действия — после полной синхронизации сборок. Удаление уже работает.',
                  kk: 'Құжаттар мен басқа әрекеттер толық синхроннан кейін. Жою қазір жұмыс істейді.',
                })}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {tl({ ru: 'Нет зарегистрированных студентов', kk: 'Тіркелген студенттер жоқ' })}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
