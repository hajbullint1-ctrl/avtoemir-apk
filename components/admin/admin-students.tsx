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
  // blob: links exist only in the browser that created them and cannot be downloaded by admin.
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

function PasswordPanel({ accountId }: { accountId: string }) {
  const { tl } = useStore()
  const [visible, setVisible] = useState(false)
  const [password, setPassword] = useState<string | null>(null)
  const [newPw, setNewPw] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  const reveal = () => {
    const p = getAccountPassword(accountId)
    setPassword(p)
    setVisible(true)
    if (!p) setMsg(tl({ ru: 'Пароль недоступен (старый аккаунт). Задайте новый.', kk: 'Құпия сөз қолжетімсіз. Жаңасын орнатыңыз.' }))
    else setMsg(null)
  }

  const reset = () => {
    const pw = newPw.trim() || Math.random().toString(36).slice(2, 8)
    const res = adminResetPassword(accountId, pw)
    if (!res.ok) {
      setMsg(tl({ ru: 'Пароль не менее 4 символов', kk: 'Құпия сөз кемінде 4 таңба' }))
      return
    }
    setPassword(res.password)
    setNewPw('')
    setVisible(true)
    setMsg(tl({ ru: 'Пароль обновлён. Сообщите его студенту.', kk: 'Құпия сөз жаңартылды. Студентке хабарлаңыз.' }))
  }

  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <h3 className="mb-2 flex items-center gap-2 font-semibold">
        <KeyRound className="size-4 text-primary" aria-hidden="true" />
        {tl({ ru: 'Пароль студента', kk: 'Студент құпия сөзі' })}
      </h3>
      <p className="mb-3 text-xs text-muted-foreground">
        {tl({
          ru: 'Только для восстановления доступа. В продакшене используйте SMS/email-токены.',
          kk: 'Тек қолжетімділікті қалпына келтіру үшін. Өндірісте SMS/email токендерін қолданыңыз.',
        })}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={reveal}>
          {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
          {visible
            ? tl({ ru: 'Скрыть', kk: 'Жасыру' })
            : tl({ ru: 'Показать пароль', kk: 'Құпия сөзді көрсету' })}
        </Button>
        {visible && password && (
          <code className="rounded-lg border bg-card px-3 py-1.5 text-sm font-semibold tracking-wide">{password}</code>
        )}
      </div>
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

function ProgressPanel({ student }: { student: Student }) {
  const { theory, results, tl } = useStore()
  const theoryTotal = theory.reduce((a, b) => a + b.lessons, 0)
  const theoryDone = theory.reduce((a, b) => a + b.done, 0)
  const theoryPct = theoryTotal ? Math.round((theoryDone / theoryTotal) * 100) : 0
  const docsCount = DOC_KEYS.filter((k) => student.docs[k]).length
  const lastTest = results.length ? results[results.length - 1] : null
  const bestPct = results.length
    ? Math.max(...results.map((r) => Math.round((r.score / r.total) * 100)))
    : null

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <div className="rounded-xl border bg-card p-3">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <BookOpen className="size-3.5" aria-hidden="true" />
          {tl({ ru: 'Теория', kk: 'Теория' })}
        </div>
        <p className="text-lg font-bold text-primary">{theoryPct}%</p>
        <p className="text-xs text-muted-foreground">
          {theoryDone}/{theoryTotal} {tl({ ru: 'уроков', kk: 'сабақ' })}
        </p>
      </div>
      <div className="rounded-xl border bg-card p-3">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <ClipboardList className="size-3.5" aria-hidden="true" />
          {tl({ ru: 'Тесты', kk: 'Тесттер' })}
        </div>
        <p className="text-lg font-bold text-primary">{bestPct != null ? `${bestPct}%` : '—'}</p>
        <p className="text-xs text-muted-foreground">
          {results.length
            ? `${tl({ ru: 'Попыток', kk: 'Талпыныс' })}: ${results.length}${
                lastTest ? ` • ${lastTest.score}/${lastTest.total}` : ''
              }`
            : tl({ ru: 'Ещё не сдавал', kk: 'Әлі тапсырмаған' })}
        </p>
      </div>
      <div className="rounded-xl border bg-card p-3">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <FileText className="size-3.5" aria-hidden="true" />
          {tl({ ru: 'Документы', kk: 'Құжаттар' })}
        </div>
        <p className="text-lg font-bold text-primary">{docsCount}/4</p>
        <p className="text-xs text-muted-foreground">
          <StatusBadge status={student.status} />
        </p>
      </div>
    </div>
  )
}

function StudentDetail({ student, account }: { student: Student; account: Account | null }) {
  const { tl, approveStudent, rejectStudent, resetStudentDocs, presence } = useStore()
  const [preview, setPreview] = useState<DocKey | null>(null)
  const [date, setDate] = useState(student.readyDate ?? '')
  const [zipping, setZipping] = useState(false)
  const [docError, setDocError] = useState('')
  const uploaded = DOC_KEYS.filter((k) => student.docs[k])
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => setDate(student.readyDate ?? ''), [student.id, student.readyDate])

  const brokenHint = tl({
    ru: 'Эти файлы сохранены только на телефоне студента и скачать их нельзя. Нажмите «Сбросить документы», чтобы студент отправил их ещё раз.',
    kk: 'Бұл файлдар тек студенттің телефонында сақталған, жүктеу мүмкін емес. «Құжаттарды ысыру» батырмасын басыңыз.',
  })

  const downloadOne = async (k: DocKey) => {
    const f = student.docs[k]
    if (!f) return
    setDocError('')
    try {
      await saveRemoteFile(f.url, fileName(student, k, f))
    } catch {
      setDocError(brokenHint)
    }
  }

  const downloadZip = async () => {
    setZipping(true)
    setDocError('')
    try {
      const zip = new JSZip()
      await Promise.all(
        uploaded.map(async (k) => {
          const f = student.docs[k]!
          if (!f.url || f.url.startsWith('blob:')) throw new Error('unreachable')
          const res = await fetch(f.url)
          if (!res.ok) throw new Error('fetch')
          zip.file(fileName(student, k, f), await res.blob())
        }),
      )
      const out = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(out)
      const a = document.createElement('a')
      a.href = url
      a.download = `${student.name.replace(/\s+/g, '_')}_documents.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
    } catch {
      setDocError(brokenHint)
    } finally {
      setZipping(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
            {student.name
              .split(' ')
              .map((w) => w[0])
              .join('')}
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
            {account?.createdAt && (
              <p className="text-xs text-muted-foreground">
                {tl({ ru: 'Регистрация', kk: 'Тіркелу' })}:{' '}
                {new Date(account.createdAt).toLocaleString('ru-RU')}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-accent px-3 py-1 text-sm font-extrabold text-primary">
            {tl({ ru: 'Категория', kk: 'Санат' })} {student.category}
          </span>
          <StatusBadge status={student.status} />
        </div>
      </div>

      <ProgressPanel student={student} />

      {account && <PasswordPanel accountId={account.id} />}

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">
            {tl({ ru: 'Документы', kk: 'Құжаттар' })} ({uploaded.length}/4)
          </h3>
          <Button variant="outline" disabled={!uploaded.length || zipping} onClick={downloadZip}>
            <FileArchive className="size-4" aria-hidden="true" />
            {zipping ? '…' : tl({ ru: 'Скачать всё (ZIP)', kk: 'Барлығын жүктеу (ZIP)' })}
          </Button>
        </div>
        {docError && <p className="mb-3 text-sm text-destructive">{docError}</p>}
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {DOC_KEYS.map((k) => {
            const f = student.docs[k]
            const isPdf = f?.name.toLowerCase().endsWith('.pdf')
            return (
              <div key={k} className="flex flex-col overflow-hidden rounded-xl border bg-card">
                {f ? (
                  <button
                    type="button"
                    onClick={() => setPreview(k)}
                    className="group relative aspect-[4/3] bg-muted"
                    aria-label={`${tl({ ru: 'Открыть', kk: 'Ашу' })}: ${tl(docLabels[k])}`}
                  >
                    {isPdf ? (
                      <span className="flex size-full items-center justify-center text-muted-foreground">
                        <FileText className="size-8" aria-hidden="true" />
                      </span>
                    ) : (
                      <img src={f.url || '/placeholder.svg'} alt="" className="size-full object-cover" />
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-foreground/0 text-primary-foreground opacity-0 transition group-hover:bg-foreground/40 group-hover:opacity-100">
                      <Maximize2 className="size-6" aria-hidden="true" />
                    </span>
                  </button>
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-muted text-xs text-muted-foreground">
                    {tl({ ru: 'Не загружено', kk: 'Жүктелмеген' })}
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 p-2">
                  <span className="text-xs font-medium leading-tight">{tl(docLabels[k])}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!f}
                    onClick={() => downloadOne(k)}
                    aria-label={`${tl({ ru: 'Скачать файл', kk: 'Файлды жүктеу' })}: ${tl(docLabels[k])}`}
                  >
                    <Download className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-xl border bg-accent/40 p-4">
        <h3 className="mb-1 flex items-center gap-2 font-semibold">
          <CalendarDays className="size-4 text-primary" aria-hidden="true" />
          {tl({ ru: 'Подтверждение документов', kk: 'Құжаттарды растау' })}
        </h3>
        <p className="mb-3 text-sm text-muted-foreground">
          {tl({
            ru: 'Укажите дату готовности удостоверения — у студента запустится таймер обратного отсчёта.',
            kk: 'Куәліктің дайын болу күнін көрсетіңіз — студентте кері санақ таймері іске қосылады.',
          })}
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            {tl({ ru: 'Дата готовности', kk: 'Дайын болу күні' })}
            <input
              type="date"
              min={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 rounded-lg border bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </label>
          <Button className="h-10" disabled={!date || uploaded.length < 4} onClick={() => approveStudent(student.id, date)}>
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {student.status === 'approved'
              ? tl({ ru: 'Обновить дату', kk: 'Күнді жаңарту' })
              : tl({ ru: 'Подтвердить документы', kk: 'Құжаттарды растау' })}
          </Button>
          <Button
            variant="outline"
            className="h-10 text-destructive"
            disabled={student.status === 'draft'}
            onClick={() => rejectStudent(student.id)}
          >
            <XCircle className="size-4" aria-hidden="true" />
            {tl({ ru: 'Отклонить', kk: 'Қабылдамау' })}
          </Button>
          <Button
            variant="outline"
            className="h-10"
            disabled={uploaded.length === 0 && student.status === 'draft'}
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
            <RefreshCw className="size-4" aria-hidden="true" />
            {tl({ ru: 'Сбросить документы', kk: 'Құжаттарды ысыру' })}
          </Button>
        </div>
        {uploaded.length < 4 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {tl({ ru: 'Загружены не все документы.', kk: 'Барлық құжаттар жүктелмеген.' })}
          </p>
        )}
      </div>

      {preview && student.docs[preview] && (
        <PreviewModal
          file={student.docs[preview]!}
          title={`${student.name} — ${tl(docLabels[preview])}`}
          onClose={() => setPreview(null)}
          onDownload={() => downloadOne(preview)}
        />
      )}
    </div>
  )
}

function RecoveryBanner({
  requests,
  onResolve,
  onSelect,
}: {
  requests: PasswordRecoveryRequest[]
  onResolve: (id: string) => void
  onSelect: (accountId: string) => void
}) {
  const { tl } = useStore()
  const open = requests.filter((r) => !r.resolved)
  if (!open.length) return null
  return (
    <div className="mb-4 rounded-2xl border border-warning/40 bg-warning/10 p-4">
      <h3 className="mb-2 font-semibold">
        {tl({ ru: 'Заявки на восстановление пароля', kk: 'Құпия сөзді қалпына келтіру өтініштері' })} ({open.length})
      </h3>
      <ul className="flex flex-col gap-2">
        {open.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-3 py-2 text-sm">
            <span>
              <span className="font-semibold">{r.fullName}</span>
              <span className="text-muted-foreground"> · {r.phone}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {new Date(r.createdAt).toLocaleString('ru-RU')}
              </span>
            </span>
            <span className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => onSelect(r.accountId)}>
                {tl({ ru: 'Открыть', kk: 'Ашу' })}
              </Button>
              <Button type="button" size="sm" onClick={() => onResolve(r.id)}>
                {tl({ ru: 'Отметить решённым', kk: 'Шешілді деп белгілеу' })}
              </Button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function AdminStudents() {
  const { students, tl, presence } = useStore()
  const [filter, setFilter] = useState<DocStatus | 'all'>('all')
  const [tick, setTick] = useState(0)
  const accounts = useMemo(() => listAccounts(), [tick, students])
  const recovery = useMemo(() => listPasswordRecoveryRequests(), [tick])

  const merged = useMemo(() => {
    const byPhone = new Map(students.map((s) => [s.phone.replace(/[^\d+]/g, ''), s]))
    const byId = new Map(students.map((s) => [s.id, s]))
    const list: { student: Student; account: Account | null }[] = []
    for (const a of accounts) {
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
    for (const s of students) {
      if (!list.some((x) => x.student.id === s.id || x.student.phone === s.phone)) {
        list.push({ student: s, account: null })
      }
    }
    return list
  }, [accounts, students])

  const [selectedId, setSelectedId] = useState<string>(
    merged.find((x) => x.student.status === 'pending')?.student.id ?? merged[0]?.student.id ?? '',
  )

  useEffect(() => {
    if (!merged.some((x) => x.student.id === selectedId) && merged[0]) {
      setSelectedId(merged[0].student.id)
    }
  }, [merged, selectedId])

  const list = merged.filter((x) => filter === 'all' || x.student.status === filter)
  const selected = merged.find((x) => x.student.id === selectedId) ?? merged[0]
  const filters: (DocStatus | 'all')[] = ['all', 'pending', 'approved', 'draft', 'rejected']

  return (
    <div>
      <RecoveryBanner
        requests={recovery}
        onResolve={(id) => {
          resolvePasswordRecovery(id)
          setTick((n) => n + 1)
        }}
        onSelect={(accountId) => {
          setSelectedId(accountId)
          setTick((n) => n + 1)
        }}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
        <div className="rounded-2xl border bg-card">
          <div className="flex flex-wrap gap-1.5 border-b p-3">
            {filters.map((f) => (
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
          <ul className="divide-y">
            {list.map(({ student: s }) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  aria-current={s.id === selected?.student.id}
                  className={cn(
                    'flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/60',
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
                      <span className="truncate">
                        {s.name}
                        {s.id === 'me' && <span className="ml-1 text-xs font-normal text-primary">(demo)</span>}
                      </span>
                      <OnlineBadge
                        lastSeen={presence[s.id]}
                        onlineLabel={tl({ ru: 'онлайн', kk: 'онлайн' })}
                        offlineLabel={tl({ ru: 'не в сети', kk: 'желіде емес' })}
                        compact
                      />
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{s.phone}</span>
                    <span className="text-xs text-muted-foreground">
                      {tl({ ru: 'Кат.', kk: 'Сан.' })} {s.category}
                      {s.submittedAt && ` • ${new Date(s.submittedAt).toLocaleDateString('ru-RU')}`}
                    </span>
                  </span>
                  <StatusBadge status={s.status} />
                </button>
              </li>
            ))}
            {list.length === 0 && <li className="p-4 text-sm text-muted-foreground">—</li>}
          </ul>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          {selected ? (
            <StudentDetail
              student={selected.student}
              account={selected.account}
              key={selected.student.id + tick}
            />
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
