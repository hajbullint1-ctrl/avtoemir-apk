'use client'

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react'
import { dict, type DictKey, type L, type Lang } from './i18n'
import {
  seedInstructors, seedMessages, seedNotices, seedQuestions, seedReviews, seedSchool,
  seedStudents, seedTheory, seedRoadSigns,
  type Booking, type Category, type DocFile, type DocKey, type Instructor, type Message,
  type Notice, type Question, type Review, type School, type Student, type TestResult, type TheoryTopic, type RoadSign,
} from './data'
import {
  clearSession, deleteAccount, listAccounts, listPasswordRecoveryRequests, loadSession, loginAccount,
  mergeAccountsFromCloud, mergeRecoveryFromCloud, registerAccount, type Session,
} from './auth'
import { loadPersisted, savePersisted } from './persist'
import {
  isSupabaseConfigured, loadMessagesBundle, loadSharedFromCloud, saveSharedKey, saveSharedToCloud,
  mergeById, mergeStudents, mergeStringLists, mergeProgressMaps, loadSharedKeys, LIVE_KEYS,
  saveStudentsLocalWins, forceSaveResults,
} from './sync'
import { hydrateMistakes } from './mistakes'
import { upsertTheoryProgress, type ProfileRow } from './cloud-features'

const uid = () => Math.random().toString(36).slice(2, 10)
const nowTime = () => new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
const nowStamp = () => new Date().toISOString().slice(0, 16).replace('T', ' ')

function ensureTheoryContent(list: TheoryTopic[]): TheoryTopic[] {
  return list.map((t) => {
    if (Array.isArray((t as TheoryTopic).content) && (t as TheoryTopic).content!.length > 0) return t as TheoryTopic
    const seed = seedTheory.find((s) => s.id === t.id)
    return { ...t, content: (seed as TheoryTopic | undefined)?.content ?? [] } as TheoryTopic
  })
}

type Store = {
  ready: boolean
  session: Session | null
  login: (phone: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>
  register: (fullName: string, phone: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>
  logout: () => void
  deleteMyAccount: () => { ok: true } | { ok: false; error: string }
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
  resetStudentDocs: (id: string) => void
  deleteStudent: (id: string) => void
  school: School
  setSchool: (s: School) => void
  theory: TheoryTopic[]
  setTheory: (t: TheoryTopic[]) => void
  profiles: ProfileRow[]
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
  replyAsAdmin: (thread: string, text: string, meta?: { studentId?: string; authorName?: string }) => void
  deleteMessage: (id: string) => void
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
  clearResults: () => void
  learnedSigns: string[]
  toggleSign: (id: string, known: boolean) => void
  roadSigns: RoadSign[]
  setRoadSigns: (s: RoadSign[]) => void
  presence: Record<string, string>
  maintenanceMode: boolean
  setMaintenanceMode: (on: boolean) => void
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [lang, setLang] = useState<Lang>('ru')
  const [students, setStudents] = useState(seedStudents)
  const [school, setSchoolState] = useState(seedSchool)
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
  const [presence, setPresence] = useState<Record<string, string>>({})
  const [maintenanceMode, setMaintenanceModeState] = useState(false)
  const resultsIgnoreUntil = useRef(0)

  useEffect(() => {
    setSession(loadSession())
    const p = loadPersisted()
    if (p) {
      if (Array.isArray(p.students)) setStudents(p.students as Student[])
      if (p.school) setSchoolState({ ...seedSchool, ...(p.school as School) })
      if (Array.isArray(p.theory)) setTheory(ensureTheoryContent(p.theory as TheoryTopic[]))
      if (Array.isArray(p.questions)) setQuestions(p.questions as Question[])
      if (Array.isArray(p.instructors)) setInstructors(p.instructors as Instructor[])
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

    ;(async () => {
      if (!isSupabaseConfigured) {
        setReady(true)
        return
      }
      const cloud = await loadSharedFromCloud()
      if (cloud?.school?.name) {
        setSchoolState({
          ...seedSchool,
          ...cloud.school,
          website: cloud.school.website ?? '',
          instagram: cloud.school.instagram ?? '',
          branches: cloud.school.branches?.length ? cloud.school.branches : seedSchool.branches,
        })
      }
      if (cloud?.instructors?.length) setInstructors(cloud.instructors)
      if (cloud?.notices?.length) setNotices(cloud.notices)
      if (cloud?.students?.length) setStudents((prev) => mergeStudents(prev, cloud.students!, cloud.deletedStudentIds || []))
      if (cloud?.theory?.length) setTheory((prev) => ensureTheoryContent(mergeById(prev, cloud.theory!)))
      if (cloud?.questions?.length) setQuestions((prev) => mergeById(prev, cloud.questions!))
      if (Array.isArray(cloud?.roadSigns) && cloud.roadSigns.length) setRoadSigns((prev) => mergeById(prev, cloud.roadSigns!))
      if (Array.isArray(cloud?.reviews) && cloud.reviews.length) setReviews((prev) => mergeById(prev, cloud.reviews!))
      if (cloud?.messages) setMessages(cloud.messages)
      if (cloud?.bookings) setBookings((prev) => mergeById(prev, cloud.bookings!))
      if (cloud?.accounts?.length) mergeAccountsFromCloud(cloud.accounts, cloud.deletedAccountIds || [])
      if (cloud?.recovery?.length) mergeRecoveryFromCloud(cloud.recovery)
      if (Array.isArray(cloud?.results)) {
        setResults(cloud.results!.length ? mergeById([], cloud.results!) : [])
      }
      if (cloud?.learnedSigns) setLearnedSigns((prev) => mergeStringLists(prev, cloud.learnedSigns!))
      if (cloud?.theoryProgress) setTheoryProgress((prev) => mergeProgressMaps(prev, cloud.theoryProgress!))
      if (cloud?.presence) setPresence((prev) => ({ ...prev, ...cloud.presence }))
      if (typeof cloud?.maintenanceMode === 'boolean') setMaintenanceModeState(cloud.maintenanceMode)
      void hydrateMistakes()
      setReady(true)
    })()
  }, [])

  useEffect(() => {
    if (!ready) return
    savePersisted({
      students, school, theory, questions, instructors, reviews, messages, notices,
      bookings, results, learnedSigns, profiles, theoryProgress, roadSigns,
    })
  }, [ready, students, school, theory, questions, instructors, reviews, messages, notices, bookings, results, learnedSigns, profiles, theoryProgress, roadSigns])

  useEffect(() => {
    if (!ready || !isSupabaseConfigured) return
    const t = setTimeout(() => {
      void saveSharedToCloud({
        school, instructors, notices, students, theory, questions, reviews,
        bookings, accounts: listAccounts(), recovery: listPasswordRecoveryRequests(),
        learnedSigns, profiles, theoryProgress, roadSigns,
      })
    }, 1200)
    return () => clearTimeout(t)
  }, [ready, school, instructors, notices, students, theory, questions, reviews, bookings, learnedSigns, profiles, theoryProgress, roadSigns])

  useEffect(() => {
    if (!ready || !isSupabaseConfigured) return
    const tick = () => {
      void loadMessagesBundle().then((bundle) => {
        if (bundle?.messages) setMessages(bundle.messages)
      })
      void loadSharedKeys(['maintenanceMode']).then((c) => {
        if (c && typeof c.maintenanceMode === 'boolean') setMaintenanceModeState(c.maintenanceMode)
      })
    }
    const id = setInterval(tick, 2000)
    return () => clearInterval(id)
  }, [ready])

  useEffect(() => {
    if (!ready || !isSupabaseConfigured) return
    const pull = async () => {
      const cloud = await loadSharedKeys(LIVE_KEYS)
      if (!cloud) return
      if (cloud.students?.length) setStudents((prev) => mergeStudents(prev, cloud.students!, cloud.deletedStudentIds || []))
      if (cloud.notices) setNotices(cloud.notices)
      if (cloud.messages) setMessages(cloud.messages)
      if (cloud.accounts?.length) mergeAccountsFromCloud(cloud.accounts, cloud.deletedAccountIds || [])
      if (Array.isArray(cloud.results) && Date.now() > resultsIgnoreUntil.current) {
        setResults(cloud.results)
      }
      if (typeof cloud.maintenanceMode === 'boolean') setMaintenanceModeState(cloud.maintenanceMode)
    }
    const id = setInterval(pull, 15000)
    return () => clearInterval(id)
  }, [ready])

  const me = useMemo(() => {
    const id = session?.accountId
    const found = students.find((s) => s.id === id)
    if (found) return found
    return {
      id: id || 'guest',
      name: session?.fullName || '',
      phone: session?.phone || '',
      category: 'B' as const,
      docs: { idFront: null, idBack: null, psycho: null, narco: null },
      status: 'draft' as const,
      readyDate: null,
      submittedAt: null,
    }
  }, [students, session])

  const updateStudent = useCallback((id: string, fn: (s: Student) => Student) => {
    if (!id || id === 'guest') return
    setStudents((list) => {
      const idx = list.findIndex((s) => s.id === id)
      let next: Student[]
      if (idx < 0) {
        const base: Student = {
          id,
          name: session?.fullName || '',
          phone: session?.phone || '',
          category: 'B',
          docs: { idFront: null, idBack: null, psycho: null, narco: null },
          status: 'draft',
          readyDate: null,
          submittedAt: null,
        }
        next = [...list.filter((s) => s.id !== 'me'), fn(base)]
      } else {
        next = list.map((s) => (s.id === id ? fn(s) : s))
      }
      void saveStudentsLocalWins(next).then((merged) => {
        if (merged?.length) setStudents(merged as Student[])
      })
      return next
    })
  }, [session])

  const value = useMemo<Store>(() => ({
    ready,
    session,
    login: async (phone, password) => {
      const r = await loginAccount(phone, password)
      if (r.ok) {
        setSession(r.session)
        setStudents((list) => {
          if (list.some((s) => s.id === r.session.accountId)) return list
          const student: Student = {
            id: r.session.accountId,
            name: r.session.fullName,
            phone: r.session.phone,
            category: 'B',
            docs: { idFront: null, idBack: null, psycho: null, narco: null },
            status: 'draft',
            readyDate: null,
            submittedAt: null,
          }
          const next = [...list.filter((s) => s.id !== 'me'), student]
          void saveSharedKey('students', next)
          return next
        })
      }
      return r.ok ? { ok: true } : { ok: false, error: r.error }
    },
    register: async (fullName, phone, password) => {
      const r = await registerAccount(fullName, phone, password)
      if (r.ok) {
        setSession(r.session)
        const student: Student = {
          id: r.session.accountId,
          name: fullName,
          phone: r.session.phone,
          category: 'B',
          docs: { idFront: null, idBack: null, psycho: null, narco: null },
          status: 'draft',
          readyDate: null,
          submittedAt: null,
        }
        setStudents((list) => {
          const next = [...list.filter((s) => s.id !== student.id), student]
          void saveSharedKey('students', next)
          return next
        })
      }
      return r.ok ? { ok: true } : { ok: false, error: r.error }
    },
    logout: () => { clearSession(); setSession(null) },
    deleteMyAccount: () => {
      const id = session?.accountId
      if (!id) return { ok: false as const, error: 'session' }
      deleteAccount(id)
      setStudents((list) => {
        const next = list.filter((s) => s.id !== id && s.id !== 'me')
        void saveSharedKey('students', next)
        return next
      })
      void saveSharedKey('accounts', listAccounts().filter((a) => a.id !== id))
      void (async () => {
        const cloud = await loadSharedKeys(['deletedAccountIds', 'deletedStudentIds'])
        const delA = [...new Set([...(cloud?.deletedAccountIds || []), id])]
        const delS = [...new Set([...(cloud?.deletedStudentIds || []), id])]
        await saveSharedKey('deletedAccountIds', delA)
        await saveSharedKey('deletedStudentIds', delS)
      })()
      clearSession()
      setSession(null)
      return { ok: true as const }
    },
    lang,
    setLang,
    t: (k) => dict[lang][k] || k,
    tl: (v) => v[lang] || v.ru || '',
    students,
    me,
    setCategory: (c) => updateStudent(me.id, (s) => ({ ...s, category: c })),
    setDoc: (key, file) => {
      const id = session?.accountId || me.id
      if (!id || id === 'guest') return
      updateStudent(id, (s) => ({ ...s, docs: { ...s.docs, [key]: file } }))
    },
    submitDocs: () => {
      const id = session?.accountId || me.id
      if (!id || id === 'guest') return
      updateStudent(id, (s) => ({ ...s, status: 'pending' as const, submittedAt: nowStamp() }))
    },
    approveStudent: (id, readyDate) => updateStudent(id, (s) => ({ ...s, status: 'approved', readyDate })),
    rejectStudent: (id) => updateStudent(id, (s) => ({ ...s, status: 'rejected', readyDate: null })),
    resetStudentDocs: (id) =>
      updateStudent(id, (s) => ({
        ...s,
        docs: { idFront: null, idBack: null, psycho: null, narco: null },
        status: 'draft',
        submittedAt: null,
        readyDate: null,
      })),
    deleteStudent: (id) => {
      if (!id || id === 'me') return
      deleteAccount(id)
      setStudents((list) => {
        const next = list.filter((s) => s.id !== id && s.id !== 'me')
        void saveSharedKey('students', next)
        return next
      })
      void saveSharedKey('accounts', listAccounts().filter((a) => a.id !== id))
      void (async () => {
        const cloud = await loadSharedKeys(['deletedAccountIds', 'deletedStudentIds'])
        const delA = [...new Set([...(cloud?.deletedAccountIds || []), id])]
        const delS = [...new Set([...(cloud?.deletedStudentIds || []), id])]
        await saveSharedKey('deletedAccountIds', delA)
        await saveSharedKey('deletedStudentIds', delS)
      })()
    },
    school,
    setSchool: (s) => {
      setSchoolState(s)
      void saveSharedKey('school', s)
    },
    theory,
    setTheory,
    profiles,
    theoryProgress,
    completeLesson: (lessonId) => {
      const sid = me.id
      setTheoryProgress((prev) => {
        const cur = new Set(prev[sid] ?? [])
        cur.add(lessonId)
        return { ...prev, [sid]: [...cur] }
      })
      void upsertTheoryProgress(sid, lessonId)
    },
    questions,
    setQuestions,
    instructors,
    setInstructors,
    reviews,
    setReviews,
    addReview: (r) => {
      const item = { ...r, id: uid(), date: nowStamp().slice(0, 10), visible: true }
      setReviews((list) => {
        const next = [item, ...list]
        void saveSharedKey('reviews', next)
        return next
      })
    },
    messages,
    sendMessage: (thread, text) => {
      const msg: Message = {
        id: uid(),
        thread,
        fromMe: true,
        text,
        time: nowTime(),
        studentId: session?.accountId || me.id,
        authorName: me.name,
      }
      setMessages((m) => {
        const next = [...m, msg]
        void saveSharedKey('messages', next)
        return next
      })
    },
    replyAsAdmin: (thread, text, meta) => {
      const msg: Message = {
        id: uid(),
        thread,
        fromMe: false,
        text,
        time: nowTime(),
        studentId: meta?.studentId,
        authorName: meta?.authorName || 'AvtoEmir',
      }
      setMessages((m) => {
        const next = [...m, msg]
        void saveSharedKey('messages', next)
        return next
      })
    },
    deleteMessage: (id) => setMessages((m) => m.filter((x) => x.id !== id)),
    deleteChat: (thread) => setMessages((m) => m.filter((x) => x.thread !== thread)),
    notices,
    markNoticesRead: () => {},
    broadcastNotice: (title, body) => {
      const n: Notice = { id: uid(), kind: 'announce', title, body, time: nowStamp(), read: false }
      setNotices((list) => {
        const next = [n, ...list]
        void saveSharedKey('notices', next)
        return next
      })
    },
    deleteNotice: (id) =>
      setNotices((n) => {
        const next = n.filter((x) => x.id !== id)
        void saveSharedKey('notices', next)
        return next
      }),
    bookings,
    addBooking: (b) => setBookings((list) => [...list, { ...b, id: uid() }]),
    cancelBooking: (id) => setBookings((list) => list.filter((x) => x.id !== id)),
    results,
    addResult: (score, total) => {
      const item = {
        id: uid(),
        score,
        total,
        date: nowStamp(),
        studentId: session?.accountId || me.id,
        studentName: me.name || session?.fullName || '',
      }
      void (async () => {
        const cloud = await loadSharedKeys(['results'])
        const remote = Array.isArray(cloud?.results) ? (cloud!.results as TestResult[]) : []
        const base = remote.length === 0 ? [] : mergeById(results, remote)
        const next = [...base, item].slice(-400)
        setResults(next)
        await forceSaveResults(next)
      })()
    },
    clearResults: () => {
      setResults([])
      resultsIgnoreUntil.current = Date.now() + 60_000
      try {
        const raw = localStorage.getItem('avtoemir.store.v2')
        if (raw) {
          const p = JSON.parse(raw) as Record<string, unknown>
          p.results = []
          localStorage.setItem('avtoemir.store.v2', JSON.stringify(p))
        }
      } catch { /* ignore */ }
      void forceSaveResults([])
    },
    learnedSigns,
    toggleSign: (id, known) =>
      setLearnedSigns((list) => (known ? [...new Set([...list, id])] : list.filter((x) => x !== id))),
    roadSigns,
    setRoadSigns,
    presence,
    maintenanceMode,
    setMaintenanceMode: (on: boolean) => {
      setMaintenanceModeState(on)
      void saveSharedKey('maintenanceMode', on)
    },
  }), [
    ready, session, lang, students, me, school, theory, profiles, theoryProgress,
    questions, instructors, reviews, messages, notices, bookings, results, learnedSigns, roadSigns, presence, maintenanceMode, updateStudent,
  ])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
