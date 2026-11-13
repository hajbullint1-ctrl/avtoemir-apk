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
      if (p.school) setSchoolState({ ...seedSchool, ...(p.school as School) })
      if (Array.isArray(p.theory)) setTheory(ensureTheoryContent(p.theory as TheoryTopic[]))
      if (Array.isArray(p.questions)) setQuestions(p.questions as Question[])
      if (Array.isArray(p.instructors)) setInstructors(p.instructors as Instructor[])
      if (Array.isArray(p.reviews)) setReviews(p.reviews as Review[])
      if (Array.isArray(p.messages)) setMessages(p.messages as Message[])
      if (Array.isArray(p.notices)) setNotices(p.notices as Notice[])
      if (Array.isArray(p.bookings)) setBookings(p.bookings as Booking[])
      if (Array.isArray(p.results)) setResults(p.results as TestResult[])
      if (p.learnedSigns && typeof p.learnedSigns === "object" && !Array.isArray(p.learnedSigns)) setLearnedSigns(p.learnedSigns as Record<string, string[]>)
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
      if (cloud?.students?.length || cloud?.deletedStudentIds?.length) {
        setStudents((prev) => mergeStudents(prev, cloud.students || [], cloud.deletedStudentIds || []))
      }
      if (cloud?.theory?.length) setTheory(ensureTheoryContent(cloud.theory))
      if (cloud?.questions?.length) setQuestions(cloud.questions)
      if (Array.isArray(cloud?.roadSigns) && cloud.roadSigns.length) setRoadSigns(cloud.roadSigns)
      if (Array.isArray(cloud?.reviews) && cloud.reviews.length) setReviews(cloud.reviews)
      if (cloud?.messages) {
        const dropped = new Set(cloud.droppedMessageIds || [])
        setMessages(cloud.messages.filter((m) => !dropped.has(m.id)))
      }
      if (cloud?.bookings) setBookings(cloud.bookings)
      if (cloud?.accounts || cloud?.deletedAccountIds?.length) {
        mergeAccountsFromCloud(cloud.accounts || [], cloud.deletedAccountIds || [])
      }
      if (cloud?.recovery?.length) mergeRecoveryFromCloud(cloud.recovery)
      if (Array.isArray(cloud?.results)) {
        setResults(cloud.results!.length ? mergeById([], cloud.results!) : [])
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
      void saveSharedToCloud({
        school, instructors, students, theory, questions, reviews,
        accounts: listAccounts(), recovery: listPasswordRecoveryRequests(),
        learnedSigns, profiles, theoryProgress, roadSigns,
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
        setStudents((prev) => mergeStudents(prev, cloud.students || [], cloud.deletedStudentIds || []))
      }
      if (cloud.notices) setNotices((prev) => mergeById(prev, cloud.notices!))
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
        setResults(cloud.results)
      }
      if (typeof cloud.maintenanceMode === 'boolean') setMaintenanceModeState(cloud.maintenanceMode)
    }

    // Heavy content rarely (theory, tickets, signs) — was the main egress leak
    const pullHeavy = async () => {
      const cloud = await loadSharedKeys(HEAVY_KEYS)
      if (!cloud) return
      if (Array.isArray(cloud.instructors)) setInstructors(cloud.instructors)
      if (Array.isArray(cloud.theory) && cloud.theory.length) setTheory(() => ensureTheoryContent(cloud.theory!))
      if (Array.isArray(cloud.questions) && cloud.questions.length) setQuestions(cloud.questions)
      if (Array.isArray(cloud.reviews)) setReviews(cloud.reviews)
      if (Array.isArray(cloud.roadSigns) && cloud.roadSigns.length) setRoadSigns(cloud.roadSigns)
      if (Array.isArray(cloud.deletedRecords)) setDeletedRecords(cloud.deletedRecords)
      if (cloud.school?.name) {
        setSchoolState((prev) => ({
          ...prev,
          ...cloud.school!,
          website: cloud.school!.website ?? prev.website,
          instagram: cloud.school!.instagram ?? prev.instagram,
        }))
      }
    }

    void pullLive()
    // Heavy content once per open
    void pullHeavy()

    // Poll every 2 min, only when tab is visible
    const liveId = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        void pullLive()
      }
    }, 120_000)

    const onVisible = () => {
      if (document.visibilityState === 'visible') void pullLive()
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
    loginAsGuest: () => {
      const s = loginAsGuest()
      setSession(s)
      setStudents((list) => {
        if (list.some((x) => x.id === s.accountId)) return list
        const guest: Student = {
          id: s.accountId,
          name: s.fullName,
          phone: s.phone,
          category: 'B',
          docs: { idFront: null, idBack: null, psycho: null, narco: null },
          status: 'draft',
          readyDate: null,
          submittedAt: null,
        }
        return [...list.filter((x) => x.id !== 'me' && x.id !== s.accountId), guest]
      })
    },
    logout: () => { clearSession(); setSession(null) },
    deleteMyAccount: () => {
      const id = session?.accountId
      if (!id) return { ok: false as const, error: 'session' }
      const snapStudent = students.find((s) => s.id === id) || null
      const snapAccount = findAccountById(id)
      deleteAccount(id)
      setStudents((list) => {
        const next = list.filter((s) => s.id !== id && s.id !== 'me')
        void saveSharedKey('students', next)
        return next
      })
      void saveSharedKey('accounts', listAccounts().filter((a) => a.id !== id))
      void saveDeletedBundle({
        addIds: [id],
        addRecords: [{
          id,
          deletedAt: new Date().toISOString(),
          student: snapStudent,
          account: snapAccount,
        }],
      }).then((bundle) => {
        if (bundle.ok) setDeletedRecords(bundle.records)
      })
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
      const snapStudent = students.find((s) => s.id === id) || null
      const snapAccount = findAccountById(id)
      const phone = (snapStudent?.phone || snapAccount?.phone || '').replace(/\D/g, '').slice(-10)
      // Snapshot without heavy docs (keeps deletedRecords small)
      const lightStudent = snapStudent
        ? { ...snapStudent, docs: { idFront: null, idBack: null, psycho: null, narco: null } }
        : null
      const record: DeletedRecord = {
        id,
        deletedAt: new Date().toISOString(),
        student: lightStudent,
        account: snapAccount
          ? { ...snapAccount, passwordHash: snapAccount.passwordHash ? 'v2:deleted' : '' }
          : (lightStudent
              ? {
                  id: lightStudent.id,
                  fullName: lightStudent.name,
                  phone: lightStudent.phone,
                  passwordHash: '',
                  createdAt: new Date().toISOString(),
                }
              : null),
      }
      setDeletedRecords((prev) => [record, ...prev.filter((r) => r.id !== id)].slice(0, 50))
      deleteAccount(id)
      setStudents((list) => list.filter((s) => s.id !== id && s.id !== 'me'))
      setBookings((list) => list.filter((b) => b.studentId !== id))
      setResults((list) => list.filter((r) => r.studentId !== id))
      setMessages((list) => list.filter((m) => m.studentId !== id))
      setTheoryProgress((prev) => {
        if (!prev[id]) return prev
        const { [id]: _d, ...rest } = prev
        return rest
      })
      setLearnedSigns((prev) => {
        if (!prev[id]) return prev
        const { [id]: _d, ...rest } = prev
        return rest
      })
      setPresence((prev) => {
        if (!prev[id]) return prev
        const { [id]: _d, ...rest } = prev
        return rest
      })

      void (async () => {
        try {
          const cloud = await loadSharedKeys([
            'students', 'accounts', 'bookings', 'results', 'messages', 'droppedMessageIds',
            'theoryProgress', 'learnedSigns', 'presence', 'studentMistakes', 'regCredentials',
            'registrationRequests', 'notices',
          ])
          const nextStudents = (cloud?.students || students)
            .filter((s) => s.id !== id && s.id !== 'me')
          const nextAccounts = listAccounts().filter((a) => a.id !== id)
          const nextBookings = (cloud?.bookings || []).filter((b) => b.studentId !== id)
          const nextResults = (cloud?.results || []).filter((r) => r.studentId !== id)
          const nextMessages = (cloud?.messages || []).filter((m) => m.studentId !== id)
          const dropped = [...new Set([...(cloud?.droppedMessageIds || []), ...((cloud?.messages || []).filter((m) => m.studentId === id).map((m) => m.id))])]
          const tp = { ...(cloud?.theoryProgress || {}) }
          delete tp[id]
          const ls = { ...(cloud?.learnedSigns || {}) }
          delete ls[id]
          const pr = { ...(cloud?.presence || {}) }
          delete pr[id]
          const sm = { ...(cloud?.studentMistakes || {}) }
          delete sm[id]
          const cred = { ...(cloud?.regCredentials || {}) }
          if (phone) delete cred[phone]
          const regs = (cloud?.registrationRequests || []).filter(
            (r) => (r.phone || '').replace(/\D/g, '').slice(-10) !== phone,
          )
          // Drop personal notices for this student
          const notices = (cloud?.notices || []).filter((n) => n.studentId !== id)

          await Promise.all([
            saveSharedKey('students', nextStudents),
            saveSharedKey('accounts', nextAccounts),
            saveSharedKey('bookings', nextBookings),
            forceSaveResults(nextResults),
            saveMessagesMerged(nextMessages, (cloud?.messages || []).filter((m) => m.studentId === id).map((m) => m.id)),
            saveSharedKey('theoryProgress', tp),
            saveSharedKey('learnedSigns', ls),
            saveSharedKey('presence', pr),
            saveSharedKey('studentMistakes', sm),
            saveSharedKey('regCredentials', cred),
            saveSharedKey('registrationRequests', regs),
            saveSharedKey('notices', notices),
          ])
          const bundle = await saveDeletedBundle({ addIds: [id], addRecords: [record] })
          if (bundle.ok) setDeletedRecords(bundle.records.slice(0, 50))
          setStudents(nextStudents)
          setBookings(nextBookings)
          setResults(nextResults)
          setMessages(nextMessages)
        } catch (e) {
          console.warn('[store] deleteStudent cloud purge:', e)
        }
      })()
    },
    purgeApprovedStudents: () => {
      const ids = students.filter((s) => s.status === 'approved' && !s.archived).map((s) => s.id)
      if (!ids.length) return 0
      const snaps: DeletedRecord[] = ids.map((id) => {
        const s = students.find((x) => x.id === id) || null
        const a = findAccountById(id)
        return {
          id,
          deletedAt: new Date().toISOString(),
          student: s,
          account: a || (s ? {
            id: s.id,
            fullName: s.name,
            phone: s.phone,
            passwordHash: '',
            createdAt: new Date().toISOString(),
          } : null),
        }
      })
      setDeletedRecords((prev) => {
        const map = new Map<string, DeletedRecord>()
        for (const r of snaps) map.set(r.id, r)
        for (const r of prev) if (!map.has(r.id)) map.set(r.id, r)
        const next = [...map.values()].slice(0, 200)
        void saveSharedKey('deletedRecords', next)
        return next
      })
      for (const id of ids) {
        deleteAccount(id)
      }
      setStudents((list) => {
        const next = list.filter((s) => !ids.includes(s.id) && s.id !== 'me')
        void saveSharedKey('students', next)
        return next
      })
      setBookings((list) => {
        const removed = list.filter((b) => b.studentId && ids.includes(b.studentId)).map((b) => b.id)
        const next = list.filter((b) => !b.studentId || !ids.includes(b.studentId))
        void saveBookingsMerged(next, removed).then((merged) => { if (merged) setBookings(merged) })
        return next
      })
      setResults((list) => {
        const next = list.filter((r) => !r.studentId || !ids.includes(r.studentId))
        void forceSaveResults(next)
        return next
      })
      setMessages((list) => {
        const removed = list.filter((m) => m.studentId && ids.includes(m.studentId)).map((m) => m.id)
        const next = list.filter((m) => !m.studentId || !ids.includes(m.studentId))
        void saveMessagesMerged(next, removed)
        return next
      })
      void (async () => {
        const bundle = await saveDeletedBundle({ addIds: ids, addRecords: snaps })
        if (bundle.ok) setDeletedRecords(bundle.records)
        else console.warn('[store] saveDeletedBundle purge failed')
      })()
      return ids.length
    },
    restoreDeletedAccount: (id) => {
      if (!id) return false
      const rec = deletedRecords.find((r) => r.id === id)
      if (!rec) return false
      if (rec.account && rec.account.passwordHash) {
        restoreAccount(rec.account)
      } else if (rec.account) {
        restoreAccount({ ...rec.account, passwordHash: rec.account.passwordHash || 'v2:restored-needs-reset' })
      } else if (rec.student) {
        restoreAccount({
          id: rec.student.id,
          fullName: rec.student.name,
          phone: rec.student.phone,
          passwordHash: 'v2:restored-needs-reset',
          createdAt: new Date().toISOString(),
        })
      } else {
        return false
      }
      if (rec.student) {
        setStudents((list) => {
          const next = [...list.filter((s) => s.id !== id && s.id !== 'me'), { ...rec.student!, archived: false, archivedAt: null }]
          void saveSharedKey('students', next)
          return next
        })
      }
      setDeletedRecords((prev) => {
        const next = prev.filter((r) => r.id !== id)
        void saveSharedKey('deletedRecords', next)
        return next
      })
      void (async () => {
        const cloud = await loadSharedKeys(['accounts', 'students'])
        const accountsNext = listAccounts()
        const studentsNext = (cloud?.students || []).filter((s) => s.id !== id)
        if (rec.student) studentsNext.push({ ...rec.student, archived: false, archivedAt: null })
        await Promise.all([
          saveSharedKey('accounts', accountsNext),
          saveSharedKey('students', studentsNext),
        ])
        const bundle = await saveDeletedBundle({ removeIds: [id], removeRecordIds: [id] })
        if (bundle.ok) setDeletedRecords(bundle.records)
        else console.warn('[store] saveDeletedBundle restore failed for', id)
      })()
      return true
    },
    purgeDeletedRecord: (id) => {
      if (!id) return
      setDeletedRecords((prev) => prev.filter((r) => r.id !== id))
      void (async () => {
        const bundle = await saveDeletedBundle({ removeRecordIds: [id] })
        if (bundle.ok) setDeletedRecords(bundle.records)
      })()
    },
    deletedRecords,
    school,
    setSchool: (s) => {
      setSchoolState(s)
      void saveSchoolMerged(s).then((merged) => setSchoolState(merged))
    },
    theory,
    setTheory: (t) => {
      setTheory(t)
      void saveContentListSafe('theory', t).then((merged) => {
        if (merged) setTheory(ensureTheoryContent(merged as TheoryTopic[]))
      })
    },
    profiles,
    theoryProgress,
    completeLesson: (lessonId) => {
      const id = session?.accountId
      if (!id || id === 'guest') return
      setTheoryProgress((prev) => {
        const next = { ...prev, [id]: mergeStringLists(prev[id] || [], [lessonId]) }
        void upsertTheoryProgress(id, lessonId)
        return next
      })
    },
    questions,
    setQuestions: (q) => {
      setQuestions(q)
      void saveContentListSafe('questions', q).then((merged) => {
        if (merged) setQuestions(merged)
      })
    },
    instructors,
    setInstructors: (i) => {
      setInstructors(i)
      void saveInstructorsSafe(i).then((merged) => {
        if (merged) setInstructors(merged)
      })
    },
    reviews,
    setReviews: (r) => {
      setReviews(r)
      void saveContentListSafe('reviews', r).then((merged) => {
        if (merged) setReviews(merged)
      })
    },
    addReview: (r) => {
      const item: Review = { ...r, id: uid(), date: nowStamp(), visible: true }
      setReviews((list) => {
        const next = [item, ...list]
        void saveSharedKey('reviews', next)
        return next
      })
    },
    messages,
    sendMessage: (thread, text) => {
      const item: Message = {
        id: uid(),
        thread,
        text,
        fromMe: true,
        time: nowTime(),
        studentId: session?.accountId,
        authorName: session?.fullName,
      }
      setMessages((list) => {
        const next = [...list, item]
        void saveMessagesMerged(next).then((res) => {
          if (res?.messages) setMessages(res.messages.filter((m) => !new Set(res.droppedMessageIds).has(m.id)))
        })
        return next
      })
    },
    replyAsAdmin: (thread, text, meta) => {
      const item: Message = {
        id: uid(),
        thread,
        text,
        fromMe: false,
        time: nowTime(),
        studentId: meta?.studentId,
        authorName: meta?.authorName || 'Admin',
      }
      setMessages((list) => {
        const next = [...list, item]
        void saveMessagesMerged(next).then((res) => {
          if (res?.messages) setMessages(res.messages.filter((m) => !new Set(res.droppedMessageIds).has(m.id)))
        })
        return next
      })
    },
    deleteMessage: (id) => {
      setMessages((list) => {
        const next = list.filter((m) => m.id !== id)
        void saveMessagesMerged(next, [id]).then((res) => {
          if (res?.messages) setMessages(res.messages.filter((m) => !new Set(res.droppedMessageIds).has(m.id)))
        })
        return next
      })
    },
    deleteChat: (thread, studentId) => {
      setMessages((list) => {
        const removed = list.filter((m) => m.thread === thread).map((m) => m.id)
        const next = list.filter((m) => m.thread !== thread)
        void saveMessagesMerged(next, removed).then((res) => {
          if (res?.messages) setMessages(res.messages.filter((m) => !new Set(res.droppedMessageIds).has(m.id)))
        })
        return next
      })
    },
    notices,
    markNoticesRead: () => {
      setNotices((list) => list.map((n) => ({ ...n, read: true })))
    },
    dismissNotice: (id) => {
      setNotices((list) => list.filter((n) => n.id !== id))
    },
    broadcastNotice: (title, body) => {
      const n: Notice = {
        id: uid(),
        kind: 'announce',
        title,
        body,
        time: nowStamp(),
        read: false,
      }
      setNotices((list) => {
        const next = [n, ...list]
        void saveNoticesMerged(next).then((merged) => {
          if (merged) setNotices(merged)
        })
        return next
      })
    },
    deleteNotice: (id) => {
      setNotices((list) => {
        const next = list.filter((n) => n.id !== id)
        void saveNoticesMerged(next, [id]).then((merged) => {
          if (merged) setNotices(merged)
        })
        return next
      })
    },
    bookings,
    addBooking: (b) => {
      const item: Booking = { ...b, id: uid() }
      setBookings((list) => {
        const next = [...list, item]
        void saveBookingsMerged(next).then((merged) => {
          if (merged) setBookings(merged)
        })
        return next
      })
    },
    cancelBooking: (id, opts) => {
      const booking = bookings.find((b) => b.id === id)
      setBookings((list) => {
        const next = list.filter((b) => b.id !== id)
        void saveBookingsMerged(next, [id]).then((merged) => {
          if (merged) setBookings(merged)
        })
        return next
      })
      if (opts?.notifyStudent && booking?.studentId) {
        const n: Notice = {
          id: uid(),
          kind: 'lesson',
          title: { ru: 'Занятие отменено', kk: 'Сабақ болдырылмады' },
          body: {
            ru: `Запись на ${booking.date} в ${booking.time} отменена администратором.`,
            kk: `${booking.date} күні ${booking.time} жазба әкімші тарапынан болдырылмады.`,
          },
          time: nowStamp(),
          read: false,
          studentId: booking.studentId,
        }
        setNotices((list) => {
          const next = [n, ...list]
          void saveNoticesMerged(next)
          return next
        })
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
      resultsIgnoreUntil.current = Date.now() + 5000
      setResults((list) => {
        const next = [item, ...list]
        void forceSaveResults(next)
        return next
      })
    },
    clearResults: () => {
      resultsIgnoreUntil.current = Date.now() + 5000
      setResults([])
      void forceSaveResults([])
    },
    learnedSigns,
    toggleSign: (id, known) => {
      const sid = session?.accountId
      if (!sid) return
      setLearnedSigns((prev) => {
        const mine = prev[sid] || []
        const next = known ? [...new Set([...mine, id])] : mine.filter((x) => x !== id)
        return { ...prev, [sid]: next }
      })
    },
    roadSigns,
    setRoadSigns: (s) => {
      setRoadSigns(s)
      void saveContentListSafe('roadSigns', s).then((merged) => {
        if (merged) setRoadSigns(merged)
      })
    },
    presence,
    maintenanceMode,
    setMaintenanceMode: (on) => {
      setMaintenanceModeState(on)
      void saveSharedKey('maintenanceMode', on)
    },
  }), [ready, session, lang, students, me, school, theory, profiles, theoryProgress, questions, instructors, reviews, messages, notices, bookings, results, learnedSigns, roadSigns, presence, maintenanceMode, deletedRecords, updateStudent])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
