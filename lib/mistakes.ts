/** Local + optional Supabase tracking of wrong answers for work-on-mistakes mode. */

const LS_KEY = 'avtoemir_student_mistakes'

type MistakeMap = Record<string, string[]> // studentId -> questionIds

function readAll(): MistakeMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as MistakeMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAll(map: MistakeMap) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(map))
  } catch {
    /* ignore quota */
  }
}

export function getMistakeIds(studentId: string): string[] {
  const map = readAll()
  return Array.isArray(map[studentId]) ? [...map[studentId]] : []
}

export function recordMistake(studentId: string, questionId: string) {
  if (!studentId || !questionId) return
  const map = readAll()
  const list = new Set(map[studentId] ?? [])
  list.add(questionId)
  map[studentId] = [...list]
  writeAll(map)
}

export function resolveMistake(studentId: string, questionId: string) {
  if (!studentId || !questionId) return
  const map = readAll()
  map[studentId] = (map[studentId] ?? []).filter((id) => id !== questionId)
  writeAll(map)
}
