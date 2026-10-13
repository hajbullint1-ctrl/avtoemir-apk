'use client'

import { useEffect, useState } from 'react'
import JSZip from 'jszip'
import { CalendarDays, CheckCircle2, Download, FileArchive, FileText, Maximize2, Phone, X, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { DOC_KEYS, type DocFile, type DocKey, type DocStatus, type Student } from '@/lib/data'
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

function downloadUrl(url: string, name: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
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

function StudentDetail({ student }: { student: Student }) {
  const { tl, approveStudent, rejectStudent } = useStore()
  const [preview, setPreview] = useState<DocKey | null>(null)
  const [date, setDate] = useState(student.readyDate ?? '')
  const [zipping, setZipping] = useState(false)
  const uploaded = DOC_KEYS.filter((k) => student.docs[k])
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => setDate(student.readyDate ?? ''), [student.id, student.readyDate])

  const downloadOne = (k: DocKey) => {
    const f = student.docs[k]
    if (f) downloadUrl(f.url, fileName(student, k, f))
  }

  const downloadZip = async () => {
    setZipping(true)
    try {
      const zip = new JSZip()
      await Promise.all(
        uploaded.map(async (k) => {
          const f = student.docs[k]!
          const blob = await fetch(f.url).then((r) => r.blob())
          zip.file(fileName(student, k, f), blob)
        }),
      )
      const out = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(out)
      downloadUrl(url, `${student.name.replace(/\s+/g, '_')}_documents.zip`)
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    } finally {
      setZipping(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
            {student.name.split(' ').map((w) => w[0]).join('')}
          </span>
          <div>
            <h2 className="text-lg font-bold">{student.name}</h2>
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
        </div>
      </div>

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

export function AdminStudents() {
  const { students, tl } = useStore()
  const [filter, setFilter] = useState<DocStatus | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string>(students.find((s) => s.status === 'pending')?.id ?? students[0].id)
  const list = students.filter((s) => filter === 'all' || s.status === filter)
  const selected = students.find((s) => s.id === selectedId) ?? students[0]
  const filters: (DocStatus | 'all')[] = ['all', 'pending', 'approved', 'draft', 'rejected']

  return (
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
              {students.filter((s) => f === 'all' || s.status === f).length})
            </button>
          ))}
        </div>
        <ul className="divide-y">
          {list.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setSelectedId(s.id)}
                aria-current={s.id === selected.id}
                className={cn(
                  'flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/60',
                  s.id === selected.id && 'bg-accent',
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                  {s.name.split(' ').map((w) => w[0]).join('')}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {s.name}
                    {s.id === 'me' && <span className="ml-1 text-xs font-normal text-primary">(demo)</span>}
                  </span>
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
        <StudentDetail student={selected} />
      </div>
    </div>
  )
}
