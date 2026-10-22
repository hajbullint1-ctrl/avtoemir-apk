/** Client-side student accounts + session (localStorage). Ready to swap for Supabase/Firebase. */

export type Account = {
  id: string
  fullName: string
  phone: string
  /** Simple salted hash — not for high-security production; replace with server auth when adding Supabase. */
  passwordHash: string
  /** @deprecated Never store plaintext. Stripped on save; kept optional only for reading old data. */
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

/** Optional hook: store registers a debounced push to Supabase. */
let onAccountsChanged: ((list: Account[]) => void) | null = null
let onRecoveryChanged: ((list: PasswordRecoveryRequest[]) => void) | null = null

export function setAccountsCloudHooks(hooks: {
  onAccounts?: (list: Account[]) => void
  onRecovery?: (list: PasswordRecoveryRequest[]) => void
}) {
  onAccountsChanged = hooks.onAccounts ?? null
  onRecoveryChanged = hooks.onRecovery ?? null
}

function stripPlain(list: Account[]): Account[] {
  return list.map(({ passwordPlain: _p, ...a }) => a as Account)
}

function saveAccounts(list: Account[]) {
  const cleaned = stripPlain(list)
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(cleaned))
  onAccountsChanged?.(cleaned)
}

/**
 * Cloud is source of truth for which accounts exist.
 * Local only supplements missing fields. Optional deletedIds tombstones prevent resurrection.
 * Cloud is source of truth; plaintext passwords are never kept.
 */
export function mergeAccountsFromCloud(remote: Account[], deletedIds: string[] = []): Account[] {
  if (!Array.isArray(remote) || remote.length === 0) return loadAccounts()
  const ban = new Set(['me', ...deletedIds])
  const local = loadAccounts()
  const localById = new Map(local.map((a) => [a.id, a]))
  const localByPhone = new Map(local.map((a) => [normalizePhone(a.phone), a]))
  const out: Account[] = []
  const seen = new Set<string>()

  for (const r of remote) {
    if (!r?.id || ban.has(r.id)) continue
    const phone = normalizePhone(r.phone)
    if (phone.replace(/\D/g, '') === '77015551234') continue
    const existing = localById.get(r.id) ?? localByPhone.get(phone)
    const next: Account = {
      ...r,
      id: r.id,
      phone: phone || existing?.phone || r.phone,
      passwordHash: r.passwordHash || existing?.passwordHash || '',
      fullName: r.fullName || existing?.fullName || '',
      createdAt: existing?.createdAt || r.createdAt,
    }
    out.push(next)
    seen.add(next.id)
  }

  for (const a of local) {
    if (!a?.id || ban.has(a.id) || seen.has(a.id)) continue
    out.push(a)
    seen.add(a.id)
  }

  const cleaned = stripPlain(out)
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(cleaned))
  return cleaned
}

export function mergeRecoveryFromCloud(remote: PasswordRecoveryRequest[]): PasswordRecoveryRequest[] {
  if (!Array.isArray(remote)) return loadRecoveryRequests()
  const local = loadRecoveryRequests()
  const byId = new Map(local.map((r) => [r.id, r]))
  for (const r of remote) {
    const prev = byId.get(r.id)
    if (!prev) {
      local.push(r)
      byId.set(r.id, r)
    } else {
      const idx = local.findIndex((x) => x.id === r.id)
      if (idx >= 0) local[idx] = { ...prev, ...r, resolved: prev.resolved || r.resolved }
    }
  }
  localStorage.setItem(RECOVERY_KEY, JSON.stringify(local))
  return local
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
  onRecoveryChanged?.(list)
}

export function listPasswordRecoveryRequests(): PasswordRecoveryRequest[] {
  return loadRecoveryRequests()
}

export function resolvePasswordRecovery(id: string) {
  const list = loadRecoveryRequests().map((r) => (r.id === id ? { ...r, resolved: true } : r))
  saveRecoveryRequests(list)
}

/** @deprecated Plaintext passwords are not stored. Always returns null. */
export function getAccountPassword(_accountId: string): string | null {
  return null
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
  const { passwordPlain: _drop, ...rest } = accounts[idx] as Account & { passwordPlain?: string }
  accounts[idx] = {
    ...rest,
    passwordHash: hashPassword(pw),
  }
  saveAccounts(accounts)
  const reqs = loadRecoveryRequests().map((r) =>
    r.accountId === accountId && !r.resolved ? { ...r, resolved: true } : r,
  )
  saveRecoveryRequests(reqs)
  return { ok: true, password: pw }
}

/**
 * Self-service reset: student sets a new password using registered phone.
 */
export function resetPasswordByPhone(
  phone: string,
  newPassword: string,
): { ok: true } | { ok: false; error: string } {
  const ph = normalizePhone(phone)
  const pw = newPassword.trim()
  if (ph.length < 10) return { ok: false, error: 'phone' }
  if (pw.length < 4) return { ok: false, error: 'password' }
  const accounts = loadAccounts()
  const idx = accounts.findIndex((a) => a.phone === ph)
  if (idx < 0) return { ok: false, error: 'notfound' }
  const accountId = accounts[idx].id
  const { passwordPlain: _drop, ...rest } = accounts[idx] as Account & { passwordPlain?: string }
  accounts[idx] = {
    ...rest,
    passwordHash: hashPassword(pw),
  }
  saveAccounts(accounts)
  const reqs = loadRecoveryRequests().map((r) =>
    r.accountId === accountId && !r.resolved ? { ...r, resolved: true } : r,
  )
  saveRecoveryRequests(reqs)
  return { ok: true }
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

export function deleteAccount(accountId: string): boolean {
  if (!accountId) return false
  const next = loadAccounts().filter((a) => a.id !== accountId)
  saveAccounts(next)
  const recovery = loadRecoveryRequests().filter((r) => r.accountId !== accountId)
  saveRecoveryRequests(recovery)
  try {
    const sess = loadSession()
    if (sess?.accountId === accountId) clearSession()
  } catch {
    /* ignore */
  }
  return true
}

/** Admin gate — session in localStorage after unlock. Password from env only. */
const ADMIN_SESSION_KEY = 'avtoemir.admin.session.v1'
/** Admin password: set NEXT_PUBLIC_ADMIN_PASSWORD on Vercel. */
const ADMIN_PASSWORD =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ADMIN_PASSWORD?.trim()) ||
  ''

export function checkAdminPassword(password: string): boolean {
  const expected = ADMIN_PASSWORD
  if (!expected) {
    console.warn('[auth] NEXT_PUBLIC_ADMIN_PASSWORD is not set')
    return false
  }
  return password.trim() === expected
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
    return Boolean(s?.ok) && Date.now() - (s.at || 0) < 12 * 60 * 60 * 1000
  } catch {
    return false
  }
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_SESSION_KEY)
}
