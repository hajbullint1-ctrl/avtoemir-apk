'use client'

import { useEffect, useState } from 'react'
import { isOnline } from '@/lib/presence'
import { cn } from '@/lib/utils'

export function OnlineBadge({
  lastSeen,
  onlineLabel,
  offlineLabel,
  compact = false,
}: {
  lastSeen?: string
  onlineLabel: string
  offlineLabel: string
  compact?: boolean
}) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10000)
    return () => clearInterval(id)
  }, [])
  const on = isOnline(lastSeen, now)
  return (
    <span className={cn('inline-flex items-center gap-1 font-semibold', compact ? 'text-[10px]' : 'text-[11px]', on ? 'text-success' : 'text-muted-foreground')}>
      <span className={cn('size-2 shrink-0 rounded-full', on ? 'bg-success' : 'bg-muted-foreground/40')} aria-hidden="true" />
      {compact ? null : on ? onlineLabel : offlineLabel}
    </span>
  )
}
