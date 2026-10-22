'use client'

import { useState } from 'react'
import Link from 'next/link'

/**
 * Public account-deletion page for Google Play / App Store compliance.
 * Users can request deletion without being logged into the app.
 */
export default function DeleteAccountPage() {
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/delete-account-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name, note }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.ok) {
        setError(data?.error === 'phone' ? 'Укажите корректный номер телефона' : 'Не удалось отправить. Попробуйте позже.')
        return
      }
      setDone(true)
    } catch {
      setError('Нет связи с сервером. Попробуйте позже.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-blue-600">AvtoEmir</p>
        <h1 className="mt-1 text-2xl font-bold">Удаление аккаунта</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Вы можете удалить аккаунт прямо в приложении (главная → «Удалить аккаунт») или отправить запрос
          здесь. После удаления удаляются: данные профиля, документы заявки, сообщения, связанные с
          аккаунтом. Обработка запроса — обычно в течение 7 дней.
        </p>

        {done ? (
          <div className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
            Запрос принят. Мы удалим данные, связанные с указанным номером. Если аккаунт не найден,
            дополнительных действий не требуется.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Имя (как при регистрации)
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/40"
                placeholder="Имя Фамилия"
                maxLength={80}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Телефон аккаунта *
              <input
                required
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/40"
                placeholder="+7 7XX XXX XX XX"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Комментарий (необязательно)
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={400}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/40"
                placeholder="Дополнительная информация"
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="mt-1 h-11 rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {busy ? 'Отправка…' : 'Запросить удаление аккаунта'}
            </button>
          </form>
        )}

        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link href="/privacy" className="text-blue-600 underline-offset-2 hover:underline">
            Политика конфиденциальности
          </Link>
          <Link href="/" className="text-slate-600 underline-offset-2 hover:underline">
            В приложение
          </Link>
        </div>
      </div>
    </div>
  )
}
