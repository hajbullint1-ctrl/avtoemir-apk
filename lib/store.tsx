'use client'

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react'
import { dict, type DictKey, type L, type Lang } from './i18n'
import {
  seedInstructors, seedMessages, seedNotices, seedQuestions, seedReviews, seedSchool,
  seedStudents, seedTheory, seedRoadSigns,
  type Booking, type Category, type DocFile, type DocKey, type Instructor, type Message,
  type Notice, type Question, type Review, type School, type Student, type TestResult, type TheoryTopic, type RoadSign,
} from './data'
import {
  clearSession,
  listAccounts,
  listPasswordRecoveryRequests,
  loadSession,
  loginAccount,
  mergeAccountsFromCloud,
  mergeRecoveryFromCloud,
  registerAccount,
  setAccountsCloudHooks,
  type Session,
} from './auth'
import { loadPersisted, onPersistedChange, savePersisted } from './persist'
import { isSupabaseConfigured, loadSharedFromCloud, saveSharedKey, saveSharedToCloud } from './sync'
import { syncCertificateWidget } from './certificate-widget'
import {
  fetchProfiles,
  fetchTheoryProgress,
  upsertProfile,
  upsertTheoryProgress,
  type ProfileRow,
} from './cloud-features'

function mergeProfiles(local: ProfileRow[], remote: ProfileRow[]): ProfileRow[] {
  const map = new Map(local.map((p) => [p.id, p]))
  for (const r of remote) {
    if (!r?.id) continue
    const prev = map.get(r.id)
    map.set(r.id, {
      id: r.id,
      full_name: (r.full_name || prev?.full_name || '').trim(),
      phone: r.phone || prev?.phone || '',
    })
  }
  return [...map.values()]
}

function mergeProgress(
  local: Record<string, string[]>,
  extra: Record<string, string[]> | { student_id: string; lesson_id: string }[],
): Record<string, string[]> {
  const out: Record<string, Set<string>> = {}
  for (const [k, ids] of Object.entries(local)) out[k] = new Set(ids)
  if (Array.isArray(extra)) {
    for (const r of extra) {
      if (!r?.student_id || !r.lesson_id) continue
      if (!out[r.student_id]) out[r.student_id] = new Set()
      out[r.student_id].add(r.lesson_id)
    }
  } else {
    for (const [k, ids] of Object.entries(extra || {})) {
      if (!out[k]) out[k] = new Set()
      for (const id of ids || []) out[k].add(id)
    }
  }
  return Object.fromEntries([...Object.entries(out)].map(([k, v]) => [k, [...v]]))
}

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
  /** Clear uploaded files so the student can submit them again */
  resetStudentDocs: (id: string) => void
  school: School
  setSchool: (s: School) => void
  theory: TheoryTopic[]
  setTheory: (t: TheoryTopic[]) => void
  /** Supabase profiles (id → full_name), plus local mirror */
  profiles: ProfileRow[]
  /** Completed theory lesson ids, keyed by student account id */
  theoryProgress: Record<string, string[]>
  completeLesson: (lessonId: string) => void
  questions: Question[]
  setQuestions: (q: Question[]) => void
  instructors: Instructor[]
  setInstructors: (i: Instructor[]) => void
  reviews: Review[]
  setReviews: (r: Review[]) => void
  addReview: (r: Omit<Review, 'id' | 'date' | 'visible'>) => void
  messages: Message[]
  sendMessage: (thread: string, text: string) => void
  /** Admin reply: appears on student side as school message (fromMe: false) */
  replyAsAdmin: (thread: string, text: string, meta?: { studentId?: string; authorName?: string }) => void
  deleteMessage: (id: string) => void
  /** Drop one student's admin thread, or an entire instructor thread when studentId is omitted */
  deleteChat: (thread: string, studentId?: string) => void
  notices: Notice[]
  markNoticesRead: () => void
  broadcastNotice: (title: L, body: L) => void
  deleteNotice: (id: string) => void
  bookings: Booking[]
  addBooking: (b: Omit<Booking, 'id'>) => void
  cancelBooking: (id: string) => void
  results: TestResult[]
  addResult: (score: number, total: number) => void
  learnedSigns: string[]
  toggleSign: (id: string, known: boolean) => void
  roadSigns: RoadSign[]
  setRoadSigns: (s: RoadSign[]) => void
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
  const [roadSigns, setRoadSigns] = useState<RoadSign[]>(seedRoadSigns)
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [theoryProgress, setTheoryProgress] = useState<Record<string, string[]>>({})

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
      if (Array.isArray(p.roadSigns)) setRoadSigns(p.roadSigns as RoadSign[])
      if (Array.isArray(p.profiles)) setProfiles(p.profiles as ProfileRow[])
      if (p.theoryProgress && typeof p.theoryProgress === 'object') setTheoryProgress(p.theoryProgress as Record<string, string[]>)
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
      if (cloud?.students?.length) setStudents(cloud.students)
      if (cloud?.theory?.length) setTheory(ensureTheoryContent(cloud.theory))
      if (cloud?.questions?.length) setQuestions(cloud.questions)
      if (cloud?.reviews) setReviews(cloud.reviews)
      if (cloud?.messages) setMessages(cloud.messages)
      if (cloud?.bookings) setBookings(cloud.bookings)
      if (cloud?.accounts?.length) mergeAccountsFromCloud(cloud.accounts)
      if (cloud?.recovery?.length) mergeRecoveryFromCloud(cloud.recovery)
      if (cloud?.results) setResults(cloud.results)
      if (cloud?.learnedSigns) setLearnedSigns(cloud.learnedSigns)
      if (Array.isArray(cloud?.roadSigns) && cloud.roadSigns.length) setRoadSigns(cloud.roadSigns)
      if (Array.isArray(cloud?.profiles)) setProfiles(cloud.profiles)
      if (cloud?.theoryProgress && typeof cloud.theoryProgress === 'object') setTheoryProgress(cloud.theoryProgress)
      const tableProfiles = await fetchProfiles()
      if (!cancelled && tableProfiles.length) setProfiles((prev) => mergeProfiles(prev, tableProfiles))
      const progressRows = await fetchTheoryProgress()
      if (!cancelled && progressRows.length) setTheoryProgress((prev) => mergeProgress(prev, progressRows))
      const sess = loadSession()
      if (sess?.accountId && sess.fullName) {
        void upsertProfile({ id: sess.accountId, full_name: sess.fullName, phone: sess.phone })
      }
      // Push local accounts up if cloud was empty (first device bootstrap)
      const localAccounts = listAccounts()
      if (localAccounts.length && (!cloud?.accounts || cloud.accounts.length === 0)) {
        void saveSharedKey('accounts', localAccounts)
      }
      const localRecovery = listPasswordRecoveryRequests()
      if (localRecovery.length && (!cloud?.recovery || cloud.recovery.length === 0)) {
        void saveSharedKey('recovery', localRecovery)
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
      if (Array.isArray(data.roadSigns)) setRoadSigns(data.roadSigns as RoadSign[])
      if (Array.isArray(data.profiles)) setProfiles(data.profiles as ProfileRow[])
      if (data.theoryProgress && typeof data.theoryProgress === 'object') setTheoryProgress(data.theoryProgress as Record<string, string[]>)
    })

    return () => {
      cancelled = true
      unsub()
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    savePersisted({ students, school, theory, questions, instructors, reviews, messages, notices, bookings, results, learnedSigns, profiles, theoryProgress, roadSigns })
  }, [ready, students, school, theory, questions, instructors, reviews, messages, notices, bookings, results, learnedSigns, profiles, theoryProgress, roadSigns])

  // Register cloud push for accounts / recovery (auth.ts calls these on change)
  useEffect(() => {
    if (!isSupabaseConfigured) return
    let accTimer: ReturnType<typeof setTimeout> | null = null
    let recTimer: ReturnType<typeof setTimeout> | null = null
    setAccountsCloudHooks({
      onAccounts: (list) => {
        if (accTimer) clearTimeout(accTimer)
        accTimer = setTimeout(() => {
          void saveSharedKey('accounts', list)
        }, 600)
      },
      onRecovery: (list) => {
        if (recTimer) clearTimeout(recTimer)
        recTimer = setTimeout(() => {
          void saveSharedKey('recovery', list)
        }, 600)
      },
    })
    return () => {
      setAccountsCloudHooks({})
      if (accTimer) clearTimeout(accTimer)
      if (recTimer) clearTimeout(recTimer)
    }
  }, [])

  // Debounced push of all admin-managed slices to Supabase
  useEffect(() => {
    if (!ready || !isSupabaseConfigured) return
    const t = setTimeout(() => {
      void saveSharedToCloud({
        school,
        instructors,
        notices,
        students,
        theory,
        questions,
        reviews,
        messages,
        bookings,
        accounts: listAccounts(),
        recovery: listPasswordRecoveryRequests(),
        results,
        learnedSigns,
        profiles,
        theoryProgress,
        roadSigns,
      })
    }, 800)
    return () => clearTimeout(t)
  }, [ready, school, instructors, notices, students, theory, questions, reviews, messages, bookings, results, learnedSigns, profiles, theoryProgress, roadSigns])

  // Periodic pull from cloud so admin changes appear on student devices
  useEffect(() => {
    if (!ready || !isSupabaseConfigured) return
    const pull = async () => {
      const cloud = await loadSharedFromCloud()
      if (!cloud) return
      if (cloud.notices) setNotices(cloud.notices)
      if (cloud.messages) setMessages(cloud.messages)
      if (cloud.instructors?.length) {
        setInstructors(cloud.instructors.map((i) => ({ ...i, phone: typeof i.phone === 'string' ? i.phone : '' })))
      }
      if (cloud.school?.name) {
        setSchool((prev) => ({ ...prev, ...cloud.school! }))
      }
      if (cloud.students?.length) setStudents(cloud.students)
      if (cloud.accounts?.length) mergeAccountsFromCloud(cloud.accounts)
      if (cloud.recovery?.length) mergeRecoveryFromCloud(cloud.recovery)
      if (cloud.bookings) setBookings(cloud.bookings)
      if (cloud.theory?.length) setTheory(ensureTheoryContent(cloud.theory))
      if (cloud.questions?.length) setQuestions(cloud.questions)
      if (cloud.reviews) setReviews(cloud.reviews)
      if (Array.isArray(cloud.profiles)) setProfiles((prev) => mergeProfiles(prev, cloud.profiles!))
      if (cloud.theoryProgress) setTheoryProgress((prev) => mergeProgress(prev, cloud.theoryProgress!))
      if (Array.isArray(cloud.roadSigns) && cloud.roadSigns.length) setRoadSigns(cloud.roadSigns)
      const tableProfiles = await fetchProfiles()
      if (tableProfiles.length) setProfiles((prev) => mergeProfiles(prev, tableProfiles))
      const progressRows = await fetchTheoryProgress()
      if (progressRows.length) setTheoryProgress((prev) => mergeProgress(prev, progressRows))
    }
    const id = setInterval(pull, 15000)
    return () => clearInterval(id)
  }, [ready])

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
    void upsertProfile({ id: res.session.accountId, full_name: res.session.fullName, phone: res.session.phone })
    setProfiles((prev) => mergeProfiles(prev, [{ id: res.session.accountId, full_name: res.session.fullName, phone: res.session.phone }]))
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
    void upsertProfile({ id: res.session.accountId, full_name: res.session.fullName, phone: res.session.phone })
    setProfiles((prev) => mergeProfiles(prev, [{ id: res.session.accountId, full_name: res.session.fullName, phone: res.session.phone }]))
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
    const phoneNorm = (p: string) => p.replace(/[^\d+]/g, '').replace(/^8/, '+7')
    const byId = students.find((s) => s.id === meId)
    const byPhone = session?.phone
      ? students.find((s) => phoneNorm(s.phone) === phoneNorm(session.phone))
      : undefined
    // Prefer logged-in account; never show another student's card as "me"
    let me: Student =
      byId ||
      byPhone ||
      (session
        ? {
            id: session.accountId,
            name: session.fullName,
            phone: session.phone,
            category: 'B' as const,
            docs: { idFront: null, idBack: null, psycho: null, narco: null },
            status: 'draft' as const,
            readyDate: null,
            submittedAt: null,
          }
        : students[0] || seedStudents[0])
    if (session && (byId || byPhone) && me.name !== session.fullName) {
      me = { ...me, name: session.fullName }
    }
    return {
      ready, session, login, register, logout, lang, setLang,
      t: (k) => dict[lang][k] ?? k, tl: (v) => v[lang] || v.ru, students, me,
      setCategory: (c) => updateStudent(me.id, (s) => ({ ...s, category: c })),
      setDoc: (key, file) => updateStudent(me.id, (s) => ({ ...s, docs: { ...s.docs, [key]: file }, status: s.status === 'approved' ? 'approved' : 'draft' })),
      submitDocs: () => updateStudent(me.id, (s) => ({ ...s, status: 'pending', submittedAt: nowStamp() })),
      approveStudent: (id, readyDate) => updateStudent(id, (s) => ({ ...s, status: 'approved', readyDate })),
      rejectStudent: (id) => updateStudent(id, (s) => ({ ...s, status: 'rejected' })),
      resetStudentDocs: (id) =>
        updateStudent(id, (s) => ({
          ...s,
          docs: { idFront: null, idBack: null, psycho: null, narco: null },
          status: 'draft',
          readyDate: null,
          submittedAt: null,
        })),
      school, setSchool, theory, setTheory, profiles, theoryProgress,
      completeLesson: (lessonId) => {
        const sid = me.id
        setTheoryProgress((prev) => {
          const cur = new Set(prev[sid] ?? [])
          cur.add(lessonId)
          return { ...prev, [sid]: [...cur] }
        })
        void upsertTheoryProgress(sid, lessonId)
      },
      questions, setQuestions, instructors, setInstructors, reviews, setReviews,
      addReview: (r) => setReviews((list) => [{ ...r, id: uid(), date: nowStamp().slice(0, 10), visible: true }, ...list]),
      messages, sendMessage: (thread, text) => setMessages((list) => [...list, { id: uid(), thread, fromMe: true, text, time: nowTime(), studentId: me.id, authorName: me.name }]),
      replyAsAdmin: (thread, text, meta) => setMessages((list) => [...list, { id: uid(), thread, fromMe: false, text, time: nowTime(), studentId: meta?.studentId, authorName: meta?.authorName || 'AvtoEmir' }]),
      deleteMessage: (id) => setMessages((list) => list.filter((m) => m.id !== id)),
      deleteChat: (thread, studentId) => setMessages((list) => list.filter((m) => !(m.thread === thread && (studentId == null || m.studentId === studentId)))),
      notices, markNoticesRead: () => setNotices((list) => list.map((n) => ({ ...n, read: true }))),
      broadcastNotice: (title, body) => pushNotice({ kind: 'announce', title, body }),
      deleteNotice: (id) => setNotices((list) => list.filter((n) => n.id !== id)),
      bookings, addBooking: (b) => setBookings((list) => [...list, { ...b, id: uid() }]),
      cancelBooking: (id) => setBookings((list) => list.filter((b) => b.id !== id)),
      results, addResult: (score, total) => setResults((list) => [{ id: uid(), date: nowStamp(), score, total }, ...list]),
      learnedSigns, toggleSign: (id, known) => setLearnedSigns((list) => (known ? Array.from(new Set([...list, id])) : list.filter((x) => x !== id))),
      roadSigns,
      setRoadSigns,
    }
  }, [ready, session, login, register, logout, lang, students, school, theory, profiles, theoryProgress, questions, instructors, reviews, messages, notices, bookings, results, learnedSigns, roadSigns, updateStudent, pushNotice])
  // replyAsAdmin / sendMessage / broadcastNotice are stable enough via setState closures

  return (
    <StoreContext.Provider value={value}>
      <CertificateWidgetBridge />
      {children}
    </StoreContext.Provider>
  )
}

function CertificateWidgetBridge() {
  const { ready, session, me, school } = useStore()
  useEffect(() => {
    if (!ready) return
    void syncCertificateWidget({
      loggedIn: Boolean(session),
      fullName: me.name,
      schoolName: school.name || 'AvtoEmir',
      accountId: session?.accountId ?? me.id,
      date: me.readyDate || me.submittedAt || '',
      status: me.status,
    })
  }, [ready, session, me.id, me.name, me.status, me.readyDate, me.submittedAt, school.name])
  return null
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
