'use client'

import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

/** Shared test history — one list, student name next to date (minimal load). */
export function AdminTestResults() {
  const { results, clearResults, tl } = useStore()
  const sorted = [...results].reverse()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">{tl({ ru: 'История тестов', kk: 'Тесттер тарихы' })}</h2>
          <p className="text-sm text-muted-foreground">
            {tl({
              ru: 'Общий список всех попыток. Рядом с датой — имя ученика.',
              kk: 'Барлық әрекеттердің ортақ тізімі. Күнінің жанында — оқушы аты.',
            })}
          </p>
        </div>
        <Button
          variant="outline"
          className="text-destructive"
          disabled={results.length === 0}
          onClick={() => {
            const ok = window.confirm(
              tl({
                ru: 'Сбросить всю историю тестов у всех учеников?',
                kk: 'Барлық оқушылардың тест тарихын өшіру керек пе?',
              }),
            )
            if (ok) clearResults()
          }}
        >
          {tl({ ru: 'Сбросить историю', kk: 'Тарихты өшіру' })}
        </Button>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {tl({ ru: 'Пока нет результатов', kk: 'Әзірше нәтиже жоқ' })}
        </p>
      ) : (
        <ul className="divide-y rounded-xl border bg-card text-sm">
          {sorted.map((r) => {
            const pct = r.total ? Math.round((r.score / r.total) * 100) : 0
            const when = r.date.includes('-')
              ? r.date.replace('T', ' ').slice(0, 16)
              : r.date
            return (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">
                    {r.studentName || tl({ ru: 'Ученик', kk: 'Оқушы' })}
                  </div>
                  <div className="text-xs text-muted-foreground">{when}</div>
                </div>
                <div className="tabular-nums text-muted-foreground">
                  {r.score}/{r.total}
                </div>
                <div className={cn('w-14 text-right font-semibold', pct >= 80 ? 'text-success' : '')}>
                  {pct}%
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
