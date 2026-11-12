'use client'

import { useEffect, useState } from 'react'
import { Eye, EyeOff, KeyRound, LogIn, UserPlus, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LangToggle } from '@/components/shared/lang-toggle'
import { useStore } from '@/lib/store'
import { resetPasswordByPhone } from '@/lib/auth'
import { getApprovedCredentialsByPhone, submitRegistrationRequest } from '@/lib/registration-requests'

type Mode = 'login' | 'forgot' | 'request'

export function AuthScreen({ onGuest }: { onGuest?: () => void } = {}) {
  const { login, loginAsGuest, lang, t, tl } = useStore()
  const [mode, setMode] = useState<Mode>('login')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [reqCategory, setReqCategory] = useState('')
  const [reqBranch, setReqBranch] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  /** Shown when this phone has an approved registration with a temp password */
  const [approvedInfo, setApprovedInfo] = useState<{ phone: string; tempPassword: string } | null>(null)

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

  // After admin approves: show phone + temp password on login when this number is entered
  useEffect(() => {
    if (mode !== 'login' && mode !== 'forgot') {
      setApprovedInfo(null)
      return
    }
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10) {
      setApprovedInfo(null)
      return
    }
    let cancelled = false
    const t = setTimeout(() => {
      void getApprovedCredentialsByPhone(phone).then((cred) => {
        if (cancelled) return
        if (cred) {
          setApprovedInfo({ phone: cred.phone, tempPassword: cred.tempPassword })
          if (!password) setPassword(cred.tempPassword)
        } else {
          setApprovedInfo(null)
        }
      })
    }, 500)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [phone, mode])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setBusy(true)
    try {
      if (mode === 'forgot') {
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
      } else if (mode === 'request') {
        const res = await submitRegistrationRequest({
          fullName,
          phone,
          category: reqCategory || null,
          branch: reqBranch || null,
        })
        if (!res.ok) {
          setError(
            res.error === 'exists'
              ? tl({ ru: 'Заявка с этим номером уже отправлена', kk: 'Бұл нөмірмен өтініш жіберілген' })
              : res.error === 'timeout'
                ? tl({ ru: 'Сервер не отвечает. Проверьте интернет и попробуйте ещё раз.', kk: 'Сервер жауап бермейді. Интернетті тексеріп, қайталап көріңіз.' })
                : tl({ ru: 'Не удалось отправить заявку. Попробуйте ещё раз.', kk: 'Өтініш жіберілмеді. Қайталап көріңіз.' }),
          )
          return
        }
        setSuccess(
          tl({
            ru: 'Ваша заявка отправлена! Администратор проверит данные и активирует ваш доступ. Вы также можете связаться с нами напрямую: 87083425171',
            kk: 'Өтінішіңіз жіберілді! Әкімші деректерді тексеріп, қолжетімділікті іске қосады. Тікелей хабарласуға болады: 87083425171',
          }),
        )
        setFullName('')
        setPhone('')
        setReqCategory('')
        setReqBranch('')
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
        <header className="app-safe-header flex shrink-0 items-center justify-between gap-2 bg-primary px-4 pb-3 text-primary-foreground">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center overflow-hidden rounded-xl bg-primary-foreground">
              <img src="/icon-192.png" alt="AvtoEmir" className="size-9 object-cover" />
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
              {mode === 'forgot' && tl({ ru: 'Восстановление пароля', kk: 'Құпия сөзді қалпына келтіру' })}
              {mode === 'request' && tl({ ru: 'Заявка на регистрацию', kk: 'Тіркелу өтініші' })}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {mode === 'login' &&
                tl({ ru: 'Войдите, чтобы продолжить обучение и тесты', kk: 'Оқу мен тесттерді жалғастыру үшін кіріңіз' })}
              {mode === 'forgot' &&
                tl({
                  ru: 'Введите номер телефона и новый пароль — пароль сменится сразу',
                  kk: 'Телефон нөмірі мен жаңа құпия сөзді енгізіңіз — құпия сөз бірден өзгереді',
                })}
              {mode === 'request' &&
                tl({
                  ru: 'Заполните данные — администратор проверит и активирует доступ',
                  kk: 'Деректерді толтырыңыз — әкімші тексеріп, қолжетімділікті іске қосады',
                })}
            </p>
          </div>

          {mode === 'login' && (
            <div className="mb-5 rounded-xl border border-primary/20 bg-accent/40 p-3.5 text-sm leading-relaxed text-foreground">
              <p>
                {lang === 'kk'
                  ? 'Егер сіз «Авто-Эмир» автомектебінің оқушысы болсаңыз, кіру үшін телефон нөміріңізді енгізіңіз. Егер тіркелмеген болсаңыз, әкімшіге хабарласыңыз: '
                  : 'Если вы ученик автошколы «Авто-Эмир», введите свой номер телефона для входа. Если вы еще не зарегистрированы или вашего номера нет в системе, обратитесь к администратору: '}
                <a
                  href="tel:87083425171"
                  className="font-semibold text-primary underline-offset-2 hover:underline"
                >
                  87083425171
                </a>
              </p>
            </div>
          )}

          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            {mode === 'request' && (
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
            {mode === 'request' && (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {tl({ ru: 'Категория (необязательно)', kk: 'Санат (міндетті емес)' })}
                  </span>
                  <select
                    value={reqCategory}
                    onChange={(e) => setReqCategory(e.target.value)}
                    className="h-11 rounded-xl border bg-card px-3 text-sm outline-none ring-primary focus:ring-2"
                  >
                    <option value="">{tl({ ru: 'Не выбрано', kk: 'Таңдалмаған' })}</option>
                    <option value="B">B</option>
                    <option value="B1">B1</option>
                    <option value="C">C</option>
                    <option value="C1">C1</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {tl({ ru: 'Филиал (необязательно)', kk: 'Филиал (міндетті емес)' })}
                  </span>
                  <input
                    value={reqBranch}
                    onChange={(e) => setReqBranch(e.target.value)}
                    placeholder={tl({ ru: 'Туркестан / Карнак', kk: 'Түркістан / Қарнақ' })}
                    className="h-11 rounded-xl border bg-card px-3 text-sm outline-none ring-primary focus:ring-2"
                  />
                </label>
              </>
            )}
            {(mode === 'login' || mode === 'forgot') && (
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
            {approvedInfo && mode === 'login' && (
              <div className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-foreground" role="status">
                <p className="font-semibold text-success">
                  {tl({ ru: 'Заявка одобрена', kk: 'Өтініш мақұлданды' })}
                </p>
                <p className="mt-1">
                  {tl({
                    ru: `Ранее отправленная заявка с номером ${approvedInfo.phone} принята.`,
                    kk: `${approvedInfo.phone} нөмірімен жіберілген өтініш қабылданды.`,
                  })}
                </p>
                <p className="mt-1">
                  {tl({ ru: 'Ваш временный пароль:', kk: 'Уақытша құпия сөзіңіз:' })}{' '}
                  <code className="rounded bg-card px-1.5 py-0.5 font-bold tracking-wide">{approvedInfo.tempPassword}</code>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {tl({
                    ru: 'Можете войти с этим паролем или нажать «Забыли пароль?» и задать свой.',
                    kk: 'Осы құпия сөзбен кіруге немесе «Құпия сөзді ұмыттыңыз ба?» арқылы өз құпия сөзіңізді қоюға болады.',
                  })}
                </p>
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
              {mode === 'forgot' && (
                <>
                  <KeyRound className="size-4" aria-hidden="true" />
                  {tl({ ru: 'Сохранить новый пароль', kk: 'Жаңа құпия сөзді сақтау' })}
                </>
              )}
              {mode === 'request' && (
                <>
                  <UserPlus className="size-4" aria-hidden="true" />
                  {tl({ ru: 'Отправить заявку', kk: 'Өтініш жіберу' })}
                </>
              )}
            </Button>
            {mode === 'login' && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full border-primary/40 text-primary hover:bg-primary/10"
                onClick={() => switchMode('request')}
              >
                <UserPlus className="size-4" aria-hidden="true" />
                {tl({ ru: 'Подать заявку на регистрацию', kk: 'Тіркелуге өтініш беру' })}
              </Button>
            )}
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
                    onGuest?.()
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
            {mode === 'forgot' && (
              <>
                {tl({ ru: 'Вспомнили пароль?', kk: 'Құпия сөз еске түсті ме?' })}{' '}
                <button type="button" className="font-semibold text-primary underline-offset-2 hover:underline" onClick={() => switchMode('login')}>
                  {tl({ ru: 'Войти', kk: 'Кіру' })}
                </button>
              </>
            )}
            {mode === 'request' && (
              <>
                {tl({ ru: 'Уже есть аккаунт?', kk: 'Аккаунт бар ма?' })}{' '}
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
