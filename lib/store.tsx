'use client'

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react'
import { dict, type DictKey, type L, type Lang } from './i18n'
import {
  seedInstructors, seedMessages, seedNotices, seedQuestions, seedReviews, seedSchool,
  seedStudents, seedTheory,
  type Booking, type Category, type DocFile, type DocKey, type Instructor, type Message,
  type Notice, type Question, type Review, type School, type Student, type TestResult, type TheoryTopic,
} from './data'
import { clearSession, loadSession, loginAccount, registerAccount, type Session } from './auth'
import { loadPersisted, onPersistedChange, savePersisted } from './persist'
import { isSupabaseConfigured, loadSharedFromCloud, saveSharedToCloud } from './sync'

const uid = () => Math.random().toString(36).slice(2, 10)
const nowTime = () => new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
const nowStamp = () => new Date().toISOString().slice(0, 16).replace('T', ' ')

type Store = {
  ready: boolean
  session: Session | null
  login: (phone: string, password: string) => { ok: true } | { ok: false; error: string }
  register: (fullName: string, phone: string, password: string) => { ok: true } | { ok: false; error: string }
  logout: () => void
  lang: Lang
  setLang: (l: Lang) => void
  t: (k: DictKey) => string
  tl: (v: L) => string
  students: Student[]
  me: Student
  setCategory: (c: Category) => void
  setDoc: (key: DocKey, file: DocFile | null) => void
  submitDocs: () => void
  approveStudent: (id: string, readyDate: string) => void
  rejectStudent: (id: string) => void
  school: School
  setSchool: (s: School) => void
  theory: TheoryTopic[]
  setTheory: (t: TheoryTopic[]) => void
  questions: Question[]
  setQuestions: (q: Question[]) => void
  instructors: Instructor[]
  setInstructors: (i: Instructor[]) => void
  reviews: Review[]
  setReviews: (r: Review[]) => void
  addReview: (r: Omit<Review, 'id' | 'date' | 'visible'>) => void
  messages: Message[]
  sendMessage: (thread: string, text: string) => void
  notices: Notice[]
  markNoticesRead: () => void
  broadcastNotice: (title: L, body: L) => void
  bookings: Booking[]
  addBooking: (b: Omit<Booking, 'id'>) => void
  cancelBooking: (id: string) => void
  results: TestResult[]
  addResult: (score: number, total: number) => void
  learnedSigns: string[]
  toggleSign: (id: string, known: boolean) => void
}

const StoreContext = createContext<Store | null>(null)

function ensureTheoryContent(list: TheoryTopic[]): TheoryTopic[] {
  return list.map((t) => {
    if (Array.isArray((t as TheoryTopic).content) && (t as TheoryTopic).content!.length > 0) return t as TheoryTopic
    const seed = seedTheory.find((s) => s.id === t.id)
    return { ...t, content: (seed as TheoryTopic | undefined)?.content ?? [] } as TheoryTopic
  })
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [lang, setLang] = useState<Lang>('ru')
  const [students, setStudents] = useState(seedStudents)
  const [school, setSchool] = useState(seedSchool)
  const [theory, setTheory] = useState(seedTheory as TheoryTopic[])
  const [questions, setQuestions] = useState(seedQuestions)
  const [instructors, setInstructors] = useState(seedInstructors)
  const [reviews, setReviews] = useState(seedReviews)
  const [messages, setMessages] = useState(seedMessages)
  const [notices, setNotices] = useState(seedNotices)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [results, setResults] = useState<TestResult[]>([])
  const [learnedSigns, setLearnedSigns] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    setSession(loadSession())
    const p = loadPersisted()
    if (p) {
      if (Array.isArray(p.students)) setStudents(p.students as Student[])
      if (p.school) setSchool({ ...seedSchool, ...(p.school as School), branches: (p.school as School).branches?.length ? (p.school as School).branches : seedSchool.branches, instagram: (p.school as School).instagram ?? seedSchool.instagram, website: (p.school as School).website ?? seedSchool.website, phoneEnrollment: (p.school as School).phoneEnrollment ?? seedSchool.phoneEnrollment, phoneSupport: (p.school as School).phoneSupport ?? seedSchool.phoneSupport })
      if (Array.isArray(p.theory)) setTheory(ensureTheoryContent(p.theory as TheoryTopic[]))
      if (Array.isArray(p.questions)) setQuestions(p.questions as Question[])
      if (Array.isArray(p.instructors))
        setInstructors(
          (p.instructors as Instructor[]).map((i) => ({
            ...i,
            phone: typeof i.phone === 'string' ? i.phone : '',
          })),
        )
      if (Array.isArray(p.reviews)) setReviews(p.reviews as Review[])
      if (Array.isArray(p.messages)) setMessages(p.messages as Message[])
      if (Array.isArray(p.notices)) setNotices(p.notices as Notice[])
      if (Array.isArray(p.bookings)) setBookings(p.bookings as Booking[])
      if (Array.isArray(p.results)) setResults(p.results as TestResult[])
      if (Array.isArray(p.learnedSigns)) setLearnedSigns(p.learnedSigns as string[])
    }

    // Overlay shared data from Supabase when configured (wins over local for school / instructors / notices)
    ;(async () => {
      if (!isSupabaseConfigured) {
        if (!cancelled) setReady(true)
        return
      }
      const cloud = await loadSharedFromCloud()
      if (cancelled) return
      if (cloud?.school?.name) {
        setSchool({
          ...seedSchool,
          ...cloud.school,
          branches: cloud.school.branches?.length ? cloud.school.branches : seedSchool.branches,
          instagram: cloud.school.instagram ?? seedSchool.instagram,
          website: cloud.school.website ?? seedSchool.website,
          phoneEnrollment: cloud.school.phoneEnrollment ?? seedSchool.phoneEnrollment,
          phoneSupport: cloud.school.phoneSupport ?? seedSchool.phoneSupport,
        })
      }
      if (cloud?.instructors?.length) {
        setInstructors(
          cloud.instructors.map((i) => ({
            ...i,
            phone: typeof i.phone === 'string' ? i.phone : '',
          })),
        )
      }
      if (cloud?.notices?.length) {
        setNotices(cloud.notices)
      }
      setReady(true)
    })()

    const unsub = onPersistedChange((data) => {
      if (Array.isArray(data.theory)) setTheory(ensureTheoryContent(data.theory as TheoryTopic[]))
      if (Array.isArray(data.questions)) setQuestions(data.questions as Question[])
      if (Array.isArray(data.students)) setStudents(data.students as Student[])
      if (data.school) setSchool(data.school as School)
      if (Array.isArray(data.instructors))
        setInstructors(
          (data.instructors as Instructor[]).map((i) => ({
            ...i,
            phone: typeof i.phone === 'string' ? i.phone : '',
          })),
        )
      if (Array.isArray(data.reviews)) setReviews(data.reviews as Review[])
      if (Array.isArray(data.messages)) setMessages(data.messages as Message[])
      if (Array.isArray(data.notices)) setNotices(data.notices as Notice[])
      if (Array.isArray(data.bookings)) setBookings(data.bookings as Booking[])
      if (Array.isArray(data.results)) setResults(data.results as TestResult[])
      if (Array.isArray(data.learnedSigns)) setLearnedSigns(data.learnedSigns as string[])
    })

    return () => {
      cancelled = true
      unsub()
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    savePersisted({ students, school, theory, questions, instructors, reviews, messages, notices, bookings, results, learnedSigns })
  }, [ready, students, school, theory, questions, instructors, reviews, messages, notices, bookings, results, learnedSigns])

  // Debounced push of shared slices to Supabase
  useEffect(() => {
    if (!ready || !isSupabaseConfigured) return
    const t = setTimeout(() => {
      void saveSharedToCloud({ school, instructors, notices })
    }, 800)
    return () => clearTimeout(t)
  }, [ready, school, instructors, notices])

  const updateStudent = useCallback((id: string, patch: (s: Student) => Student) => {
    setStudents((list) => list.map((s) => (s.id === id ? patch(s) : s)))
  }, [])

  const pushNotice = useCallback((n: Omit<Notice, 'id' | 'time' | 'read'>) => {
    setNotices((list) => [{ ...n, id: uid(), time: nowStamp(), read: false }, ...list])
  }, [])

  const login = useCallback((phone: string, password: string) => {
    const res = loginAccount(phone, password)
    if (!res.ok) return res
    setSession(res.session)
    setStudents((list) => {
      if (list.some((s) => s.phone === res.session.phone || s.id === res.session.accountId)) return list
      const me: Student = {
        id: res.session.accountId, name: res.session.fullName, phone: res.session.phone, category: 'B',
        docs: { idFront: null, idBack: null, psycho: null, narco: null }, status: 'draft', readyDate: null, submittedAt: null,
      }
      return [me, ...list.filter((s) => s.id !== 'me')]
    })
    return { ok: true as const }
  }, [])

  const register = useCallback((fullName: string, phone: string, password: string) => {
    const res = registerAccount(fullName, phone, password)
    if (!res.ok) return res
    setSession(res.session)
    const me: Student = {
      id: res.session.accountId, name: res.session.fullName, phone: res.session.phone, category: 'B',
      docs: { idFront: null, idBack: null, psycho: null, narco: null }, status: 'draft', readyDate: null, submittedAt: null,
    }
    setStudents((list) => [me, ...list.filter((s) => s.id !== 'me' && s.id !== me.id)])
    setResults([])
    setBookings([])
    setLearnedSigns([])
    return { ok: true as const }
  }, [])

  const logout = useCallback(() => { clearSession(); setSession(null) }, [])

  const value = useMemo<Store>(() => {
    const meId = session?.accountId ?? 'me'
    const me = students.find((s) => s.id === meId) || students.find((s) => s.phone === session?.phone) || students[0] || seedStudents[0]
    return {
      ready, session, login, register, logout, lang, setLang,
      t: (k) => dict[lang][k] ?? k, tl: (v) => v[lang] || v.ru, students, me,
      setCategory: (c) => updateStudent(me.id, (s) => ({ ...s, category: c })),
      setDoc: (key, file) => updateStudent(me.id, (s) => ({ ...s, docs: { ...s.docs, [key]: file }, status: s.status === 'approved' ? s.status : 'draft' })),
      submitDocs: () => {
        updateStudent(me.id, (s) => ({ ...s, status: 'pending', submittedAt: new Date().toISOString().slice(0, 10) }))
        pushNotice({ kind: 'docs', title: { ru: 'Документы отправлены', kk: 'Құжаттар жіберілді' }, body: { ru: 'Ожидайте подтверждения администратора.', kk: 'Әкімшінің растауын күтіңіз.' } })
      },
      approveStudent: (id, readyDate) => {
        updateStudent(id, (s) => ({ ...s, status: 'approved', readyDate }))
        if (id === me.id) pushNotice({ kind: 'docs', title: { ru: 'Документы подтверждены', kk: 'Құжаттар расталды' }, body: { ru: `Удостоверение будет готово ${new Date(readyDate).toLocaleDateString('ru-RU')}.`, kk: `Куәлік ${new Date(readyDate).toLocaleDateString('ru-RU')} дайын болады.` } })
      },
      rejectStudent: (id) => {
        updateStudent(id, (s) => ({ ...s, status: 'rejected', readyDate: null }))
        if (id === me.id) pushNotice({ kind: 'docs', title: { ru: 'Документы отклонены', kk: 'Құжаттар қабылданбады' }, body: { ru: 'Пожалуйста, загрузите документы повторно.', kk: 'Құжаттарды қайта жүктеңіз.' } })
      },
      school, setSchool, theory, setTheory, questions, setQuestions, instructors, setInstructors, reviews, setReviews,
      addReview: (r) => setReviews((list) => [{ ...r, id: uid(), date: new Date().toISOString().slice(0, 10), visible: false }, ...list]),
      messages,
      sendMessage: (thread, text) => {
        setMessages((list) => [...list, { id: uid(), thread, fromMe: true, text, time: nowTime() }])
        setTimeout(() => {
          const reply = lang === 'kk' ? 'Хабарламаңыз үшін рахмет! Жақын арада жауап береміз.' : 'Спасибо за сообщение! Мы скоро ответим.'
          setMessages((list) => [...list, { id: uid(), thread, fromMe: false, text: reply, time: nowTime() }])
        }, 1200)
      },
      notices, markNoticesRead: () => setNotices((list) => list.map((n) => ({ ...n, read: true }))),
      broadcastNotice: (title, body) => pushNotice({ kind: 'announce', title, body }),
      bookings,
      addBooking: (b) => {
        setBookings((list) => [...list, { ...b, id: uid() }])
        const date = new Date(b.date).toLocaleDateString('ru-RU')
        pushNotice({ kind: 'lesson', title: { ru: 'Занятие забронировано', kk: 'Сабаққа жазылдыңыз' }, body: { ru: `${date} в ${b.time}. Напомним за 2 часа.`, kk: `${date}, ${b.time}. 2 сағат бұрын еске саламыз.` } })
      },
      cancelBooking: (id) => setBookings((list) => list.filter((b) => b.id !== id)),
      results,
      addResult: (score, total) => setResults((list) => [...list, { id: uid(), date: new Date().toISOString().slice(0, 10), score, total }]),
      learnedSigns,
      toggleSign: (id, known) => setLearnedSigns((list) => (known ? Array.from(new Set([...list, id])) : list.filter((x) => x !== id))),
    }
  }, [ready, session, login, register, logout, lang, students, school, theory, questions, instructors, reviews, messages, notices, bookings, results, learnedSigns, updateStudent, pushNotice])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
