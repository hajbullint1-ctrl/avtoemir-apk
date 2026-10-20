import { getSupabase } from './supabase'

const LS_KEY = 'avtoemir_mistakes_v1'

type LocalMap = Record<string, Record<string, { attempts: number; resolved: boolean }>>

function readLocal(): LocalMap {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}') as LocalMap
  } catch {
    return {}
  }
}

function writeLocal(map: LocalMap) {
  if (typeof window === 'undefined') return
  localStorage.setItem(LS_KEY, JSON.stringify(map))
}

/** Record wrong answer in practice exam */
export async function recordMistake(studentId: string, questionId: string) {
  if (!studentId || !questionId) return

  const sb = getSupabase()
  if (sb) {
    const { error } = await sb.rpc('record_student_mistake', {
      p_student_id: studentId,
      p_question_id: questionId,
    })
    if (!error) return
  }

  const map = readLocal()
  const st = map[studentId] ?? {}
  const cur = st[questionId]
  st[questionId] = {
    attempts: (cur?.attempts ?? 0) + 1,
    resolved: false,
  }
  map[studentId] = st
  writeLocal(map)
}

/** Correct answer in mistakes mode -> resolve */
export async function resolveMistake(studentId: string, questionId: string) {
  if (!studentId || !questionId) return

  const sb = getSupabase()
  if (sb) {
    const { error } = await sb.rpc('resolve_student_mistake', {
      p_student_id: studentId,
      p_question_id: questionId,
    })
    if (!error) return
  }

  const map = readLocal()
  const st = map[studentId] ?? {}
  if (st[questionId]) {
    st[questionId] = { ...st[questionId], resolved: true }
    map[studentId] = st
    writeLocal(map)
  }
}

/** Unresolved mistake question ids for student */
export async function fetchUnresolvedMistakeIds(studentId: string): Promise<string[]> {
  if (!studentId) return []

  const sb = getSupabase()
  if (sb) {
    const { data, error } = await sb
      .from('student_mistakes')
      .select('question_id')
      .eq('student_id', studentId)
      .eq('is_resolved', false)
    if (!error && data) return data.map((r) => r.question_id as string)
  }

  const map = readLocal()
  const st = map[studentId] ?? {}
  return Object.entries(st)
    .filter(([, v]) => !v.resolved)
    .map(([id]) => id)
}
