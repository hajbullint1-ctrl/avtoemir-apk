import type { L } from './i18n'

export type Category = 'B' | 'B1' | 'C' | 'C1'
export const CATEGORIES: Category[] = ['B', 'B1', 'C', 'C1']

export type DocKey = 'idFront' | 'idBack' | 'psycho' | 'narco'
export const DOC_KEYS: DocKey[] = ['idFront', 'idBack', 'psycho', 'narco']
export type DocFile = { name: string; url: string }
export type DocStatus = 'draft' | 'pending' | 'approved' | 'rejected'

export type Student = {
  id: string
  name: string
  phone: string
  category: Category
  docs: Record<DocKey, DocFile | null>
  status: DocStatus
  readyDate: string | null
  submittedAt: string | null
}

export type Branch = { id: string; city: L; address: L; link: string }
export type School = {
  name: string
  about: L
  hours: L
  phones: string[]
  branches: Branch[]
}

export type TheoryLesson = { id: string; title: L; body: L }
export type TheoryTopic = { id: string; title: L; lessons: number; done: number; content?: TheoryLesson[] }
export type Question = { id: string; q: L; options: L[]; correct: number; explain: L }
export type Instructor = { id: string; name: string; car: string; categories: Category[]; slots: string[] }
export type Review = { id: string; author: string; rating: number; text: string; date: string; visible: boolean }
export type Message = { id: string; thread: string; fromMe: boolean; text: string; time: string }
export type Notice = { id: string; kind: 'lesson' | 'docs' | 'info'; title: L; body: L; time: string; read: boolean }
export type Booking = { id: string; date: string; time: string; instructorId: string }
export type TestResult = { id: string; date: string; score: number; total: number }

export type SignShape = 'prohibit' | 'warning' | 'mandatory' | 'info' | 'stop' | 'yield'
export type RoadSign = { id: string; code: string; shape: SignShape; symbol: string; name: L; meaning: L }

const sampleId: DocFile = { name: 'udostoverenie.png', url: '/images/sample-id.png' }
const sampleCert = (n: string): DocFile => ({ name: n, url: '/images/sample-certificate.png' })

export const seedStudents: Student[] = [
  {
    id: 'me',
    name: 'Айдана Серикова',
    phone: '+7 701 555 12 34',
    category: 'B',
    docs: { idFront: null, idBack: null, psycho: null, narco: null },
    status: 'draft',
    readyDate: null,
    submittedAt: null,
  },
]

export const seedSchool: School = {
  name: 'AvtoEmir',
  about: { ru: 'Автошкола AvtoEmir', kk: 'AvtoEmir автомектебі' },
  hours: { ru: 'Пн–Сб 9:00–18:00', kk: 'Дс–Сб 9:00–18:00' },
  phones: ['+7 701 000 00 00'],
  branches: [],
}

export const seedTheory: TheoryTopic[] = [
  { id: 't1', title: { ru: 'Общие положения и термины', kk: 'Жалпы ережелер мен терминдер' }, lessons: 4, done: 4, content: [{ id: 't1-1', title: { ru: 'Что такое ПДД', kk: 'ЖҚЕ дегеніміз не' }, body: { ru: 'ПДД — нормативный документ о порядке движения ТС и пешеходов в РК.', kk: 'ЖҚЕ — ҚР аумағында көлік пен жаяулардың қозғалыс тәртібі туралы құжат.' } }] },
  { id: 't2', title: { ru: 'Обязанности водителей и пешеходов', kk: 'Жүргізушілер мен жаяулардың міндеттері' }, lessons: 5, done: 3, content: [] },
  { id: 't3', title: { ru: 'Дорожные знаки', kk: 'Жол белгілері' }, lessons: 8, done: 2, content: [] },
  { id: 't4', title: { ru: 'Дорожная разметка', kk: 'Жол таңбасы' }, lessons: 3, done: 0, content: [] },
  { id: 't5', title: { ru: 'Сигналы светофора и регулировщика', kk: 'Бағдаршам мен реттеушінің белгілері' }, lessons: 3, done: 0, content: [] },
  { id: 't6', title: { ru: 'Проезд перекрёстков', kk: 'Қиылыстардан өту' }, lessons: 6, done: 0, content: [] },
  { id: 't7', title: { ru: 'Скорость и обгон', kk: 'Жылдамдық және басып озу' }, lessons: 4, done: 0, content: [] },
  { id: 't8', title: { ru: 'Первая медицинская помощь', kk: 'Алғашқы медициналық көмек' }, lessons: 3, done: 0, content: [] },
]

export const roadSigns: RoadSign[] = [
  { id: 'r1', code: '2.5', shape: 'stop', symbol: 'STOP', name: { ru: 'Движение без остановки запрещено', kk: 'Тоқтамай жүруге тыйым салынады' }, meaning: { ru: 'Остановитесь перед стоп-линией.', kk: 'Тоқтау сызығының алдында тоқтаңыз.' } },
]

export const seedQuestions: Question[] = [
  {
    id: 'q1',
    q: { ru: 'Разрешена ли остановка на пешеходном переходе?', kk: 'Жаяу жүргінші өткелінде тоқтауға бола ма?' },
    options: [
      { ru: 'Разрешена', kk: 'Болады' },
      { ru: 'Запрещена', kk: 'Тыйым салынады' },
      { ru: 'Только ночью', kk: 'Тек түнде' },
    ],
    correct: 1,
    explain: { ru: 'Остановка на пешеходном переходе запрещена.', kk: 'Жаяу жүргінші өткелінде тоқтауға тыйым салынады.' },
  },
]

export const seedInstructors: Instructor[] = [
  { id: 'i1', name: 'Бауыржан Ахметов', car: 'Chevrolet Cobalt • МКПП', categories: ['B', 'B1'], slots: ['09:00', '10:30', '12:00', '14:00', '15:30', '17:00'] },
]

export const seedReviews: Review[] = [
  { id: 'rv1', author: 'Мадина К.', rating: 5, text: 'Отличная автошкола!', date: '2026-09-28', visible: true },
]

export const seedMessages: Message[] = [
  { id: 'm1', thread: 'admin', fromMe: false, text: 'Здравствуйте! Загрузите документы.', time: '09:12' },
]

export const seedNotices: Notice[] = [
  { id: 'n1', kind: 'info', title: { ru: 'Добро пожаловать', kk: 'Қош келдіңіз' }, body: { ru: 'Выберите категорию и загрузите документы.', kk: 'Санатты таңдап, құжаттарды жүктеңіз.' }, time: '2026-10-12 09:00', read: true },
]

export const examRoutes: { id: string; name: L; steps: L[] }[] = [
  { id: 'er1', name: { ru: 'Маршрут №1', kk: '№1 бағыт' }, steps: [{ ru: 'Старт', kk: 'Бастау' }] },
]
