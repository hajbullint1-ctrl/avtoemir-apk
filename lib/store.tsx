'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { dict, type DictKey, type L, type Lang } from './i18n'
import {
  seedInstructors,
  seedMessages,
  seedNotices,
  seedQuestions,
  seedReviews,
  seedSchool,
  seedStudents,
  seedTheory,
  type Booking,
  type Category,
  type DocFile,
  type DocKey,
  type Instructor,
  type Message,
  type Notice,
  type Question,
  type Review,
  type School,
  type Student,
  type TestResult,
  type TheoryTopic,
} from './data'

const uid = () => Math.random().toString(36).slice(2, 10)
const nowTime = () => new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
const nowStamp = () => new Date().toISOString().slice(0, 16).replace('T', ' ')

type Store = {
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
  bookings: Booking[]
  addBooking: (b: Omit<Booking, 'id'>) => void
  cancelBooking: (id: string) => void
  results: TestResult[]
  addResult: (score: number, total: number) => void
  learnedSigns: string[]
  toggleSign: (id: string, known: boolean) => void
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('ru')
  const [students, setStudents] = useState(seedStudents)
  const [school, setSchool] = useState(seedSchool)
  const [theory, setTheory] = useState(seedTheory)
  const [questions, setQuestions] = useState(seedQuestions)
  const [instructors, setInstructors] = useState(seedInstructors)
  const [reviews, setReviews] = useState(seedReviews)
  const [messages, setMessages] = useState(seedMessages)
  const [notices, setNotices] = useState(seedNotices)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [results, setResults] = useState<TestResult[]>([
    { id: 'tr1', date: '2026-10-05', score: 3, total: 5 },
    { id: 'tr2', date: '2026-10-09', score: 4, total: 5 },
  ])
  const [learnedSigns, setLearnedSigns] = useState<string[]>([])

  const updateStudent = useCallback((id: string, patch: (s: Student) => Student) => {
    setStudents((list) => list.map((s) => (s.id === id ? patch(s) : s)))
  }, [])

  const pushNotice = useCallback((n: Omit<Notice, 'id' | 'time' | 'read'>) => {
    setNotices((list) => [{ ...n, id: uid(), time: nowStamp(), read: false }, ...list])
  }, [])

  const value = useMemo<Store>(() => {
    const me = students.find((s) => s.id === 'me')!
    return {
      lang,
      setLang,
      t: (k) => dict[lang][k],
      tl: (v) => v[lang] || v.ru,
      students,
      me,
      setCategory: (c) => updateStudent('me', (s) => ({ ...s, category: c })),
      setDoc: (key, file) =>
        updateStudent('me', (s) => ({
          ...s,
          docs: { ...s.docs, [key]: file },
          status: s.status === 'approved' ? s.status : 'draft',
        })),
      submitDocs: () => {
        updateStudent('me', (s) => ({ ...s, status: 'pending', submittedAt: new Date().toISOString().slice(0, 10) }))
        pushNotice({
          kind: 'docs',
          title: { ru: 'Документы отправлены', kk: 'Құжаттар жіберілді' },
          body: { ru: 'Ожидайте подтверждения администратора.', kk: 'Әкімшінің растауын күтіңіз.' },
        })
      },
      approveStudent: (id, readyDate) => {
        updateStudent(id, (s) => ({ ...s, status: 'approved', readyDate }))
        if (id === 'me') {
          pushNotice({
            kind: 'docs',
            title: { ru: 'Документы подтверждены', kk: 'Құжаттар расталды' },
            body: {
              ru: `Удостоверение будет готово ${new Date(readyDate).toLocaleDateString('ru-RU')}.`,
              kk: `Куәлік ${new Date(readyDate).toLocaleDateString('ru-RU')} дайын болады.`,
            },
          })
        }
      },
      rejectStudent: (id) => {
        updateStudent(id, (s) => ({ ...s, status: 'rejected', readyDate: null }))
        if (id === 'me') {
          pushNotice({
            kind: 'docs',
            title: { ru: 'Документы отклонены', kk: 'Құжаттар қабылданбады' },
            body: { ru: 'Пожалуйста, загрузите документы повторно.', kk: 'Құжаттарды қайта жүктеңіз.' },
          })
        }
      },
      school,
      setSchool,
      theory,
      setTheory,
      questions,
      setQuestions,
      instructors,
      setInstructors,
      reviews,
      setReviews,
      addReview: (r) =>
        setReviews((list) => [{ ...r, id: uid(), date: new Date().toISOString().slice(0, 10), visible: false }, ...list]),
      messages,
      sendMessage: (thread, text) => {
        setMessages((list) => [...list, { id: uid(), thread, fromMe: true, text, time: nowTime() }])
        setTimeout(() => {
          const reply =
            lang === 'kk'
              ? 'Хабарламаңыз үшін рахмет! Жақын арада жауап береміз.'
              : 'Спасибо за сообщение! Мы скоро ответим.'
          setMessages((list) => [...list, { id: uid(), thread, fromMe: false, text: reply, time: nowTime() }])
        }, 1200)
      },
      notices,
      markNoticesRead: () => setNotices((list) => list.map((n) => ({ ...n, read: true }))),
      bookings,
      addBooking: (b) => {
        setBookings((list) => [...list, { ...b, id: uid() }])
        const date = new Date(b.date).toLocaleDateString('ru-RU')
        pushNotice({
          kind: 'lesson',
          title: { ru: 'Занятие забронировано', kk: 'Сабаққа жазылдыңыз' },
          body: { ru: `${date} в ${b.time}. Напомним за 2 часа.`, kk: `${date}, ${b.time}. 2 сағат бұрын еске саламыз.` },
        })
      },
      cancelBooking: (id) => setBookings((list) => list.filter((b) => b.id !== id)),
      results,
      addResult: (score, total) =>
        setResults((list) => [...list, { id: uid(), date: new Date().toISOString().slice(0, 10), score, total }]),
      learnedSigns,
      toggleSign: (id, known) =>
        setLearnedSigns((list) => (known ? Array.from(new Set([...list, id])) : list.filter((x) => x !== id))),
    }
  }, [lang, students, school, theory, questions, instructors, reviews, messages, notices, bookings, results, learnedSigns, updateStudent, pushNotice])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
