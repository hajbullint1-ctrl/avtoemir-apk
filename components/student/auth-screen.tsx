'use client'

import { useState } from 'react'
import { Car, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LangToggle } from '@/components/shared/lang-toggle'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'register'

export function AuthScreen() {
  const { login, register, lang, t, tl } = useStore()
  const [mode, setMode] = useState<Mode>('login')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const errorText = (code: string) => {
    const map: Record<string, { ru: string; kk: string }> = {
      name: { ru: 'Укажите имя и фамилию', kk: 'Аты-жөніңізді енгізіңіз' },
      phone: { ru: 'Укажите корректный номер телефона', kk: 'Дұрыс телефон нөмірін енгізіңіз' },
      password: { ru: 'Пароль не менее 4 символов', kk: 'Құпия сөз кемінде 4 таңба' },
      exists: { ru: 'Этот номер уже зарегистрирован', kk: 'Бұл нөмір тіркелген' },
      notfound: { ru: 'Аккаунт не найден', kk: 'Аккаунт табылмады' },
      wrong: { ru: 'Неверный пароль', kk: 'Құпия сөз қате' },
    }
    const e = map[code] || { ru: 'Ошибка', kk: 'Қате' }
    return lang === 'kk' ? e.kk : e.ru
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'register') {
        const res = register(fullName, phone, password)
        if (!res.ok) setError(errorText(res.error === 'password' ? 'password' : res.error))
      } else {
        const res = login(phone, password)
        if (!res.ok) setError(errorText(res.error === 'password' ? 'wrong' : res.error))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-muted/60 md:items-center md:justify-center md:p-6">
      <div className="flex h-dvh w-full flex-col overflow-hidden bg-background md:h-[min(880px,calc(100dvh-3rem))] md:max-w-[420px] md:rounded-[2.25rem] md:border-[6px] md:border-foreground/90 md:shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-2 bg-primary px-4 pb-3 pt-4 text-primary-foreground">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary-foreground text-primary">
              <Car className="size-5" aria-hidden="true" />
            </span>
            <div className="leading-tight">
              <p className="text-base font-extrabold tracking-tight">AvtoEmir</p>
              <p className="text-[11px] opacity-80">{t('appTagline')}</p>
            </div>
          </div>
          <LangToggle />
        </header>
        <main className="flex flex-1 flex-col justify-center overflow-y-auto px-5 py-8">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-extrabold tracking-tight">
              {mode === 'login' ? tl({ ru: 'Вход для студентов', kk: 'Студенттерге кіру' }) : tl({ ru: 'Регистрация', kk: 'Тіркелу' })}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {mode === 'login'
                ? tl({ ru: 'Войдите, чтобы продолжить обучение и тесты', kk: 'Оқу мен тесттерді жалғастыру үшін кіріңіз' })
                : tl({ ru: 'Создайте аккаунт: имя, телефон и пароль', kk: 'Аккаунт жасаңыз: аты, телефон және құпия сөз' })}
            </p>
          </div>
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            {mode === 'register' && (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground">{tl({ ru: 'Имя и Фамилия', kk: 'Аты-жөні' })}</span>
                <input required autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder={tl({ ru: 'Айдана Серикова', kk: 'Айдана Серікова' })}
                  className="h-11 rounded-xl border bg-card px-3 text-sm outline-none ring-primary focus:ring-2" />
              </label>
            )}
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">{tl({ ru: 'Номер телефона', kk: 'Телефон нөмірі' })}</span>
              <input required type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 7XX XXX XX XX"
                className="h-11 rounded-xl border bg-card px-3 text-sm outline-none ring-primary focus:ring-2" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">{tl({ ru: 'Пароль', kk: 'Құпия сөз' })}</span>
              <div className="relative">
                <input required type={showPw ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password} onChange={(e) => setPassword(e.target.value)} minLength={4}
                  className="h-11 w-full rounded-xl border bg-card px-3 pr-11 text-sm outline-none ring-primary focus:ring-2" />
                <button type="button" onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
                  aria-label={showPw ? 'Hide' : 'Show'}>
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </label>
            {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p>}
            <Button type="submit" size="lg" className="mt-1 w-full" disabled={busy}>
              {mode === 'login' ? (<><LogIn className="size-4" aria-hidden="true" />{tl({ ru: 'Войти', kk: 'Кіру' })}</>) : (<><UserPlus className="size-4" aria-hidden="true" />{tl({ ru: 'Зарегистрироваться', kk: 'Тіркелу' })}</>)}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === 'login' ? (
              <>{tl({ ru: 'Нет аккаунта?', kk: 'Аккаунт жоқ па?' })}{' '}
                <button type="button" className={cn('font-semibold text-primary underline-offset-2 hover:underline')}
                  onClick={() => { setMode('register'); setError(null) }}>{tl({ ru: 'Регистрация', kk: 'Тіркелу' })}</button></>
            ) : (
              <>{tl({ ru: 'Уже есть аккаунт?', kk: 'Аккаунт бар ма?' })}{' '}
                <button type="button" className="font-semibold text-primary underline-offset-2 hover:underline"
                  onClick={() => { setMode('login'); setError(null) }}>{tl({ ru: 'Войти', kk: 'Кіру' })}</button></>
            )}
          </p>
        </main>
      </div>
    </div>
  )
}
