/** Client-side student accounts + session (localStorage). Ready to swap for Supabase/Firebase. */

export type Account = {
  id: string
  fullName: string
  phone: string
  /** Simple salted hash — not for high-security production; replace with server auth when adding Supabase. */
  passwordHash: string
  /**
   * Plain password kept only for demo admin recovery (localStorage).
   * In production use server-side reset tokens / SMS OTP — never store plaintext.
   */
  passwordPlain?: string
  createdAt: string
}

export type Session = {
  accountId: string
  fullName: string
  phone: string
  token: string
  expiresAt: number
}

export type PasswordRecoveryRequest = {
  id: string
  accountId: string
  phone: string
  fullName: string
  createdAt: string
  resolved: boolean
}

const ACCOUNTS_KEY = 'avtoemir.accounts.v1'
const SESSION_KEY = 'avtoemir.session.v1'
const RECOVERY_KEY = 'avtoemir.recovery.v1'
const SESSION_DAYS = 90

function uid() {
  return `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

/** Lightweight non-crypto hash for demo; production should use bcrypt/argon2 on a server. */
export function hashPassword(password: string, salt = 'avtoemir-salt-2026'): string {
  let h = 0
  const s = `${salt}:${password}`
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return `h${(h >>> 0).toString(16)}`
}

function loadAccounts(): Account[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveAccounts(list: Account[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list))
}

export function listAccounts(): Account[] {
  return loadAccounts()
}

export function findAccountByPhone(phone: string): Account | null {
  const ph = normalizePhone(phone)
  return loadAccounts().find((a) => a.phone === ph) ?? null
}

export function findAccountById(id: string): Account | null {
  return loadAccounts().find((a) => a.id === id) ?? null
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '').replace(/^8/, '+7')
}

export function registerAccount(
  fullName: string,
  phone: string,
  password: string,
): { ok: true; session: Session } | { ok: false; error: string } {
  const name = fullName.trim()
  const ph = normalizePhone(phone)
  const pw = password.trim()
  if (name.length < 2) return { ok: false, error: 'name' }
  if (ph.length < 10) return { ok: false, error: 'phone' }
  if (pw.length < 4) return { ok: false, error: 'password' }

  const accounts = loadAccounts()
  if (accounts.some((a) => a.phone === ph)) return { ok: false, error: 'exists' }

  const account: Account = {
    id: uid(),
    fullName: name,
    phone: ph,
    passwordHash: hashPassword(pw),
    passwordPlain: pw,
    createdAt: new Date().toISOString(),
  }
  accounts.push(account)
  saveAccounts(accounts)
  const session = createSession(account)
  return { ok: true, session }
}

export function loginAccount(
  phone: string,
  password: string,
): { ok: true; session: Session } | { ok: false; error: string } {
  const ph = normalizePhone(phone)
  const accounts = loadAccounts()
  const account = accounts.find((a) => a.phone === ph)
  if (!account) return { ok: false, error: 'notfound' }
  if (account.passwordHash !== hashPassword(password)) return { ok: false, error: 'password' }
  // Backfill plain for accounts registered before this field existed (only if login succeeds with known password)
  if (!account.passwordPlain) {
    account.passwordPlain = password.trim()
    saveAccounts(accounts)
  }
  const session = createSession(account)
  return { ok: true, session }
}

/**
 * Student "forgot password": if phone is registered, create a recovery request for admin
 * and return success. Does not reveal the password to the student UI.
 */
export function requestPasswordRecovery(
  phone: string,
): { ok: true; maskedPhone: string } | { ok: false; error: string } {
  const ph = normalizePhone(phone)
  if (ph.length < 10) return { ok: false, error: 'phone' }
  const account = loadAccounts().find((a) => a.phone === ph)
  if (!account) return { ok: false, error: 'notfound' }

  const list = loadRecoveryRequests()
  // Avoid spam: one open request per account
  if (!list.some((r) => r.accountId === account.id && !r.resolved)) {
    list.unshift({
      id: uid(),
      accountId: account.id,
      phone: account.phone,
      fullName: account.fullName,
      createdAt: new Date().toISOString(),
      resolved: false,
    })
    saveRecoveryRequests(list)
  }

  const masked = ph.length > 4 ? `${ph.slice(0, 4)}•••${ph.slice(-2)}` : ph
  return { ok: true, maskedPhone: masked }
}

function loadRecoveryRequests(): PasswordRecoveryRequest[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECOVERY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveRecoveryRequests(list: PasswordRecoveryRequest[]) {
  localStorage.setItem(RECOVERY_KEY, JSON.stringify(list))
}

export function listPasswordRecoveryRequests(): PasswordRecoveryRequest[] {
  return loadRecoveryRequests()
}

export function resolvePasswordRecovery(id: string) {
  const list = loadRecoveryRequests().map((r) => (r.id === id ? { ...r, resolved: true } : r))
  saveRecoveryRequests(list)
}

/** Admin: view stored demo password (if available). */
export function getAccountPassword(accountId: string): string | null {
  const a = loadAccounts().find((x) => x.id === accountId)
  return a?.passwordPlain ?? null
}

/** Admin: set a new password for the student. */
export function adminResetPassword(
  accountId: string,
  newPassword: string,
): { ok: true; password: string } | { ok: false; error: string } {
  const pw = newPassword.trim()
  if (pw.length < 4) return { ok: false, error: 'password' }
  const accounts = loadAccounts()
  const idx = accounts.findIndex((a) => a.id === accountId)
  if (idx < 0) return { ok: false, error: 'notfound' }
  accounts[idx] = {
    ...accounts[idx],
    passwordHash: hashPassword(pw),
    passwordPlain: pw,
  }
  saveAccounts(accounts)
  // Mark open recovery requests for this account as resolved
  const reqs = loadRecoveryRequests().map((r) =>
    r.accountId === accountId && !r.resolved ? { ...r, resolved: true } : r,
  )
  saveRecoveryRequests(reqs)
  return { ok: true, password: pw }
}

function createSession(account: Account): Session {
  const session: Session = {
    accountId: account.id,
    fullName: account.fullName,
    phone: account.phone,
    token: uid(),
    expiresAt: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export function loadSession(): Session | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as Session
    if (!s?.token || !s.expiresAt || s.expiresAt < Date.now()) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return s
  } catch {
    return null
  }
}

export function clearSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(SESSION_KEY)
}

export function updateSessionProfile(patch: { fullName?: string }) {
  const s = loadSession()
  if (!s) return
  if (patch.fullName) s.fullName = patch.fullName.trim()
  localStorage.setItem(SESSION_KEY, JSON.stringify(s))
  const accounts = loadAccounts()
  const idx = accounts.findIndex((a) => a.id === s.accountId)
  if (idx >= 0) {
    accounts[idx] = { ...accounts[idx], fullName: s.fullName }
    saveAccounts(accounts)
  }
}

/** Admin gate — password stored hashed in localStorage after first unlock this browser. */
const ADMIN_SESSION_KEY = 'avtoemir.admin.session.v1'
const ADMIN_PASSWORD = 'emir2026' // change in production / move to env

export function checkAdminPassword(password: string): boolean {
  return password.trim() === ADMIN_PASSWORD
}

export function setAdminSession() {
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ ok: true, at: Date.now() }))
}

export function hasAdminSession(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY)
    if (!raw) return false
    const s = JSON.parse(raw)
    // 12h admin session
    return Boolean(s?.ok) && Date.now() - (s.at || 0) < 12 * 60 * 60 * 1000
  } catch {
    return false
  }
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_SESSION_KEY)
}
