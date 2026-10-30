'use client'

import { useState } from 'react'
import { Car, Eye, EyeOff, KeyRound, LogIn, UserPlus, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LangToggle } from '@/components/shared/lang-toggle'
import { useStore } from '@/lib/store'
import { resetPasswordByPhone } from '@/lib/auth'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'register' | 'forgot'

export function AuthScreen() {
  const { login, register, loginAsGuest, lang, t, tl } = useStore()
  const [mode, setMode] = useState<Mode>('login')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const errorText = (code: string) => {
    const map: Record<string, { ru: string; kk: string }> = {
      name: { ru: 'Укажите имя и фамилию', kk: 'Аты-жөніңізді енгізіңіз' },
      phone: { ru: 'Укажите корректный номер телефона', kk: 'Дұрыс телефон нөмірін енгізіңіз' },
      password: { ru: 'Пароль не менее 6 символов', kk: 'Құпия сөз кемінде 6 таңба' },
      mismatch: { ru: 'Пароли не совпадают', kk: 'Құпия сөздер сәйкес емес' },
      exists: { ru: 'Этот номер уже зарегистрирован. Войдите или восстановите пароль.', kk: 'Бұл нөмір тіркелген. Кіріңіз немесе құпия сөзді қалпына келтіріңіз.' },
      notfound: { ru: 'Аккаунт с таким номером не найден', kk: 'Мұндай нөмірмен аккаунт табылмады' },
      wrong: { ru: 'Неверный пароль', kk: 'Құпия сөз қате' },
    }
    const e = map[code] || { ru: 'Ошибка', kk: 'Қате' }
    return lang === 'kk' ? e.kk : e.ru
  }

  const switchMode = (m: Mode) => {
    setMode(m)
    setError(null)
    setSuccess(null)
    setPassword('')
    setPassword2('')
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setBusy(true)
    try {
      if (mode === 'register') {
        const res = await register(fullName, phone, password)
        if (!res.ok) setError(errorText(res.error === 'password' ? 'password' : res.error))
      } else if (mode === 'forgot') {
        if (password !== password2) {
          setError(errorText('mismatch'))
          return
        }
        const reset = await resetPasswordByPhone(phone, password)
        if (!reset.ok) {
          setError(errorText(reset.error))
          return
        }
        setSuccess(
          tl({
            ru: 'Пароль обновлён. Теперь войдите с новым паролем.',
            kk: 'Құпия сөз жаңартылды. Енді жаңа құпия сөзбен кіріңіз.',
          }),
        )
        setPassword('')
        setPassword2('')
        setTimeout(() => switchMode('login'), 1500)
      } else {
        const res = await login(phone, password)
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
              {mode === 'login' && tl({ ru: 'Вход для студентов', kk: 'Студенттерге кіру' })}
              {mode === 'register' && tl({ ru: 'Регистрация', kk: 'Тіркелу' })}
              {mode === 'forgot' && tl({ ru: 'Восстановление пароля', kk: 'Құпия сөзді қалпына келтіру' })}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {mode === 'login' &&
                tl({ ru: 'Войдите, чтобы продолжить обучение и тесты', kk: 'Оқу мен тесттерді жалғастыру үшін кіріңіз' })}
              {mode === 'register' &&
                tl({ ru: 'Создайте аккаунт: имя, телефон и пароль (от 6 символов)', kk: 'Аккаунт жасаңыз: аты, телефон және құпия сөз (кемінде 6 таңба)' })}
              {mode === 'forgot' &&
                tl({
                  ru: 'Введите номер телефона и новый пароль — пароль сменится сразу',
                  kk: 'Телефон нөмірі мен жаңа құпия сөзді енгізіңіз — құпия сөз бірден өзгереді',
                })}
            </p>
          </div>
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            {mode === 'register' && (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground">
                  {tl({ ru: 'Имя и Фамилия', kk: 'Аты-жөні' })}
                </span>
                <input
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={tl({ ru: 'Айдана Серикова', kk: 'Айдана Серікова' })}
                  className="h-11 rounded-xl border bg-card px-3 text-sm outline-none ring-primary focus:ring-2"
                />
              </label>
            )}
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">
                {tl({ ru: 'Номер телефона', kk: 'Телефон нөмірі' })}
              </span>
              <input
                required
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 7XX XXX XX XX"
                className="h-11 rounded-xl border bg-card px-3 text-sm outline-none ring-primary focus:ring-2"
              />
            </label>
            {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground">
                  {mode === 'forgot'
                    ? tl({ ru: 'Новый пароль', kk: 'Жаңа құпия сөз' })
                    : tl({ ru: 'Пароль', kk: 'Құпия сөз' })}
                </span>
                <div className="relative">
                  <input
                    required
                    type={showPw ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    className="h-11 w-full rounded-xl border bg-card px-3 pr-11 text-sm outline-none ring-primary focus:ring-2"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
                    aria-label={showPw ? 'Hide' : 'Show'}
                  >
                    {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </label>
            )}
            {mode === 'forgot' && (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground">
                  {tl({ ru: 'Повторите новый пароль', kk: 'Жаңа құпия сөзді қайталаңыз' })}
                </span>
                <input
                  required
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  minLength={6}
                  className="h-11 w-full rounded-xl border bg-card px-3 text-sm outline-none ring-primary focus:ring-2"
                />
              </label>
            )}
            {mode === 'login' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
                  onClick={() => switchMode('forgot')}
                >
                  {tl({ ru: 'Забыли пароль?', kk: 'Құпия сөзді ұмыттыңыз ба?' })}
                </button>
              </div>
            )}
            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            {success && (
              <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success" role="status">
                {success}
              </p>
            )}
            <Button type="submit" size="lg" className="mt-1 w-full" disabled={busy}>
              {mode === 'login' && (
                <>
                  <LogIn className="size-4" aria-hidden="true" />
                  {tl({ ru: 'Войти', kk: 'Кіру' })}
                </>
              )}
              {mode === 'register' && (
                <>
                  <UserPlus className="size-4" aria-hidden="true" />
                  {tl({ ru: 'Зарегистрироваться', kk: 'Тіркелу' })}
                </>
              )}
              {mode === 'forgot' && (
                <>
                  <KeyRound className="size-4" aria-hidden="true" />
                  {tl({ ru: 'Сохранить новый пароль', kk: 'Жаңа құпия сөзді сақтау' })}
                </>
              )}
            </Button>
            {mode === 'login' && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                disabled={busy}
                onClick={() => {
                  setBusy(true)
                  try {
                    loginAsGuest()
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                <UserRound className="size-4" aria-hidden="true" />
                {tl({ ru: 'Войти как гость', kk: 'Қонақ ретінде кіру' })}
              </Button>
            )}
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === 'login' && (
              <>
                {tl({ ru: 'Нет аккаунта?', kk: 'Аккаунт жоқ па?' })}{' '}
                <button type="button" className={cn('font-semibold text-primary underline-offset-2 hover:underline')} onClick={() => switchMode('register')}>
                  {tl({ ru: 'Регистрация', kk: 'Тіркелу' })}
                </button>
              </>
            )}
            {mode === 'register' && (
              <>
                {tl({ ru: 'Уже есть аккаунт?', kk: 'Аккаунт бар ма?' })}{' '}
                <button type="button" className="font-semibold text-primary underline-offset-2 hover:underline" onClick={() => switchMode('login')}>
                  {tl({ ru: 'Войти', kk: 'Кіру' })}
                </button>
              </>
            )}
            {mode === 'forgot' && (
              <>
                {tl({ ru: 'Вспомнили пароль?', kk: 'Құпия сөз еске түсті ме?' })}{' '}
                <button type="button" className="font-semibold text-primary underline-offset-2 hover:underline" onClick={() => switchMode('login')}>
                  {tl({ ru: 'Войти', kk: 'Кіру' })}
                </button>
              </>
            )}
          </p>
        </main>
      </div>
    </div>
  )
}
