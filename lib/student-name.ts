import { listAccounts } from './auth'
import type { ProfileRow } from './cloud-features'
import type { Student } from './data'

/** Resolve a student's display name: Supabase profiles.full_name, then account, then student card. */
export function studentFullName(
  studentId: string | undefined,
  authorName: string | undefined,
  profiles: ProfileRow[],
  students: Student[],
): string {
  if (studentId) {
    const fromProfile = profiles.find((p) => p.id === studentId)?.full_name?.trim()
    if (fromProfile) return fromProfile
    const fromAccount = listAccounts().find((a) => a.id === studentId)?.fullName?.trim()
    if (fromAccount) return fromAccount
    const fromStudent = students.find((s) => s.id === studentId)?.name?.trim()
    if (fromStudent) return fromStudent
  }
  return authorName?.trim() || ''
}
