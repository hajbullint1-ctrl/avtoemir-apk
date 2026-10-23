import type { L } from './i18n'

export type Category = 'B' | 'B1' | 'C' | 'C1'
export const CATEGORIES: Category[] = ['B', 'B1', 'C', 'C1']

export type DocKey = 'idFront' | 'idBack' | 'psycho' | 'narco'
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

export type School = {
  name: string
  phoneEnrollment: string
  phoneSupport: string
  address: string
  branches: { id: string; name: string; address: string }[]
}

export type Instructor = {
  id: string
  name: string
  phone: string
  car: string
  experience: string
  rating: number
  imageUrl?: string | null
}

export type TheoryTopic = {
  id: string
  title: L
  body: L
  imageUrl?: string | null
  content?: { type: string; text?: L; imageUrl?: string }[]
}

export type Question = {
  id: string
  text: L
  options: L[]
  correctIndex: number
  explanation?: L
  imageUrl?: string | null
}

export type Review = {
  id: string
  author: string
  text: string
  rating: number
  date: string
  visible: boolean
}

export type Message = {
  id: string
  thread: string
  fromMe: boolean
  text: string
  time: string
  studentId?: string
  authorName?: string
}

export type Notice = {
  id: string
  kind: 'lesson' | 'docs' | 'info' | 'announce'
  title: L
  body: L
  time: string
  read: boolean
}

export type Booking = {
  id: string
  instructorId: string
  date: string
  time: string
  studentName?: string
}

export type TestResult = {
  id: string
  date: string
  score: number
  total: number
  studentId?: string
  studentName?: string
}

export type RoadSign = {
  id: string
  title: L
  description: L
  imageUrl?: string | null
  category?: string
}

export const seedSchool: School = {
  name: 'AvtoEmir',
  phoneEnrollment: '',
  phoneSupport: '',
  address: '',
  branches: [],
}

export const seedStudents: Student[] = []
export const seedInstructors: Instructor[] = []
export const seedTheory: TheoryTopic[] = []
export const seedQuestions: Question[] = []
export const seedReviews: Review[] = []
export const seedMessages: Message[] = []
export const seedNotices: Notice[] = []
export const seedRoadSigns: RoadSign[] = []
