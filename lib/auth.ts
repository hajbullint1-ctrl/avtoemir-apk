/** Client-side student accounts + session (localStorage). */

export type Account = {
  id: string
  fullName: string
  phone: string
  /** Password hash: v2:<sha256> or legacy h<hex>. Never store plaintext. */
  passwordHash: string
  /** @deprecated Never store plaintext. Stripped on save. */
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

/** Legacy weak hash — only to verify old accounts until re-login / reset. */
function hashPasswordLegacy(password: string, salt = 'avtoemir-salt-2026'): string {
  let h = 0
  const s = `${salt}:${password}`
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return `h${(h >>> 0).toString(16)}`
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** SHA-256(salt|password|pepper) double-round. Format: v2:<hex> */
export async function hashPasswordAsync(password: string, salt: string): Promise<string> {
  const pepper =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_AUTH_PEPPER?.trim()) ||
    'avtoemir-pepper-v2-2026'
  const hex = await sha256Hex(`${salt}|${password}|${pepper}`)
  const hex2 = await sha256Hex(`${hex}|${salt}|${pepper}`)
  return `v2:${hex2}`
}

/** @deprecated Prefer hashPasswordAsync */
export function hashPassword(password: string, salt = 'avtoemir-salt-2026'): string {
  return hashPasswordLegacy(password, salt)
}

export async function verifyPassword(
  password: string,
  storedHash: string,
  salt: string,
): Promise<boolean> {
  if (!storedHash) return false
  if (storedHash.startsWith('v2:')) {
    const next = await hashPasswordAsync(password, salt)
    return next === storedHash
  }
  return hashPasswordLegacy(password) === storedHash
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

export async function registerAccount(
  fullName: string,
  phone: string,
  password: string,
): Promise<{ ok: true; session: Session } | { ok: false; error: string }> {
  const name = fullName.trim()
  const ph = normalizePhone(phone)
  const pw = password.trim()
  if (name.length < 2) return { ok: false, error: 'name' }
  if (ph.length < 10) return { ok: false, error: 'phone' }
  if (pw.length < 6) return { ok: false, error: 'password' }

  const accounts = loadAccounts()
  if (accounts.some((a) => a.phone === ph)) return { ok: false, error: 'exists' }

  const id = uid()
  const passwordHash = await hashPasswordAsync(pw, id)
  const account: Account = {
    id,
    fullName: name,
    phone: ph,
    passwordHash,
    createdAt: new Date().toISOString(),
  }
  accounts.push(account)
  saveAccounts(accounts)
  return { ok: true, session: createSession(account) }
}

export async function loginAccount(
  phone: string,
  password: string,
): Promise<{ ok: true; session: Session } | { ok: false; error: string }> {
  const ph = normalizePhone(phone)
  const accounts = loadAccounts()
  const account = accounts.find((a) => a.phone === ph)
  if (!account) return { ok: false, error: 'notfound' }
  const ok = await verifyPassword(password.trim(), account.passwordHash, account.id)
  if (!ok) return { ok: false, error: 'password' }
  if (!account.passwordHash.startsWith('v2:')) {
    account.passwordHash = await hashPasswordAsync(password.trim(), account.id)
    saveAccounts(accounts)
  }
  return { ok: true, session: createSession(account) }
}

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

export function getAccountPassword(_accountId: string): string | null {
  return null
}

export async function adminResetPassword(
  accountId: string,
  newPassword: string,
): Promise<{ ok: true; password: string } | { ok: false; error: string }> {
  const pw = newPassword.trim()
  if (pw.length < 6) return { ok: false, error: 'password' }
  const accounts = loadAccounts()
  const idx = accounts.findIndex((a) => a.id === accountId)
  if (idx < 0) return { ok: false, error: 'notfound' }
  const { passwordPlain: _drop, ...rest } = accounts[idx] as Account & { passwordPlain?: string }
  accounts[idx] = {
    ...rest,
    passwordHash: await hashPasswordAsync(pw, accountId),
  }
  saveAccounts(accounts)
  const reqs = loadRecoveryRequests().map((r) =>
    r.accountId === accountId && !r.resolved ? { ...r, resolved: true } : r,
  )
  saveRecoveryRequests(reqs)
  return { ok: true, password: pw }
}

export async function resetPasswordByPhone(
  phone: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ph = normalizePhone(phone)
  const pw = newPassword.trim()
  if (ph.length < 10) return { ok: false, error: 'phone' }
  if (pw.length < 6) return { ok: false, error: 'password' }
  const accounts = loadAccounts()
  const idx = accounts.findIndex((a) => a.phone === ph)
  if (idx < 0) return { ok: false, error: 'notfound' }
  const accountId = accounts[idx].id
  const { passwordPlain: _drop, ...rest } = accounts[idx] as Account & { passwordPlain?: string }
  accounts[idx] = {
    ...rest,
    passwordHash: await hashPasswordAsync(pw, accountId),
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
    token: `${uid()}_${uid()}_${Date.now().toString(36)}`,
    expiresAt: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

/**
 * Guest session for Google Play review / demo.
 * No password, local only — does not create a real account in Supabase.
 */
export function loginAsGuest(): Session {
  const session: Session = {
    accountId: 'guest_play_review',
    fullName: 'Guest / Қонақ',
    phone: '+70000000000',
    token: `guest_${uid()}`,
    expiresAt: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  }
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
  saveAccounts(loadAccounts().filter((a) => a.id !== accountId))
  saveRecoveryRequests(loadRecoveryRequests().filter((r) => r.accountId !== accountId))
  try {
    const sess = loadSession()
    if (sess?.accountId === accountId) clearSession()
  } catch {
    /* ignore */
  }
  return true
}

const ADMIN_SESSION_KEY = 'avtoemir.admin.session.v1'
const ADMIN_PASSWORD =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ADMIN_PASSWORD?.trim()) || ''

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
