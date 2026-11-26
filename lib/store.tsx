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
  loginAsGuest, mergeAccountsFromCloud, mergeRecoveryFromCloud, registerAccount, restoreAccount, findAccountById, type Session, type Account,
} from './auth'
import { loadPersisted, savePersisted } from './persist'
import {
  isSupabaseConfigured, loadMessagesBundle, loadSharedFromCloud, saveSharedKey, saveSharedToCloud,
  mergeById, mergeStudents, mergeStringLists, mergeProgressMaps, loadSharedKeys, LIVE_KEYS, HEAVY_KEYS,
  saveStudentsLocalWins, forceSaveResults, saveSchoolMerged, saveDeletedBundle, subscribeAppState, saveBookingsMerged, saveMessagesMerged, saveInstructorsSafe, saveNoticesMerged, saveContentListSafe,
  type DeletedRecord,
} from './sync'
import { hydrateMistakes } from './mistakes'
import { syncCertificateWidget } from './certificate-widget'
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
  loginAsGuest: () => void
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
  archiveStudent: (id: string) => void
  unarchiveStudent: (id: string) => void
  deleteStudent: (id: string) => void
  purgeApprovedStudents: () => number
  deletedRecords: DeletedRecord[]
  restoreDeletedAccount: (id: string) => boolean
  purgeDeletedRecord: (id: string) => void
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
  dismissNotice: (id: string) => void
  broadcastNotice: (title: L, body: L) => void
  deleteNotice: (id: string) => void
  bookings: Booking[]
  addBooking: (b: Omit<Booking, 'id'>) => void
  cancelBooking: (id: string, opts?: { notifyStudent?: boolean }) => void
  results: TestResult[]
  addResult: (score: number, total: number) => void
  clearResults: () => void
  learnedSigns: Record<string, string[]>
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

  // Load full local questions bank once (no Supabase)
  useEffect(() => {
    let cancelled = false
    fetch('/questions.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && Array.isArray(data) && data.length > 10) {
          setQuestions(data)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])
  const [instructors, setInstructors] = useState(seedInstructors)
  const [reviews, setReviews] = useState(seedReviews)
  const [messages, setMessages] = useState(seedMessages)
  const [notices, setNotices] = useState(seedNotices)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [results, setResults] = useState<TestResult[]>([])
  const [learnedSigns, setLearnedSigns] = useState<Record<string, string[]>>({})
  const [roadSigns, setRoadSigns] = useState<RoadSign[]>(seedRoadSigns)
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [theoryProgress, setTheoryProgress] = useState<Record<string, string[]>>({})
  const [presence, setPresence] = useState<Record<string, string>>({})
  const [maintenanceMode, setMaintenanceModeState] = useState(false)
  const [deletedRecords, setDeletedRecords] = useState<DeletedRecord[]>([])
  const resultsIgnoreUntil = useRef(0)

  useEffect(() => {
    setSession(loadSession())
    const p = loadPersisted()
    if (p) {
      if (Array.isArray(p.students)) setStudents(p.students as Student[])
      // Always use fresh seedSchool (ignore old cached school/routes)
      setSchoolState(seedSchool)
      // Always prefer fresh local seedTheory (ignore old cached list)
      setTheory(seedTheory)
      if (Array.isArray(p.questions) && p.questions.length) setQuestions(p.questions as Question[])
      else setQuestions(seedQuestions)
      // Always use fresh seedInstructors (Sabit)
      setInstructors(seedInstructors)
      // Reviews stay empty unless admin adds new ones
      setReviews(seedReviews)
      if (Array.isArray(p.messages)) setMessages(p.messages as Message[])
      if (Array.isArray(p.notices)) setNotices(p.notices as Notice[])
      if (Array.isArray(p.bookings)) setBookings(p.bookings as Booking[])
      if (Array.isArray(p.results)) setResults(p.results as TestResult[])
      if (p.learnedSigns && typeof p.learnedSigns === "object" && !Array.isArray(p.learnedSigns)) setLearnedSigns(p.learnedSigns as Record<string, string[]>)
      // Always use fresh local seedRoadSigns (ignore old cache)
      setRoadSigns(seedRoadSigns)
      if (Array.isArray(p.profiles)) setProfiles(p.profiles as ProfileRow[])
      if (p.theoryProgress && typeof p.theoryProgress === 'object') setTheoryProgress(p.theoryProgress as Record<string, string[]>)
    }

    ;(async () => {
      if (!isSupabaseConfigured) {
        setReady(true)
        return
      }
      const cloud = await loadSharedFromCloud()
      // school stays local (seedSchool + localStorage) — skip cloud to cut egress
      // theory / questions / roadSigns stay local too
      // instructors stay local (seedInstructors / Sabit)
      if (cloud?.notices?.length) setNotices(cloud.notices)
      if (cloud?.students?.length || cloud?.deletedStudentIds?.length) {
        setStudents((prev) => {
          const merged = mergeStudents(prev, cloud.students || [], cloud.deletedStudentIds || [])
          const sid = session?.accountId
          const phone = (session?.phone || '').replace(/\D/g, '').slice(-10)
          if (!sid || phone.length < 10) return merged
          const approved = merged.find((s) => s.status === 'approved' && s.readyDate && (s.phone || '').replace(/\D/g, '').slice(-10) === phone)
          if (!approved) return merged
          return merged.map((s) => s.id === sid ? { ...s, status: 'approved' as const, readyDate: approved.readyDate, updatedAt: approved.updatedAt || s.updatedAt } : s)
        })
      }
      // theory texts stay local (seedTheory) — skip cloud overwrite to save egress
      // questions loaded from local /questions.json
      // roadSigns stay local
      // reviews stay local (empty seed)
      if (cloud?.messages) {
        const dropped = new Set(cloud.droppedMessageIds || [])
        const clean = cloud.messages.filter((m) => !dropped.has(m.id))
        setMessages(clean.slice(-300))
      }
      if (cloud?.bookings) setBookings(cloud.bookings)
      if (cloud?.accounts || cloud?.deletedAccountIds?.length) {
        mergeAccountsFromCloud(cloud.accounts || [], cloud.deletedAccountIds || [])
      }
      if (cloud?.recovery?.length) mergeRecoveryFromCloud(cloud.recovery)
      if (Array.isArray(cloud?.results)) {
        const list = cloud.results!.length ? mergeById([], cloud.results!) : []
        setResults(list.slice(0, 200))
      }
      if (cloud?.learnedSigns && !Array.isArray(cloud.learnedSigns)) setLearnedSigns((prev) => mergeProgressMaps(prev, cloud.learnedSigns!))
      if (cloud?.theoryProgress) setTheoryProgress((prev) => mergeProgressMaps(prev, cloud.theoryProgress!))
      if (cloud?.presence) setPresence((prev) => ({ ...prev, ...cloud.presence }))
      if (typeof cloud?.maintenanceMode === 'boolean') setMaintenanceModeState(cloud.maintenanceMode)
      if (Array.isArray(cloud?.deletedRecords)) setDeletedRecords(cloud.deletedRecords!)
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
      const onAdmin = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')
      void saveSharedToCloud({
        ...(onAdmin ? { students } : {}),
        accounts: listAccounts(), recovery: listPasswordRecoveryRequests(),
        learnedSigns, profiles, theoryProgress,
      })
    }, 1200)
    return () => clearTimeout(t)
  }, [ready, school, instructors, students, theory, questions, reviews, learnedSigns, profiles, theoryProgress, roadSigns])

  useEffect(() => {
    if (!ready || !isSupabaseConfigured) return

    // Hot data only (no theory/questions) — less egress
    const pullLive = async () => {
      const cloud = await loadSharedKeys(LIVE_KEYS)
      if (!cloud) return
      if (cloud.students?.length || cloud.deletedStudentIds?.length) {
        setStudents((prev) => {
          const merged = mergeStudents(prev, cloud.students || [], cloud.deletedStudentIds || [])
          const sid = session?.accountId
          const phone = (session?.phone || '').replace(/\D/g, '').slice(-10)
          if (!sid || phone.length < 10) return merged
          const approved = merged.find((s) => s.status === 'approved' && s.readyDate && (s.phone || '').replace(/\D/g, '').slice(-10) === phone)
          if (!approved) return merged
          if (merged.some((s) => s.id === sid && s.readyDate === approved.readyDate && s.status === 'approved')) return merged
          return merged.map((s) => s.id === sid ? { ...s, status: 'approved' as const, readyDate: approved.readyDate } : s)
        })
      }
      if (Array.isArray(cloud.notices)) setNotices(cloud.notices)
      if (Array.isArray(cloud.bookings)) setBookings(cloud.bookings)
      if (cloud.messages) {
        const dropped = new Set(cloud.droppedMessageIds || [])
        setMessages(cloud.messages.filter((m) => !dropped.has(m.id)))
      }
      if (cloud.accounts || cloud.deletedAccountIds?.length) {
        mergeAccountsFromCloud(cloud.accounts || [], cloud.deletedAccountIds || [])
      }
      if (cloud.deletedStudentIds?.length) {
        const ban = new Set(cloud.deletedStudentIds)
        setStudents((prev) => prev.filter((s) => !ban.has(s.id)))
      }
      if (Array.isArray(cloud.results) && Date.now() > resultsIgnoreUntil.current) {
        setResults(cloud.results.slice(0, 200))
      }
      if (typeof cloud.maintenanceMode === 'boolean') setMaintenanceModeState(cloud.maintenanceMode)
    }

    // Admin-editable content (school, instructors) — at most once per hour, never on every tab
    const ADMIN_STAMP_KEY = 'ae-admin-content-stamp'
    const pullAdminContent = async () => {
      const cloud = await loadSharedKeys(['school', 'instructors'])
      if (!cloud) return
      if (cloud.school?.name && cloud.school.hours?.ru && cloud.school.website) {
        setSchoolState((prev) => ({
          ...seedSchool,
          ...cloud.school!,
          hours: cloud.school!.hours?.ru ? cloud.school!.hours : seedSchool.hours,
          website: cloud.school!.website || seedSchool.website,
          instagram: cloud.school!.instagram || seedSchool.instagram,
          branches: cloud.school!.branches?.length ? cloud.school!.branches : seedSchool.branches,
          routes: cloud.school!.routes?.length ? cloud.school!.routes : seedSchool.routes,
        }))
      }
      if (Array.isArray(cloud.instructors) && cloud.instructors.some((i) => i.phone === '87718875980' || (i.car || '').includes('180ABK'))) {
        setInstructors(cloud.instructors)
      }
    }
    const adminStamp = Number(localStorage.getItem(ADMIN_STAMP_KEY) || 0)
    if (Date.now() - adminStamp > 60 * 60 * 1000) {
      void pullAdminContent().then(() => localStorage.setItem(ADMIN_STAMP_KEY, String(Date.now())))
    }

    // Heavy content rarely (theory, tickets, signs) — was the main egress leak
    const pullHeavy = async () => {
      const cloud = await loadSharedKeys(HEAVY_KEYS)
      if (!cloud) return
      // instructors stay local unless hourly admin pull applied
      setInstructors((prev) => (prev.length ? prev : seedInstructors))
      // Theory lesson texts are served from local seedTheory (no Supabase egress on read).
      // Keep local list as source of truth for students. Admin edits still save to cloud
      // but do not force a full re-download on every open.
      setTheory((prev) => {
        // Prefer local seed content for known topics; keep any extra admin-only topics already in memory
        const seedIds = new Set(seedTheory.map((t) => t.id))
        const extras = prev.filter((t) => !seedIds.has(t.id))
        return [...seedTheory, ...extras]
      })
      // questions stay local from /questions.json
      // reviews stay local
      setReviews(seedReviews)
      // roadSigns dictionary is local (seedRoadSigns) — no cloud fetch
      setRoadSigns(seedRoadSigns)
      if (Array.isArray(cloud.deletedRecords)) setDeletedRecords(cloud.deletedRecords)
      // school / theory / questions / roadSigns stay local — no cloud apply
    }

    void pullLive()
    // APK: pull again whenever the app returns to foreground
    let removeResume: (() => void) | undefined
    void import('@capacitor/app').then(({ App }) => App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void pullLive()
    }).then((h) => { removeResume = () => { void h.remove() } })).catch(() => {})
    // Heavy content once per open
    // Heavy content (theory, signs, questions) — max once per 6 hours
    const heavyStamp = Number(localStorage.getItem('ae-heavy-stamp') || 0)
    if (Date.now() - heavyStamp > 6 * 60 * 60 * 1000) {
      void pullHeavy().then(() => localStorage.setItem('ae-heavy-stamp', String(Date.now())))
    }

    // Poll every 10 min, only when tab is visible
    let lastLive = Date.now()
    const liveId = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        lastLive = Date.now()
        void pullLive()
      }
    }, 600_000)  // 10 min — less egress

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      lastLive = Date.now()
      void pullLive()
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisible)
    }

    let rtTimer: ReturnType<typeof setTimeout> | null = null
    const unsub = subscribeAppState(
      ['messages', 'notices', 'students', 'bookings', 'maintenanceMode', 'registrationRequests'],
      () => {
        if (rtTimer) clearTimeout(rtTimer)
        rtTimer = setTimeout(() => { void pullLive() }, 2500)
      },
    )

    return () => {
      removeResume?.()
      clearInterval(liveId)
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisible)
      }
      if (rtTimer) clearTimeout(rtTimer)
      unsub()
    }
  }, [ready])


  const me = useMemo(() => {
    const id = session?.accountId
    const phone = (session?.phone || '').replace(/\D/g, '').slice(-10)
    const byPhone = phone.length >= 10
      ? students.filter((s) => (s.phone || '').replace(/\D/g, '').slice(-10) === phone)
      : []
    const byId = students.find((s) => s.id === id)
    const found =
      byPhone.find((s) => s.status === 'approved' && s.readyDate) ||
      (byId?.status === 'approved' && byId.readyDate ? byId : undefined) ||
      byId ||
      byPhone[0]
    if (found) {
      return {
        ...found,
        name: found.name || session?.fullName || '',
        phone: found.phone || session?.phone || '',
      }
    }
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

  useEffect(() => {
    if (!ready) return
    const loggedIn = !!(session && session.accountId && session.accountId !== 'guest_play_review')
    void syncCertificateWidget({
      loggedIn,
      fullName: me.name || session?.fullName || '',
      schoolName: school.name || 'AvtoEmir',
      accountId: session?.accountId || me.id || '',
      date: me.readyDate || '',
      status: me.status || 'draft',
    })
  }, [ready, session, me.id, me.name, me.readyDate, me.status, school.name])

  useEffect(() => {
    if (!ready || !session?.accountId) return
    const id = session.accountId
    if (id === 'guest' || id === 'guest_play_review') return

    const locallyGone = !listAccounts().some((a) => a.id === id)
    if (locallyGone) {
      clearSession()
      setSession(null)
      return
    }

    if (!isSupabaseConfigured) return
    void loadSharedKeys(['deletedAccountIds', 'deletedStudentIds']).then((cloud) => {
      if (!cloud) return
      const delA = new Set(cloud.deletedAccountIds || [])
      const delS = new Set(cloud.deletedStudentIds || [])
      if (delA.has(id) || delS.has(id)) {
        deleteAccount(id)
        clearSession()
        setSession(null)
      }
    })
  }, [ready, session?.accountId, students])

  const updateStudent = useCallback((id: string, fn: (s: Student) => Student) => {
    if (!id || id === 'guest') return
    setStudents((list) => {
      const idx = list.findIndex((s) => s.id === id)
      let next: Student[]
      const stamp = new Date().toISOString()
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
          updatedAt: stamp,
        }
        next = [...list.filter((s) => s.id !== 'me'), { ...fn(base), updatedAt: stamp }]
      } else {
        next = list.map((s) => (s.id === id ? { ...fn(s), updatedAt: stamp } : s))
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
        if (isSupabaseConfigured) {
          const cloud = await loadSharedKeys(['deletedAccountIds', 'deletedStudentIds'])
          const id = r.session.accountId
          const banned = new Set([...(cloud?.deletedAccountIds || []), ...(cloud?.deletedStudentIds || [])])
          if (banned.has(id)) {
            deleteAccount(id)
            return { ok: false as const, error: 'notfound' }
          }
        }
        setSession(r.session)
        // Do not push a local draft over the cloud record (that wiped readyDate).
        void (async () => {
          try {
            const { loadSharedKeys } = await import('./sync')
            const cloud = await loadSharedKeys(['students', 'deletedStudentIds'])
            const remote = (cloud?.students || []) as Student[]
            const cloudMe = remote.find((s) => s.id === r.session.accountId)
            setStudents((list) => {
              const existing = list.find((s) => s.id === r.session.accountId)
              if (cloudMe) {
                const merged = { ...cloudMe, name: cloudMe.name || r.session.fullName, phone: cloudMe.phone || r.session.phone }
                return [...list.filter((s) => s.id !== cloudMe.id && s.id !== 'me'), merged]
              }
              if (existing) return list
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
              return [...list.filter((s) => s.id !== 'me'), student]
            })
          } catch (e) {
            console.warn('[store] login hydrate student:', e)
          }
        })()
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
    loginAsGuest: () => {
      const s = loginAsGuest()
      setSession(s)
    },
    logout: () => {
      clearSession()
      setSession(null)
    },
    deleteMyAccount: () => {
      const id = session?.accountId
      if (!id || id === 'guest' || id === 'guest_play_review') return { ok: false as const, error: 'notfound' }
      const ok = deleteAccount(id)
      if (!ok) return { ok: false as const, error: 'notfound' }
      clearSession()
      setSession(null)
      setStudents((list) => list.filter((s) => s.id !== id))
      return { ok: true as const }
    },
    lang,
    setLang,
    t: (k) => dict[lang][k] || k,
    tl: (v) => (v && (v[lang] || v.ru)) || '',
    students,
    me,
    setCategory: (c) => updateStudent(me.id, (s) => ({ ...s, category: c })),
    setDoc: (key, file) => {
      const id = session?.accountId || me.id
      if (!id || id === 'guest') return
      updateStudent(id, (s) => ({ ...s, docs: { ...s.docs, [key]: file } }))
      // Explicit confirmed save so admin sees the URL in Supabase
      void (async () => {
        try {
          const { loadSharedKeys, saveSharedKey } = await import('./sync')
          const cloud = await loadSharedKeys(['students'])
          const remote = (cloud?.students || []) as Student[]
          const stamp = new Date().toISOString()
          const next = remote.map((x) =>
            x.id === id ? { ...x, docs: { ...x.docs, [key]: file }, updatedAt: stamp } : x,
          )
          if (!next.some((x) => x.id === id)) {
            next.push({
              id,
              name: session?.fullName || me.name || '',
              phone: session?.phone || me.phone || '',
              category: 'B',
              docs: { idFront: null, idBack: null, psycho: null, narco: null, [key]: file },
              status: 'draft',
              readyDate: null,
              submittedAt: null,
              updatedAt: stamp,
            } as Student)
          }
          await saveSharedKey('students', next)
        } catch (e) {
          console.warn('[store] setDoc cloud save:', e)
        }
      })()
    },
    submitDocs: () => {
      const id = session?.accountId || me.id
      if (!id || id === 'guest') return
      updateStudent(id, (s) => ({ ...s, status: 'pending' as const, submittedAt: nowStamp() }))
      void (async () => {
        try {
          const { loadSharedKeys, saveSharedKey } = await import('./sync')
          const cloud = await loadSharedKeys(['students'])
          const remote = (cloud?.students || []) as Student[]
          const stamp = new Date().toISOString()
          const submittedAt = nowStamp()
          const local = students.find((s) => s.id === id)
          const next = remote.map((x) =>
            x.id === id
              ? {
                  ...x,
                  docs: local?.docs || x.docs,
                  status: 'pending' as const,
                  submittedAt,
                  updatedAt: stamp,
                }
              : x,
          )
          if (!next.some((x) => x.id === id)) {
            next.push({
              id,
              name: session?.fullName || me.name || '',
              phone: session?.phone || me.phone || '',
              category: local?.category || 'B',
              docs: local?.docs || { idFront: null, idBack: null, psycho: null, narco: null },
              status: 'pending',
              readyDate: null,
              submittedAt,
              updatedAt: stamp,
            } as Student)
          }
          await saveSharedKey('students', next)
        } catch (e) {
          console.warn('[store] submitDocs cloud save:', e)
        }
      })()
    },
    approveStudent: (id, readyDate) => {
      updateStudent(id, (s) => ({ ...s, status: 'approved', readyDate, updatedAt: new Date().toISOString() }))
      const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
      const notice = {
        id: `n_cert_${id}_${Date.now().toString(36)}`,
        kind: 'docs' as const,
        title: { ru: 'Документы подтверждены', kk: 'Құжаттар расталды' },
        body: {
          ru: `Ваши документы приняты. Сертификат будет готов ${readyDate}.`,
          kk: `Құжаттарыңыз қабылданды. Сертификат ${readyDate} дайын болады.`,
        },
        time: stamp,
        read: false,
        studentId: id,
      }
      setNotices((list) => [notice, ...list])
      // Force cloud save so student sees approval + date immediately
      void (async () => {
        try {
          const { loadSharedKeys, saveSharedKey } = await import('./sync')
          const cloud = await loadSharedKeys(['students', 'notices'])
          const remote = (cloud?.students || []) as Student[]
          const iso = new Date().toISOString()
          const nextStudents = remote.map((x) =>
            x.id === id ? { ...x, status: 'approved' as const, readyDate, updatedAt: iso } : x,
          )
          if (!nextStudents.some((x) => x.id === id)) {
            const local = students.find((s) => s.id === id)
            if (local) nextStudents.push({ ...local, status: 'approved', readyDate, updatedAt: iso })
          }
          const prevNotices = Array.isArray(cloud?.notices) ? cloud.notices : []
          const nextNotices = [notice, ...prevNotices.filter((n) => n.id !== notice.id)]
          await Promise.all([
            saveSharedKey('students', nextStudents),
            saveSharedKey('notices', nextNotices),
          ])
        } catch (e) {
          console.warn('[store] approveStudent cloud:', e)
        }
      })()
    },
    rejectStudent: (id) => {
      updateStudent(id, (s) => ({ ...s, status: 'rejected', readyDate: null, updatedAt: new Date().toISOString() }))
      void (async () => {
        try {
          const { loadSharedKeys, saveSharedKey } = await import('./sync')
          const cloud = await loadSharedKeys(['students'])
          const remote = (cloud?.students || []) as Student[]
          const iso = new Date().toISOString()
          const next = remote.map((x) =>
            x.id === id ? { ...x, status: 'rejected' as const, readyDate: null, updatedAt: iso } : x,
          )
          await saveSharedKey('students', next)
        } catch (e) {
          console.warn('[store] rejectStudent cloud:', e)
        }
      })()
    },
    resetStudentDocs: (id) => {
      updateStudent(id, (s) => ({
        ...s,
        docs: { idFront: null, idBack: null, psycho: null, narco: null },
        status: 'draft',
        submittedAt: null,
        readyDate: null,
      }))
      // Force the cleared record into Supabase so the student device picks it up
      void (async () => {
        try {
          const { loadSharedKeys, saveSharedKey } = await import('./sync')
          const cloud = await loadSharedKeys(['students'])
          const remote = (cloud?.students || []) as Student[]
          const stamp = new Date().toISOString()
          const target = students.find((x) => x.id === id)
          const phoneKey = (target?.phone || '').replace(/\D/g, '').slice(-10)
          const next = remote.map((x) => {
            const xPhone = (x.phone || '').replace(/\D/g, '').slice(-10)
            if (x.id === id || (phoneKey && xPhone === phoneKey)) {
              return {
                ...x,
                docs: { idFront: null, idBack: null, psycho: null, narco: null },
                status: 'draft' as const,
                submittedAt: null,
                readyDate: null,
                updatedAt: stamp,
              }
            }
            return x
          })
          await saveSharedKey('students', next)
        } catch (e) {
          console.warn('[store] resetStudentDocs cloud:', e)
        }
      })()
    },
    archiveStudent: (id) =>
      updateStudent(id, (s) => ({
        ...s,
        archived: true,
        archivedAt: new Date().toISOString(),
      })),
    unarchiveStudent: (id) =>
      updateStudent(id, (s) => ({
        ...s,
        archived: false,
        archivedAt: null,
      })),
deleteStudent: (id) => {
  if (!id || id === 'me' || id === 'guest' || id === 'guest_play_review') return

  // Локальная очистка
  setStudents((list) => list.filter((s) => s.id !== id))
  setMessages((list) => list.filter((m) => m.studentId !== id))
  setBookings((list) => list.filter((b) => b.studentId !== id))
  setNotices((list) => list.filter((n) => n.studentId !== id))
  setResults((list) => list.filter((r) => r.studentId !== id))
  setDeletedRecords([]) // больше не используем снимки

  // Удаление из localStorage аккаунтов
  deleteAccount(id) // существующая функция из auth.ts

  // Полная очистка в Supabase (все связанные ключи)
  void (async () => {
    try {
      const {
        loadSharedKeys,
        saveSharedKey,
        saveDeletedBundle,
      } = await import('./sync')

      const keys = [
        'students',
        'accounts',
        'messages',
        'bookings',
        'notices',
        'results',
        'registrationRequests',
        'profiles',
        'theoryProgress',
        'learnedSigns',
        'studentMistakes',
        'recovery',
      ] as const

      const cloud = await loadSharedKeys([...keys, 'deletedAccountIds', 'deletedStudentIds'])

      const clean = (arr: any[] | undefined, idField = 'id') =>
        (arr || []).filter((x) => x?.[idField] !== id && x?.studentId !== id && x?.accountId !== id)

      await Promise.all([
        saveSharedKey('students', clean(cloud?.students)),
        saveSharedKey('accounts', clean(cloud?.accounts)),
        saveSharedKey('messages', clean(cloud?.messages, 'studentId')),
        saveSharedKey('bookings', clean(cloud?.bookings, 'studentId')),
        saveSharedKey('notices', clean(cloud?.notices, 'studentId')),
        saveSharedKey('results', clean(cloud?.results, 'studentId')),
        saveSharedKey('registrationRequests', clean(cloud?.registrationRequests)),
        saveSharedKey('profiles', clean(cloud?.profiles)),
        // theoryProgress / learnedSigns / studentMistakes — объекты, чистим по ключу id
        saveSharedKey('theoryProgress', (() => {
          const obj = { ...(cloud?.theoryProgress || {}) }
          delete obj[id]
          return obj
        })()),
        saveSharedKey('learnedSigns', (() => {
          const obj = { ...(cloud?.learnedSigns || {}) }
          delete obj[id]
          return obj
        })()),
        saveSharedKey('studentMistakes', (() => {
          const obj = { ...(cloud?.studentMistakes || {}) }
          delete obj[id]
          return obj
        })()),
        saveSharedKey('recovery', clean(cloud?.recovery, 'accountId')),
      ])

      // Tombstone (только ID, без снимков) — чтобы другие устройства не вернули аккаунт из своего localStorage
      await saveDeletedBundle({
        addIds: [id],
        removeRecordIds: [id],
        replaceRecords: [], // больше не храним снимки
      })

      // Очистка localStorage на этом устройстве
      try {
        const accRaw = localStorage.getItem('avtoemir.accounts.v1')
        if (accRaw) {
          const acc = JSON.parse(accRaw).filter((a: any) => a.id !== id)
          localStorage.setItem('avtoemir.accounts.v1', JSON.stringify(acc))
        }
      } catch {}
    } catch (e) {
      console.warn('[store] permanent deleteStudent:', e)
    }
  })()
},
    purgeApprovedStudents: () => 0,
    deletedRecords,
    restoreDeletedAccount: (id) => {
      const rec = deletedRecords.find((r) => r.id === id)
      if (!rec) return false
      if (rec.account) {
        restoreAccount(rec.account)
      }
      if (rec.student) {
        setStudents((list) => [...list.filter((s) => s.id !== id), rec.student as Student])
      }
      setDeletedRecords((prev) => prev.filter((r) => r.id !== id))
      return true
    },
    purgeDeletedRecord: (id) => {
      setDeletedRecords((prev) => prev.filter((r) => r.id !== id))
    },
    school,
    setSchool: (s) => {
      setSchoolState(s)
      void (async () => {
        try {
          const { saveSchoolMerged } = await import('./sync')
          await saveSchoolMerged(s)
        } catch (e) { console.warn('[store] setSchool:', e) }
      })()
    },
    theory,
    setTheory,
    profiles,
    theoryProgress,
    completeLesson: (lessonId) => {
      const id = session?.accountId
      if (!id || id === 'guest') return
      setTheoryProgress((prev) => {
        const mine = prev[id] || []
        if (mine.includes(lessonId)) return prev
        const next = { ...prev, [id]: [...mine, lessonId] }
        void upsertTheoryProgress(id, lessonId)
        return next
      })
    },
    questions,
    setQuestions,
    instructors,
    setInstructors: (list) => {
      setInstructors(list)
      void (async () => {
        try {
          const { saveInstructorsSafe } = await import('./sync')
          await saveInstructorsSafe(list)
        } catch (e) { console.warn('[store] setInstructors:', e) }
      })()
    },
    reviews,
    setReviews,
    addReview: (r) => {
      const item: Review = { ...r, id: uid(), date: nowStamp(), visible: true }
      setReviews((list) => [item, ...list])
    },
    messages,
    sendMessage: (thread, text) => {
      const msg: Message = {
        id: uid(),
        thread,
        fromMe: true,
        text,
        time: nowTime(),
        studentId: session?.accountId,
        authorName: session?.fullName,
      }
      setMessages((list) => [...list, msg])
      void (async () => {
        try {
          const { saveMessagesMerged } = await import('./sync')
          await saveMessagesMerged([msg])
        } catch (e) {
          console.warn('[store] sendMessage:', e)
        }
      })()
    },
    replyAsAdmin: (thread, text, meta) => {
      const msg: Message = {
        id: uid(),
        thread,
        fromMe: false,
        text,
        time: nowTime(),
        studentId: meta?.studentId,
        authorName: meta?.authorName || 'Admin',
      }
      setMessages((list) => [...list, msg])
      void (async () => {
        try {
          const { saveMessagesMerged } = await import('./sync')
          await saveMessagesMerged([msg])
        } catch (e) {
          console.warn('[store] replyAsAdmin:', e)
        }
      })()
    },
    deleteMessage: (id) => {
      setMessages((list) => list.filter((m) => m.id !== id))
      void (async () => {
        try {
          const { saveMessagesMerged } = await import('./sync')
          await saveMessagesMerged([], [id])
        } catch (e) {
          console.warn('[store] deleteMessage:', e)
        }
      })()
    },
    deleteChat: (thread, studentId) => {
      setMessages((list) => list.filter((m) => !(m.thread === thread && (!studentId || m.studentId === studentId))))
    },
    notices,
    // Внутри return useMemo(...) объекта Store
markNoticesRead: () => {
  const id = session?.accountId
  if (!id) return
  setNotices((list) => {
    const next = list.map((n) =>
      n.studentId === id || !n.studentId ? { ...n, read: true } : n,
    )
    void (async () => {
      try {
        const { saveNoticesMerged } = await import('./sync')
        await saveNoticesMerged(next)
      } catch (e) {
        console.warn('[store] markNoticesRead cloud:', e)
      }
    })()
    return next
  })
},

dismissNotice: (noticeId) => {
  const meId = session?.accountId
  if (!meId) return
  setNotices((list) => {
    const next = list.map((n) =>
      n.id === noticeId
        ? { ...n, dismissedBy: [...(n.dismissedBy || []), meId] }
        : n,
    )
    void (async () => {
      try {
        const { saveNoticesMerged } = await import('./sync')
        await saveNoticesMerged(next)
      } catch (e) {
        console.warn('[store] dismissNotice cloud:', e)
      }
    })()
    return next
  })
},
    

    broadcastNotice: (title, body) => {
      const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
      const notice = {
        id: `n_broadcast_${Date.now().toString(36)}`,
        kind: 'announce' as const,
        title,
        body,
        time: stamp,
        read: false,
      }
      setNotices((list) => [notice, ...list])
      void (async () => {
        try {
          const { loadSharedKeys, saveSharedKey } = await import('./sync')
          const cloud = await loadSharedKeys(['notices'])
          const prev = Array.isArray(cloud?.notices) ? cloud.notices : []
          const next = [notice, ...prev.filter((n) => n.id !== notice.id)]
          await saveSharedKey('notices', next)
        } catch (e) {
          console.warn('[store] broadcastNotice cloud:', e)
        }
      })()
    },

    deleteNotice: (id) => {
  setNotices((list) => {
    const next = list.filter((n) => n.id !== id)
    void (async () => {
      try {
        const { saveNoticesMerged } = await import('./sync')
        await saveNoticesMerged(next, [id]) // removedIds
      } catch (e) {
        console.warn('[store] deleteNotice cloud:', e)
      }
    })()
    return next
  })
},
    bookings,
    addBooking: (b) => {
      const item: Booking = { ...b, id: uid() }
      setBookings((list) => [...list, item])
      void (async () => {
        try {
          const { saveBookingsMerged } = await import('./sync')
          await saveBookingsMerged([item])
        } catch (e) {
          console.warn('[store] addBooking:', e)
        }
      })()
    },
    cancelBooking: (id, opts) => {
      setBookings((list) => list.filter((b) => b.id !== id))
    },
    results,
    addResult: (score, total) => {
      const item: TestResult = {
        id: uid(),
        date: nowStamp(),
        score,
        total,
        studentId: session?.accountId,
        studentName: session?.fullName,
      }
      setResults((list) => [item, ...list])
      void forceSaveResults([item, ...results])
    },
    clearResults: () => {
      setResults([])
      resultsIgnoreUntil.current = Date.now() + 20_000
      void forceSaveResults([])
      try {
        const raw = localStorage.getItem('avtoemir.store.v2')
        if (raw) {
          const p = JSON.parse(raw)
          p.results = []
          localStorage.setItem('avtoemir.store.v2', JSON.stringify(p))
        }
      } catch {}
    },
    learnedSigns,
    toggleSign: (id, known) => {
      const meId = session?.accountId
      if (!meId || meId === 'guest') return
      setLearnedSigns((prev) => {
        const mine = prev[meId] || []
        const next = known ? [...mine, id] : mine.filter((x) => x !== id)
        return { ...prev, [meId]: next }
      })
    },
    roadSigns,
    setRoadSigns: (next) => {
      // Signs dictionary + images are local (seed + public/signs). Do not upload to Supabase.
      setRoadSigns(next)
    },
    presence,
    maintenanceMode,
    setMaintenanceMode: (on) => {
      setMaintenanceModeState(on)
      void (async () => {
        try {
          const { saveSharedKey } = await import('./sync')
          await saveSharedKey('maintenanceMode', on)
        } catch (e) {
          console.warn('[store] setMaintenanceMode:', e)
        }
      })()
    },
  }), [ready, session, lang, students, me, school, theory, profiles, theoryProgress, questions, instructors, reviews, messages, notices, bookings, results, learnedSigns, roadSigns, presence, maintenanceMode, deletedRecords, updateStudent])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
