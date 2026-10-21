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
import { isSupabaseConfigured, loadMessagesBundle, loadSharedFromCloud, saveSharedKey, saveSharedToCloud } from './sync'
import { hydrateMistakes } from './mistakes'
import { fetchPresence, newerStamp, touchPresence } from './presence'
import { syncCertificateWidget } from './certificate-widget'
import {
  fetchProfiles,
  fetchTheoryProgress,
  upsertProfile,
  upsertTheoryProgress,
  type ProfileRow,
} from './cloud-features'

const DROPPED_KEY = 'avtoemir.droppedMessages'
const SEED_MESSAGE_IDS = new Set(['m1'])

function loadDropped(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = JSON.parse(localStorage.getItem(DROPPED_KEY) || '[]')
    return Array.isArray(raw) ? raw.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

function sameMessages(a: Message[], b: Message[]) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i]?.id !== b[i]?.id || a[i]?.text !== b[i]?.text) return false
  }
  return true
}

function mergeMessageLists(local: Message[], remote: Message[], dropped: Set<string>): Message[] {
  const remoteIds = new Set(remote.map((m) => m?.id).filter(Boolean))
  const seen = new Set<string>()
  const out: Message[] = []
  for (const m of remote) {
    if (!m?.id || dropped.has(m.id) || seen.has(m.id)) continue
    seen.add(m.id)
    out.push(m)
  }
  for (const m of local) {
    if (!m?.id || dropped.has(m.id)) continue
    if (SEED_MESSAGE_IDS.has(m.id) && !remoteIds.has(m.id)) continue
    if (seen.has(m.id)) {
      const index = out.findIndex((item) => item.id === m.id)
      if (index >= 0) out[index] = m
      continue
    }
    seen.add(m.id)
    out.push(m)
  }
  return out
}

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
  resetStudentDocs: (id: string) => void
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
  learnedSigns: string[]
  toggleSign: (id: string, known: boolean) => void
  roadSigns: RoadSign[]
  setRoadSigns: (s: RoadSign[]) => void
  presence: Record<string, string>
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
  const [presence, setPresence] = useState<Record<string, string>>({})
  const [droppedIds, setDroppedIds] = useState<string[]>([])
  const droppedRef = useRef<Set<string>>(new Set())
  const messagesRef = useRef<Message[]>(seedMessages)
  const pendingMessagesRef = useRef(false)
  const publishRevisionRef = useRef(0)
  const publishChainRef = useRef(Promise.resolve())
  const publishRef = useRef<() => void>(() => {})

  const rememberDropped = useCallback((ids: string[]) => {
    let changed = false
    for (const id of ids) {
      if (!id || droppedRef.current.has(id)) continue
      droppedRef.current.add(id)
      changed = true
    }
    if (!changed) return
    const list = [...droppedRef.current].slice(-1000)
    droppedRef.current = new Set(list)
    setDroppedIds(list)
    try {
      localStorage.setItem(DROPPED_KEY, JSON.stringify(list))
    } catch {}
    void saveSharedKey('droppedMessageIds', list)
  }, [])

  const publishMessages = useCallback(() => {
    pendingMessagesRef.current = true
    const revisionAtStart = ++publishRevisionRef.current
    publishChainRef.current = publishChainRef.current
      .then(async () => {
        const revision = revisionAtStart
        const bundle = await loadMessagesBundle()
        if (!bundle) return
        if (bundle.droppedMessageIds.length) rememberDropped(bundle.droppedMessageIds)
        const local = messagesRef.current.filter((m) => m?.id && !droppedRef.current.has(m.id))
        let merged = mergeMessageLists(local, bundle.messages, droppedRef.current)
        merged = mergeMessageLists(messagesRef.current, merged, droppedRef.current)
        const ok = await saveSharedKey('messages', merged)
        if (!ok) return
        if (publishRevisionRef.current === revision) pendingMessagesRef.current = false
        messagesRef.current = mergeMessageLists(messagesRef.current, merged, droppedRef.current)
        setMessages((prev) => (sameMessages(prev, messagesRef.current) ? prev : messagesRef.current))
      })
      .catch((error) => {
        console.warn('[messages]', error)
      })
  }, [rememberDropped])
  publishRef.current = publishMessages

  const absorbMessages = useCallback((remote: Message[] | undefined, remoteDropped?: string[]) => {
    if (remoteDropped?.length) rememberDropped(remoteDropped)
    if (!remote) return
    const remoteIds = new Set(remote.map((m) => m?.id).filter(Boolean))
    const missingLocal = messagesRef.current.some(
      (m) => m?.id && !droppedRef.current.has(m.id) && !SEED_MESSAGE_IDS.has(m.id) && !remoteIds.has(m.id),
    )
    if (missingLocal) pendingMessagesRef.current = true
    setMessages((local) => {
      const merged = mergeMessageLists(local, remote, droppedRef.current)
      if (sameMessages(local, merged)) return local
      messagesRef.current = merged
      return merged
    })
    if (missingLocal) queueMicrotask(() => publishRef.current())
  }, [rememberDropped])

  useEffect(() => {
    let cancelled = false
    const storedDropped = loadDropped()
    if (storedDropped.length) {
      droppedRef.current = new Set(storedDropped)
      setDroppedIds(storedDropped)
    }
    setSession(loadSession())
    const p = loadPersisted()
    if (p) {
      if (Array.isArray(p.students)) setStudents(p.students as Student[])
      if (p.school) setSchool({ ...seedSchool, ...(p.school as School), branches: (p.school as School).branches?.length ? (p.school as School).branches : seedSchool.branches, instagram: (p.school as School).instagram ?? seedSchool.instagram, website: (p.school as School).website ?? seedSchool.website, phoneEnrollment: (p.school as School).phoneEnrollment ?? seedSchool.phoneEnrollment, phoneSupport: (p.school as School).phoneSupport ?? seedSchool.phoneSupport })
      if (Array.isArray(p.theory)) setTheory(ensureTheoryContent(p.theory as TheoryTopic[]))
      if (Array.isArray(p.questions)) setQuestions(p.questions as Question[])
      if (Array.isArray(p.instructors))
        setInstructors((p.instructors as Instructor[]).map((i) => ({ ...i, phone: typeof i.phone === 'string' ? i.phone : '' })))
      if (Array.isArray(p.reviews)) setReviews(p.reviews as Review[])
      if (Array.isArray(p.messages)) {
        const kept = (p.messages as Message[]).filter((m) => m?.id && !droppedRef.current.has(m.id))
        messagesRef.current = kept
        setMessages(kept)
      }
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
        setInstructors(cloud.instructors.map((i) => ({ ...i, phone: typeof i.phone === 'string' ? i.phone : '' })))
      }
      if (cloud?.notices?.length) setNotices(cloud.notices)
      if (cloud?.students?.length) setStudents(cloud.students)
      if (cloud?.theory?.length) setTheory(ensureTheoryContent(cloud.theory))
      if (cloud?.questions?.length) setQuestions(cloud.questions)
      if (cloud?.reviews) setReviews(cloud.reviews)
      if (cloud?.messages) absorbMessages(cloud.messages, cloud.droppedMessageIds)
      if (cloud?.presence) setPresence((prev) => ({ ...prev, ...cloud.presence }))
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
      const live = await fetchPresence()
      if (!cancelled && Object.keys(live).length) {
        setPresence((prev) => {
          const next = { ...prev }
          for (const [id, stamp] of Object.entries(live)) next[id] = newerStamp(prev[id], stamp)
          return next
        })
      }
      const sess = loadSession()
      if (sess?.accountId && sess.fullName) {
        void upsertProfile({ id: sess.accountId, full_name: sess.fullName, phone: sess.phone })
      }
      const localAccounts = listAccounts()
      if (localAccounts.length && (!cloud?.accounts || cloud.accounts.length === 0)) {
        void saveSharedKey('accounts', localAccounts)
      }
      const localRecovery = listPasswordRecoveryRequests()
      if (localRecovery.length && (!cloud?.recovery || cloud.recovery.length === 0)) {
        void saveSharedKey('recovery', localRecovery)
      }
      void hydrateMistakes()
      setReady(true)
    })()

    const unsub = onPersistedChange((data) => {
      if (Array.isArray(data.theory)) setTheory(ensureTheoryContent(data.theory as TheoryTopic[]))
      if (Array.isArray(data.questions)) setQuestions(data.questions as Question[])
      if (Array.isArray(data.students)) setStudents(data.students as Student[])
      if (data.school) setSchool(data.school as School)
      if (Array.isArray(data.instructors))
        setInstructors((data.instructors as Instructor[]).map((i) => ({ ...i, phone: typeof i.phone === 'string' ? i.phone : '' })))
      if (Array.isArray(data.reviews)) setReviews(data.reviews as Review[])
      if (Array.isArray(data.messages)) absorbMessages(data.messages as Message[])
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

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let accTimer: ReturnType<typeof setTimeout> | null = null
    let recTimer: ReturnType<typeof setTimeout> | null = null
    setAccountsCloudHooks({
      onAccounts: (list) => {
        if (accTimer) clearTimeout(accTimer)
        accTimer = setTimeout(() => { void saveSharedKey('accounts', list) }, 600)
      },
      onRecovery: (list) => {
        if (recTimer) clearTimeout(recTimer)
        recTimer = setTimeout(() => { void saveSharedKey('recovery', list) }, 600)
      },
    })
    return () => {
      setAccountsCloudHooks({})
      if (accTimer) clearTimeout(accTimer)
      if (recTimer) clearTimeout(recTimer)
    }
  }, [])

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
        bookings,
        accounts: listAccounts(),
        recovery: listPasswordRecoveryRequests(),
        results,
        learnedSigns,
        profiles,
        theoryProgress,
        roadSigns,
        droppedMessageIds: droppedIds,
      })
    }, 800)
    return () => clearTimeout(t)
  }, [ready, school, instructors, notices, students, theory, questions, reviews, bookings, results, learnedSigns, profiles, theoryProgress, roadSigns, droppedIds])

  useEffect(() => {
    if (!ready || !isSupabaseConfigured) return
    const pull = async () => {
      const cloud = await loadSharedFromCloud()
      if (!cloud) return
      if (cloud.messages) absorbMessages(cloud.messages, cloud.droppedMessageIds)
      else if (cloud.droppedMessageIds?.length) rememberDropped(cloud.droppedMessageIds)
      if (cloud.presence) {
        setPresence((prev) => {
          const next = { ...prev }
          for (const [id, stamp] of Object.entries(cloud.presence!)) next[id] = newerStamp(prev[id], stamp)
          return next
        })
      }
      if (cloud.instructors?.length) {
        setInstructors(cloud.instructors.map((i) => ({ ...i, phone: typeof i.phone === 'string' ? i.phone : '' })))
      }
      if (cloud.school?.name) setSchool((prev) => ({ ...prev, ...cloud.school! }))
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
      const live = await fetchPresence()
      if (Object.keys(live).length) {
        setPresence((prev) => {
          const next = { ...prev }
          for (const [id, stamp] of Object.entries(live)) next[id] = newerStamp(prev[id], stamp)
          return next
        })
      }
      void hydrateMistakes()
    }
    const id = setInterval(pull, 8000)
    return () => clearInterval(id)
  }, [ready])

  useEffect(() => {
    if (!ready || !isSupabaseConfigured) return
    const tick = () => {
      if (pendingMessagesRef.current) {
        publishRef.current()
        return
      }
      void loadMessagesBundle().then((bundle) => {
        if (bundle) absorbMessages(bundle.messages, bundle.droppedMessageIds)
      })
    }
    const id = setInterval(tick, 2000)
    return () => clearInterval(id)
  }, [ready, absorbMessages])

  const me = students.find((s) => s.id === 'me') || students[0] || seedStudents[0]

  useEffect(() => {
    if (!ready || !session?.accountId) return
    const beat = () => {
      void touchPresence(session.accountId).then((stamp) => {
        if (stamp) setPresence((prev) => ({ ...prev, [session.accountId]: stamp }))
      })
    }
    beat()
    const id = setInterval(beat, 15000)
    return () => clearInterval(id)
  }, [ready, session?.accountId])

  const updateStudent = useCallback((id: string, patch: (s: Student) => Student) => {
    setStudents((list) => list.map((s) => (s.id === id ? patch(s) : s)))
  }, [])

  const login = useCallback((phone: string, password: string) => {
    const res = loginAccount(phone, password)
    if (!res.ok) return res
    setSession(res.session)
    const accountId = res.session.accountId
    setStudents((list) => {
      const existing = list.find((s) => s.id === accountId || s.phone === res.session.phone)
      if (existing) {
        return list.map((s) => (s.id === existing.id ? { ...s, id: accountId, name: res.session.fullName, phone: res.session.phone } : s))
      }
      return [
        {
          id: accountId,
          name: res.session.fullName,
          phone: res.session.phone,
          category: 'B' as Category,
          docs: { idFront: null, idBack: null, psycho: null, narco: null },
          status: 'draft' as const,
          readyDate: null,
          submittedAt: null,
        },
        ...list.filter((s) => s.id !== 'me'),
      ]
    })
    void upsertProfile({ id: accountId, full_name: res.session.fullName, phone: res.session.phone })
    return { ok: true as const }
  }, [])

  const register = useCallback((fullName: string, phone: string, password: string) => {
    const res = registerAccount(fullName, phone, password)
    if (!res.ok) return res
    setSession(res.session)
    const me = {
      id: res.session.accountId,
      name: fullName,
      phone,
      category: 'B' as Category,
      docs: { idFront: null, idBack: null, psycho: null, narco: null },
      status: 'draft' as const,
      readyDate: null,
      submittedAt: null,
    }
    setStudents((list) => [me, ...list.filter((s) => s.id !== 'me' && s.id !== me.id)])
    setResults([])
    setBookings([])
    setLearnedSigns([])
    void upsertProfile({ id: res.session.accountId, full_name: fullName, phone })
    return { ok: true as const }
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setSession(null)
  }, [])

  const value = useMemo<Store>(() => {
    const t = (k: DictKey) => dict[lang][k]
    const tl = (v: L) => v[lang]
    return {
      ready,
      session,
      login,
      register,
      logout,
      lang,
      setLang,
      t,
      tl,
      students,
      me,
      setCategory: (c) => updateStudent(me.id, (s) => ({ ...s, category: c })),
      setDoc: (key, file) => updateStudent(me.id, (s) => ({ ...s, docs: { ...s.docs, [key]: file }, status: s.status === 'approved' ? 'approved' : 'draft' })),
      submitDocs: () => updateStudent(me.id, (s) => ({ ...s, status: 'pending', submittedAt: nowStamp() })),
      approveStudent: (id, readyDate) => updateStudent(id, (s) => ({ ...s, status: 'approved', readyDate })),
      rejectStudent: (id) => updateStudent(id, (s) => ({ ...s, status: 'rejected' })),
      resetStudentDocs: (id) => updateStudent(id, (s) => ({ ...s, docs: { idFront: null, idBack: null, psycho: null, narco: null }, status: 'draft', submittedAt: null })),
      school,
      setSchool,
      theory,
      setTheory,
      profiles,
      theoryProgress,
      completeLesson: (lessonId) => {
        const sid = me.id
        setTheoryProgress((prev) => {
          const set = new Set(prev[sid] || [])
          set.add(lessonId)
          return { ...prev, [sid]: [...set] }
        })
        void upsertTheoryProgress(sid, lessonId)
      },
      questions,
      setQuestions,
      instructors,
      setInstructors,
      reviews,
      setReviews,
      addReview: (r) => setReviews((list) => [{ id: uid(), date: nowStamp(), visible: false, ...r }, ...list]),
      messages,
      sendMessage: (thread, text) => {
        const msg: Message = { id: uid(), thread, fromMe: true, text, time: nowTime(), studentId: session?.accountId || me.id, authorName: me.name }
        messagesRef.current = [...messagesRef.current, msg]
        setMessages(messagesRef.current)
        pendingMessagesRef.current = true
        publishRef.current()
      },
      replyAsAdmin: (thread, text, meta) => {
        const msg: Message = {
          id: uid(),
          thread,
          fromMe: false,
          text,
          time: nowTime(),
          studentId: meta?.studentId,
          authorName: meta?.authorName || 'Администрация',
        }
        messagesRef.current = [...messagesRef.current, msg]
        setMessages(messagesRef.current)
        pendingMessagesRef.current = true
        publishRef.current()
      },
      deleteMessage: (id) => {
        messagesRef.current = messagesRef.current.filter((m) => m.id !== id)
        setMessages(messagesRef.current)
        rememberDropped([id])
        pendingMessagesRef.current = true
        publishRef.current()
      },
      deleteChat: (thread, studentId) => {
        const drop = messagesRef.current.filter((m) => m.thread === thread && (!studentId || m.studentId === studentId)).map((m) => m.id)
        messagesRef.current = messagesRef.current.filter((m) => !drop.includes(m.id))
        setMessages(messagesRef.current)
        if (drop.length) rememberDropped(drop)
        pendingMessagesRef.current = true
        publishRef.current()
      },
      notices,
      markNoticesRead: () => setNotices((list) => list.map((n) => ({ ...n, read: true }))),
      broadcastNotice: (title, body) => setNotices((list) => [{ id: uid(), kind: 'announce', title, body, time: nowTime(), read: false }, ...list]),
      deleteNotice: (id) => setNotices((list) => list.filter((n) => n.id !== id)),
      bookings,
      addBooking: (b) => setBookings((list) => [...list, { ...b, id: uid() }]),
      cancelBooking: (id) => setBookings((list) => list.filter((b) => b.id !== id)),
      results,
      addResult: (score, total) => setResults((list) => [{ id: uid(), date: nowStamp(), score, total }, ...list]),
      learnedSigns,
      toggleSign: (id, known) => setLearnedSigns((list) => (known ? Array.from(new Set([...list, id])) : list.filter((x) => x !== id))),
      roadSigns,
      setRoadSigns,
      presence,
    }
  }, [ready, session, login, register, logout, lang, students, school, theory, profiles, theoryProgress, questions, instructors, reviews, messages, notices, bookings, results, learnedSigns, roadSigns, presence, updateStudent, me, rememberDropped])

  useEffect(() => {
    if (!ready || !session) return
    syncCertificateWidget({
      fullName: me.name,
      accountId: session?.accountId ?? me.id,
      date: me.readyDate || me.submittedAt || '',
      status: me.status,
    })
  }, [ready, session, me.name, me.id, me.readyDate, me.submittedAt, me.status])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
