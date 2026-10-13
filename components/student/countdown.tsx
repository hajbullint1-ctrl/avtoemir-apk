'use client'

import { useEffect, useState } from 'react'
import { PartyPopper } from 'lucide-react'
import { useStore } from '@/lib/store'

export function Countdown({ readyDate }: { readyDate: string }) {
  const { t } = useStore()
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const target = new Date(`${readyDate}T09:00:00`).getTime()
  const diff = now === null ? null : Math.max(0, target - now)

  if (diff === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-primary-foreground/15 p-3 text-sm font-medium">
        <PartyPopper className="size-5 shrink-0" aria-hidden="true" />
        {t('ready')}
      </div>
    )
  }

  const parts =
    diff === null
      ? ['--', '--', '--', '--']
      : [
          Math.floor(diff / 86400000),
          Math.floor((diff / 3600000) % 24),
          Math.floor((diff / 60000) % 60),
          Math.floor((diff / 1000) % 60),
        ].map((n) => String(n).padStart(2, '0'))
  const labels = [t('days'), t('hours'), t('minutes'), t('seconds')]

  return (
    <div className="grid grid-cols-4 gap-2" aria-live="off">
      {parts.map((p, i) => (
        <div key={labels[i]} className="rounded-xl bg-primary-foreground/15 px-1 py-2 text-center">
          <div className="font-mono text-2xl font-bold tabular-nums">{p}</div>
          <div className="text-[11px] uppercase tracking-wide opacity-80">{labels[i]}</div>
        </div>
      ))}
    </div>
  )
}
