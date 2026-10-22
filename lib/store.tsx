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
  learnedSigns: string[]
  toggleSign: (id: string, known: boolean) => void
  roadSigns: RoadSign[]
  setRoadSigns: (s: RoadSign[]) => void
  presence: Record<string, string>
}

const StoreContext = createContext<Store | null>(null)

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

  useEffect(() => {
    setSession(loadSession())
    const p = loadPersisted()
    if (p) {
      if (Array.isArray(p.students)) setStudents(p.students as Student[])
      if (p.school) setSchool(p.school as School)
      if (Array.isArray(p.reviews)) setReviews(p.reviews as Review[])
      if (Array.isArray(p.messages)) setMessages(p.messages as Message[])
      if (Array.isArray(p.notices)) setNotices(p.notices as Notice[])
    }
    ;(async () => {
      if (!isSupabaseConfigured) { setReady(true); return }
      const cloud = await loadSharedFromCloud()
      if (cloud?.students?.length) setStudents(cloud.students)
      if (Array.isArray(cloud?.reviews) && cloud.reviews.length) {
        setReviews((prev) => {
          const m = new Map(prev.map((x) => [x.id, x]))
          for (const r of cloud.reviews!) if (r?.id) m.set(r.id, r)
          return [...m.values()]
        })
      }
      if (cloud?.messages) setMessages(cloud.messages)
      if (cloud?.accounts?.length) mergeAccountsFromCloud(cloud.accounts)
      void hydrateMistakes()
      setReady(true)
    })()
  }, [])

  useEffect(() => {
    if (!ready) return
    savePersisted({ students, school, theory, questions, instructors, reviews, messages, notices, bookings, results, learnedSigns, profiles, theoryProgress, roadSigns })
  }, [ready, students, school, theory, questions, instructors, reviews, messages, notices, bookings, results, learnedSigns, profiles, theoryProgress, roadSigns])

  useEffect(() => {
    if (!ready || !isSupabaseConfigured) return
    const t = setTimeout(() => {
      void saveSharedToCloud({ school, instructors, notices, students, theory, questions, reviews, bookings, accounts: listAccounts(), recovery: listPasswordRecoveryRequests(), results, learnedSigns, profiles, theoryProgress, roadSigns })
    }, 800)
    return () => clearTimeout(t)
  }, [ready, school, instructors, notices, students, theory, questions, reviews, bookings, results, learnedSigns, profiles, theoryProgress, roadSigns])

  const me = useMemo(() => {
    const id = session?.accountId
    return students.find((s) => s.id === id) || students[0] || {
      id: id || 'guest', name: session?.fullName || '', phone: session?.phone || '', category: 'B' as const,
      docs: { idFront: null, idBack: null, psycho: null, narco: null }, status: 'draft' as const, readyDate: null, submittedAt: null,
    }
  }, [students, session])

  const updateStudent = useCallback((id: string, fn: (s: Student) => Student) => {
    setStudents((list) => {
      const next = list.map((s) => (s.id === id ? fn(s) : s))
      void saveSharedKey('students', next)
      return next
    })
  }, [])

  const value = useMemo<Store>(() => ({
    ready, session,
    login: (phone, password) => { const r = loginAccount(phone, password); if (r.ok) setSession(r.session); return r.ok ? { ok: true } : { ok: false, error: r.error } },
    register: (fullName, phone, password) => { const r = registerAccount(fullName, phone, password); if (r.ok) setSession(r.session); return r.ok ? { ok: true } : { ok: false, error: r.error } },
    logout: () => { clearSession(); setSession(null) },
    lang, setLang,
    t: (k) => dict[lang][k] || k,
    tl: (v) => v[lang] || v.ru || '',
    students, me,
    setCategory: (c) => updateStudent(me.id, (s) => ({ ...s, category: c })),
    setDoc: (key, file) => updateStudent(me.id, (s) => ({ ...s, docs: { ...s.docs, [key]: file } })),
    submitDocs: () => updateStudent(me.id, (s) => ({ ...s, status: 'pending', submittedAt: nowStamp() })),
    approveStudent: (id, readyDate) => updateStudent(id, (s) => ({ ...s, status: 'approved', readyDate })),
    rejectStudent: (id) => updateStudent(id, (s) => ({ ...s, status: 'rejected' })),
    resetStudentDocs: (id) => updateStudent(id, (s) => ({ ...s, docs: { idFront: null, idBack: null, psycho: null, narco: null }, status: 'draft', submittedAt: null })),
    deleteStudent: (id) => { if (!id) return; setStudents((list) => { const next = list.filter((s) => s.id !== id); void saveSharedKey('students', next); return next }) },
    school, setSchool, theory, setTheory, profiles, theoryProgress,
    completeLesson: (lessonId) => { const sid = me.id; setTheoryProgress((prev) => ({ ...prev, [sid]: [...new Set([...(prev[sid] || []), lessonId])] })); void upsertTheoryProgress(sid, lessonId) },
    questions, setQuestions, instructors, setInstructors, reviews, setReviews,
    addReview: (r) => { const item = { ...r, id: uid(), date: nowStamp().slice(0, 10), visible: true }; setReviews((list) => { const next = [item, ...list]; void saveSharedKey('reviews', next); return next }) },
    messages,
    sendMessage: (thread, text) => { const msg: Message = { id: uid(), thread, fromMe: true, text, time: nowTime(), studentId: session?.accountId || me.id, authorName: me.name }; setMessages((m) => [...m, msg]); void saveSharedKey('messages', [...messages, msg]) },
    replyAsAdmin: (thread, text, meta) => { const msg: Message = { id: uid(), thread, fromMe: false, text, time: nowTime(), studentId: meta?.studentId, authorName: meta?.authorName || 'AvtoEmir' }; setMessages((m) => [...m, msg]) },
    deleteMessage: (id) => setMessages((m) => m.filter((x) => x.id !== id)),
    deleteChat: (thread) => setMessages((m) => m.filter((x) => x.thread !== thread)),
    notices, markNoticesRead: () => {}, broadcastNotice: () => {}, deleteNotice: (id) => setNotices((n) => n.filter((x) => x.id !== id)),
    bookings, addBooking: (b) => setBookings((list) => [...list, { ...b, id: uid() }]), cancelBooking: (id) => setBookings((list) => list.filter((x) => x.id !== id)),
    results, addResult: (score, total) => setResults((list) => [...list, { id: uid(), score, total, date: nowStamp() }]),
    learnedSigns, toggleSign: (id, known) => setLearnedSigns((list) => known ? [...new Set([...list, id])] : list.filter((x) => x !== id)),
    roadSigns, setRoadSigns, presence,
  }), [ready, session, lang, students, me, school, theory, profiles, theoryProgress, questions, instructors, reviews, messages, notices, bookings, results, learnedSigns, roadSigns, presence, updateStudent])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
