'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { saveSharedKey, loadSharedKeys } from '@/lib/sync'

function daysAgo(days: number) {
  return Date.now() - days * 24 * 60 * 60 * 1000
}

export function AdminCleanup() {
  const { tl, messages, results, setMessages, setResults } = useStore()
  const [busy, setBusy] = useState(false)
  const [info, setInfo] = useState<string | null>(null)

  const clean = async () => {
    if (!confirm(tl({
      ru: 'Удалить старые сообщения (старше 90 дней), обработанные заявки и лишние результаты тестов? Это нельзя отменить.',
      kk: 'Ескі хабарламаларды (90 күннен астам), өңделген өтініштерді және артық тест нәтижелерін жою керек пе? Бұл қайтарылмайды.',
    }))) return

    setBusy(true)
    setInfo(null)
    try {
      const cutoffMsg = daysAgo(90)
      const cutoffReq = daysAgo(30)

      // Messages older than 90 days
      const nextMessages = messages.filter((m) => {
        const t = Date.parse(m.time?.replace(' ', 'T') || '') || 0
        return t > cutoffMsg
      })
      const removedMsg = messages.length - nextMessages.length

      // Keep last 20 results per student
      const byStudent = new Map<string, typeof results>()
      for (const r of results) {
        const key = r.studentId || '_'
        const list = byStudent.get(key) || []
        list.push(r)
        byStudent.set(key, list)
      }
      const nextResults: typeof results = []
      let removedRes = 0
      for (const list of byStudent.values()) {
        list.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        nextResults.push(...list.slice(0, 20))
        removedRes += Math.max(0, list.length - 20)
      }

      // Registration requests: remove processed older than 30 days
      const cloud = await loadSharedKeys(['registrationRequests'])
      const reqs = Array.isArray(cloud?.registrationRequests) ? cloud.registrationRequests : []
      const nextReqs = reqs.filter((r: { status?: string; created_at?: string }) => {
        if (r.status === 'pending') return true
        const t = Date.parse(r.created_at || '') || 0
        return t > cutoffReq
      })
      const removedReq = reqs.length - nextReqs.length

      // Save
      if (removedMsg) {
        setMessages(nextMessages)
        await saveSharedKey('messages', nextMessages)
      }
      if (removedRes) {
        setResults(nextResults)
        await saveSharedKey('results', nextResults)
      }
      if (removedReq) {
        await saveSharedKey('registrationRequests', nextReqs)
      }

      setInfo(tl({
        ru: `Готово. Удалено: сообщений ${removedMsg}, результатов ${removedRes}, заявок ${removedReq}.`,
        kk: `Дайын. Жойылды: хабарлама ${removedMsg}, нәтиже ${removedRes}, өтініш ${removedReq}.`,
      }))
    } catch (e) {
      console.warn(e)
      setInfo(tl({ ru: 'Ошибка очистки', kk: 'Тазалау қатесі' }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <Trash2 className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">{tl({ ru: 'Очистка старых данных', kk: 'Ескі деректерді тазалау' })}</h2>
          <p className="text-sm text-muted-foreground">
            {tl({
              ru: 'Уменьшает нагрузку на Supabase. Сообщения старше 90 дней, обработанные заявки старше 30 дней, лишние результаты тестов.',
              kk: 'Supabase жүктемесін азайтады. 90 күннен астам хабарламалар, 30 күннен астам өңделген өтініштер, артық тест нәтижелері.',
            })}
          </p>
        </div>
      </div>
      {info && <p className="mb-3 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">{info}</p>}
      <Button variant="destructive" disabled={busy} onClick={clean} className="gap-1.5">
        <Trash2 className="size-4" />
        {busy ? tl({ ru: 'Очистка…', kk: 'Тазалануда…' }) : tl({ ru: 'Очистить старые данные', kk: 'Ескі деректерді тазалау' })}
      </Button>
    </section>
  )
}
