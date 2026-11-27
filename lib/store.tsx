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
  isSupabaseConfigured, loadSharedFromCloud, saveSharedToCloud,
  mergeById, mergeStudents, mergeProgressMaps, loadSharedKeys, LIVE_KEYS,
  saveStudentsLocalWins, forceSaveResults, saveSchoolMerged, saveDeletedBundle, subscribeAppState, saveBookingsMerged, saveMessagesMerged, saveInstructorsSafe, saveNoticesMerged, saveContentListSafe, saveReviewsMerged, saveReviewsReplace,
  type DeletedRecord,
} from './sync'
import { hydrateMistakes } from './mistakes'
import { syncCertificateWidget } from './certificate-widget'
import { upsertTheoryProgress, type ProfileRow } from './cloud-features'

const uid = () => Math.random().toString(36).slice(2, 10)
const nowTime = () => new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
const nowStamp = () => new Date().toISOString()

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
      // Live keys (students/readyDate, notices, bookings, messages) are NOT restored from localStorage.
      // They come from cloud so stale APK/site cache cannot mask or override fresh data.
      // Keep offline content that would otherwise hit egress: questions, theory, school, road signs.
      setSchoolState(seedSchool)
      setTheory(seedTheory)
      if (Array.isArray(p.questions) && p.questions.length) setQuestions(p.questions as Question[])
      else setQuestions(seedQuestions)
      setInstructors(seedInstructors)
      setReviews(seedReviews)
      setRoadSigns(seedRoadSigns)
      if (p.learnedSigns && typeof p.learnedSigns === "object" && !Array.isArray(p.learnedSigns)) setLearnedSigns(p.learnedSigns as Record<string, string[]>)
      if (Array.isArray(p.profiles)) setProfiles(p.profiles as ProfileRow[])
      if (p.theoryProgress && typeof p.theoryProgress === 'object') setTheoryProgress(p.theoryProgress as Record<string, string[]>)
    }

    ;(async () => {
      if (!isSupabaseConfigured) {
        setReady(true)
        return
      }
      const cloud = await loadSharedFromCloud()
      const schoolCloud = await loadSharedKeys(['school', 'reviews'])
      if (Array.isArray(schoolCloud?.reviews)) setReviews(schoolCloud.reviews)
      if (schoolCloud?.school?.name) {
        setSchoolState((prev) => ({
          ...seedSchool,
          ...schoolCloud.school!,
          hours: schoolCloud.school!.hours?.ru ? schoolCloud.school!.hours : seedSchool.hours,
          website: schoolCloud.school!.website || seedSchool.website,
          instagram: schoolCloud.school!.instagram || seedSchool.instagram,
          branches: schoolCloud.school!.branches?.length ? schoolCloud.school!.branches : seedSchool.branches,
          routes: schoolCloud.school!.routes?.length ? schoolCloud.school!.routes : seedSchool.routes,
        }))
      }
      if (Array.isArray(cloud?.notices)) setNotices(cloud.notices)
      if (cloud?.students?.length || cloud?.deletedStudentIds?.length) {
        setStudents((prev) => {
          const merged = mergeStudents(prev, cloud.students || [], cloud.deletedStudentIds || [])
          const sid = session?.accountId
          const phone = (session?.phone || '').replace(/\D/g, '').slice(-10)
          if (phone.length < 10) return merged
          const approved = merged.find((s) => s.status === 'approved' && s.readyDate && (s.phone || '').replace(/\D/g, '').slice(-10) === phone)
          if (!approved) return merged
          return merged.map((s) => {
            const sPhone = (s.phone || '').replace(/\D/g, '').slice(-10)
            if (s.id === sid || (sid && sPhone === phone)) {
              return { ...s, status: 'approved' as const, readyDate: approved.readyDate, updatedAt: approved.updatedAt || s.updatedAt }
            }
            return s
          })
        })
      }
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
      questions, learnedSigns, profiles, theoryProgress,
    })
  }, [ready, questions, learnedSigns, profiles, theoryProgress])

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

    const pullLive = async () => {
      const cloud = await loadSharedKeys(LIVE_KEYS)
      if (!cloud) return
      if (cloud.students?.length || cloud.deletedStudentIds?.length) {
        setStudents((prev) => {
          const merged = mergeStudents(prev, cloud.students || [], cloud.deletedStudentIds || [])
          const sid = session?.accountId
          const phone = (session?.phone || '').replace(/\D/g, '').slice(-10)
          if (phone.length < 10) return merged
          const approved = merged.find((s) => s.status === 'approved' && s.readyDate && (s.phone || '').replace(/\D/g, '').slice(-10) === phone)
          if (!approved) return merged
          // Always apply approved readyDate to the logged-in student's record (by id or by phone match)
          return merged.map((s) => {
            const sPhone = (s.phone || '').replace(/\D/g, '').slice(-10)
            if (s.id === sid || (sid && sPhone === phone)) {
              return { ...s, status: 'approved' as const, readyDate: approved.readyDate, updatedAt: approved.updatedAt || s.updatedAt }
            }
            return s
          })
        })
      }
      if (Array.isArray(cloud.notices)) setNotices(cloud.notices)
      if (Array.isArray(cloud.reviews)) setReviews(cloud.reviews)
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

    // Content (school, theory, signs, questions) stays on local seeds — never pulled.
    try {
      localStorage.removeItem('ae-admin-content-stamp')
      localStorage.removeItem('ae-heavy-stamp')
      localStorage.removeItem('avtoemir.store')
    } catch { /* ignore */ }

    let pulling = false
    const pullOnce = async () => {
      if (pulling) return
      pulling = true
      try { await pullLive() } finally { pulling = false }
    }

    void pullOnce()
    let removeResume: (() => void) | undefined
    void import('@capacitor/app').then(({ App }) => App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void pullOnce()
    }).then((h) => { removeResume = () => { void h.remove() } })).catch(() => {})

    const liveId = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        void pullOnce()
      }
    }, 60_000)

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      void pullOnce()
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisible)
    }

    let rtTimer: ReturnType<typeof setTimeout> | null = null
    const unsub = subscribeAppState(
      ['messages', 'notices', 'students', 'bookings', 'maintenanceMode', 'registrationRequests'],
      () => {
        if (rtTimer) clearTimeout(rtTimer)
        rtTimer = setTimeout(() => { void pullOnce() }, 2500)
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
      category: 'B' as Category,
      docs: { idFront: null, idBack: null, psycho: null, narco: null },
      status: 'draft' as const,
      readyDate: null,
      submittedAt: null,
    }
  }, [session, students])

  const value = useMemo(() => ({
    ready,
    session,
    login: async (phone, password) => {
      const r = await loginAccount(phone, password)
      if (r.ok) setSession(r.session)
      return r
    },
    register: async (fullName, phone, password) => {
      const r = await registerAccount(fullName, phone, password)
      if (r.ok) setSession(r.session)
      return r
    },
    loginAsGuest: () => setSession(loginAsGuest()),
    logout: () => { clearSession(); setSession(null) },
    deleteMyAccount: () => {
      const id = session?.accountId
      if (!id) return { ok: false, error: 'no session' }
      const r = deleteAccount(id)
      if (r.ok) { clearSession(); setSession(null) }
      return r
    },
    lang,
    setLang,
    t: (k) => dict[lang][k] || k,
    tl: (v) => v[lang] || v.ru || '',
    students,
    me,
    setCategory: (c) => {
      setStudents((list) => list.map((s) => s.id === me.id ? { ...s, category: c } : s))
    },
    setDoc: (key, file) => {
      setStudents((list) => list.map((s) => s.id === me.id ? { ...s, docs: { ...s.docs, [key]: file } } : s))
    },
    submitDocs: () => {
      setStudents((list) => list.map((s) => s.id === me.id ? { ...s, status: 'pending', submittedAt: nowStamp() } : s))
    },
    approveStudent: (id, readyDate) => {
      const stamp = nowStamp()
      const student = students.find((s) => s.id === id)
      const who = [student?.name, student?.phone].filter(Boolean).join(' · ') || 'Ученик'
      const pretty = (() => {
        const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(readyDate || '')
        return m ? `${m[3]}.${m[2]}.${m[1]}` : readyDate
      })()
      setStudents((list) => {
        const next = list.map((s) => s.id === id ? { ...s, status: 'approved' as const, readyDate, updatedAt: stamp } : s)
        void saveStudentsLocalWins(next)
        return next
      })
      setNotices((list) => {
        const recent = list.find((n) => n.kind === 'docs' && n.studentId === id && (n.body?.ru || '').includes(pretty) && Date.now() - Date.parse(n.time || '') < 60_000)
        if (recent) return list
        const notice: Notice = {
          id: `n_cert_${id}_${Date.now().toString(36)}`,
          studentId: id,
          kind: 'docs',
          title: { ru: 'Дата сертификата', kk: 'Сертификат күні' },
          body: {
            ru: `${who}: сертификат будет готов ${pretty}`,
            kk: `${who}: сертификат дайын болады ${pretty}`,
          },
          time: new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          read: false,
        }
        void saveNoticesMerged([notice])
        return [notice, ...list].slice(0, 200)
      })
    },
    rejectStudent: (id) => {
      setStudents((list) => list.map((s) => s.id === id ? { ...s, status: 'rejected', readyDate: null, updatedAt: nowStamp() } : s))
    },
    resetStudentDocs: (id) => {
      setStudents((list) => list.map((s) => s.id === id ? { ...s, status: 'draft', docs: { idFront: null, idBack: null, psycho: null, narco: null }, submittedAt: null, readyDate: null, updatedAt: nowStamp() } : s))
    },
    archiveStudent: (id) => {
      setStudents((list) => list.map((s) => s.id === id ? { ...s, archived: true, archivedAt: nowStamp() } : s))
    },
    unarchiveStudent: (id) => {
      setStudents((list) => list.map((s) => s.id === id ? { ...s, archived: false, archivedAt: null } : s))
    },
    deleteStudent: (id) => {
      const student = students.find((s) => s.id === id)
      const phone = (student?.phone || '').replace(/\D/g, '').slice(-10)
      setStudents((list) => {
        const next = list.filter((s) => s.id !== id && (phone.length < 10 || (s.phone || '').replace(/\D/g, '').slice(-10) !== phone))
        void saveStudentsLocalWins(next)
        return next
      })
      const accounts = listAccounts()
      for (const a of accounts) {
        const aPhone = (a.phone || '').replace(/\D/g, '').slice(-10)
        if (a.id === id || (phone.length >= 10 && aPhone === phone)) deleteAccount(a.id)
      }
      void saveDeletedBundle({
        addIds: [id],
        addRecords: [{
          id,
          deletedAt: new Date().toISOString(),
          student: student || null,
          account: accounts.find((a) => a.id === id) || null,
        }],
      })
      void saveSharedToCloud({ accounts: listAccounts() })
    },
    purgeApprovedStudents: () => 0,
    deletedRecords,
    restoreDeletedAccount: (id) => {
      const rec = deletedRecords.find((r) => r.id === id)
      if (!rec) return false
      if (rec.student) setStudents((list) => [...list, rec.student!])
      setDeletedRecords((list) => list.filter((r) => r.id !== id))
      return true
    },
    purgeDeletedRecord: (id) => {
      setDeletedRecords((list) => list.filter((r) => r.id !== id))
    },
    school,
    setSchool: (s) => {
      setSchoolState(s)
      void saveSchoolMerged(s)
    },
    theory,
    setTheory,
    profiles,
    theoryProgress,
    completeLesson: (lessonId) => {
      const sid = me.id
      if (!sid) return
      setTheoryProgress((prev) => {
        const cur = prev[sid] || []
        if (cur.includes(lessonId)) return prev
        return { ...prev, [sid]: [...cur, lessonId] }
      })
    },
    questions,
    setQuestions,
    instructors,
    setInstructors,
    reviews,
    setReviews: (list) => {
      setReviews(list)
      void saveReviewsReplace(list)
    },
    addReview: (r) => {
      const item: Review = { ...r, id: uid(), date: nowStamp(), visible: false, studentId: me.id }
      setReviews((list) => {
        const next = [item, ...list]
        void saveReviewsMerged(next)
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
    markNoticesRead: () => {
      const ids = new Set([session?.accountId, me.id].filter(Boolean) as string[])
      setNotices((list) => {
        const next = list.map((n) =>
          !n.studentId || ids.has(n.studentId) ? { ...n, read: true } : n,
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
      const ids = [session?.accountId, me.id].filter(Boolean) as string[]
      if (!ids.length) return
      setNotices((list) => {
        const next = list.map((n) =>
          n.id === noticeId ? { ...n, dismissedBy: [...new Set([...(n.dismissedBy || []), ...ids])] } : n
        )
        void (async () => {
          try {
            const { saveNoticesMerged } = await import('./sync')
            await saveNoticesMerged(next)
          } catch (e) {
            console.warn('[store] dismissNotice:', e)
          }
        })()
        return next
      })
    },
    broadcastNotice: (title, body) => {
      const stamp = nowStamp()
      const notice: Notice = {
        id: `n_bcast_${Date.now().toString(36)}`,
        kind: 'announce',
        title,
        body,
        time: stamp,
        read: false,
      }
      setNotices((list) => [notice, ...list])
      void (async () => {
        try {
          const { saveNoticesMerged } = await import('./sync')
          await saveNoticesMerged([notice])
        } catch (e) {
          console.warn('[store] broadcastNotice cloud:', e)
        }
      })()
    },
    deleteNotice: (id) => {
      setNotices((list) => list.filter((n) => n.id !== id))
      void (async () => {
        try {
          const { saveNoticesMerged } = await import('./sync')
          await saveNoticesMerged([], [id])
        } catch (e) {
          console.warn('[store] deleteNotice:', e)
        }
      })()
    },
    bookings,
    addBooking: (b) => {
      const item: Booking = { ...b, id: uid() }
      setBookings((list) => [...list, item])
      if (item.studentId) {
        const who = [item.studentName, item.studentPhone].filter(Boolean).join(' · ') || 'Ученик'
        const pretty = (() => {
          const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(item.date || '')
          return m ? `${m[3]}.${m[2]}.${m[1]}` : item.date
        })()
        const notice = {
          id: `n_book_${item.id}`,
          kind: 'lesson' as const,
          title: { ru: 'Запись на вождение', kk: 'Жүргізуге жазылу' },
          body: {
            ru: `${who}: запись на ${pretty} в ${item.time}`,
            kk: `${who}: ${pretty} сағат ${item.time}-ге жазылу`,
          },
          time: new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          read: false,
          studentId: item.studentId,
        }
        setNotices((list) => list.some((n) => n.id === notice.id) ? list : [notice, ...list])
        void (async () => {
          try {
            const { saveBookingsMerged, saveNoticesMerged } = await import('./sync')
            await saveBookingsMerged([item])
            await saveNoticesMerged([notice])
          } catch (e) {
            console.warn('[store] addBooking:', e)
          }
        })()
      } else {
        void (async () => {
          try {
            const { saveBookingsMerged } = await import('./sync')
            await saveBookingsMerged([item])
          } catch (e) {
            console.warn('[store] addBooking:', e)
          }
        })()
      }
    },
    cancelBooking: (id, opts) => {
      const booking = bookings.find((b) => b.id === id)
      setBookings((list) => list.filter((b) => b.id !== id))
      if (opts?.notifyStudent && booking) {
        const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
        const notice = {
          id: `n_cancel_${id}_${Date.now().toString(36)}`,
          kind: 'lesson' as const,
          title: { ru: 'Запись на вождение отменена', kk: 'Жүргізуге жазылу болдырылмады' },
          body: {
            ru: `Запись на ${booking.date} в ${booking.time} отменена администратором.`,
            kk: `${booking.date} сағат ${booking.time} жазылуы әкімшімен болдырылмады.`,
          },
          time: stamp,
          read: false,
          studentId: booking.studentId,
        }
        setNotices((list) => [notice, ...list])
        void (async () => {
          try {
            const { saveBookingsMerged, loadSharedKeys, saveSharedKey } = await import('./sync')
            await saveBookingsMerged(bookings.filter((b) => b.id !== id), [id])
            const cloud = await loadSharedKeys(['notices'])
            const prev = Array.isArray(cloud?.notices) ? cloud.notices : []
            await saveSharedKey('notices', [notice, ...prev.filter((n) => n.id !== notice.id)])
          } catch (e) {
            console.warn('[store] cancelBooking:', e)
          }
        })()
      } else {
        void (async () => {
          try {
            const { saveBookingsMerged } = await import('./sync')
            await saveBookingsMerged(bookings.filter((b) => b.id !== id), [id])
          } catch (e) {
            console.warn('[store] cancelBooking:', e)
          }
        })()
      }
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
    },
    learnedSigns,
    toggleSign: (id, known) => {
      const sid = me.id
      if (!sid) return
      setLearnedSigns((prev) => {
        const cur = prev[sid] || []
        const next = known ? [...new Set([...cur, id])] : cur.filter((x) => x !== id)
        return { ...prev, [sid]: next }
      })
    },
    roadSigns,
    setRoadSigns,
    presence,
    maintenanceMode,
    setMaintenanceMode: (on) => setMaintenanceModeState(on),
  }), [
    ready, session, lang, students, me, school, theory, profiles, theoryProgress,
    questions, instructors, reviews, messages, notices, bookings, results,
    learnedSigns, roadSigns, presence, maintenanceMode, deletedRecords,
  ])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

