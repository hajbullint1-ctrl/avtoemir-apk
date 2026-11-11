import { saveSharedKey, loadSharedKeys } from './sync'
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

async function verifyPassword(password: string, hash: string, accountId: string): Promise<boolean> {
  if (!hash) return false
  if (hash.startsWith('v2:')) {
    const expected = await hashPasswordAsync(password, accountId)
    return expected === hash
  }
  return hashPasswordLegacy(password) === hash || hashPasswordLegacy(password, accountId) === hash
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
    if (!r?.id) continue
    const prev = byId.get(r.id)
    byId.set(r.id, prev ? { ...prev, ...r, resolved: prev.resolved || r.resolved } : r)
  }
  const merged = [...byId.values()]
  saveRecoveryRequests(merged)
  return merged
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

/** Create an account without starting a session (used when admin approves a registration request). */
export async function createAccountSilent(
  fullName: string,
  phone: string,
  password: string,
): Promise<{ ok: true; accountId: string } | { ok: false; error: string }> {
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
  return { ok: true, accountId: id }
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


async function persistAccountsToCloud(accounts: Account[]) {
  try {
    const cloud = await loadSharedKeys(['accounts'])
    const remote = (cloud?.accounts || []) as Account[]
    const map = new Map<string, Account>()
    for (const a of remote) if (a?.id) map.set(a.id, a)
    for (const a of accounts) if (a?.id) map.set(a.id, a)
    await saveSharedKey('accounts', [...map.values()])
  } catch (e) {
    console.warn('[auth] persist accounts:', e)
    await saveSharedKey('accounts', accounts)
  }
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
  accounts[idx] = {
    ...accounts[idx],
    passwordHash: await hashPasswordAsync(pw, accountId),
  }
  saveAccounts(accounts)
  void persistAccountsToCloud(accounts)
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
  accounts[idx] = {
    ...accounts[idx],
    passwordHash: await hashPasswordAsync(pw, accounts[idx].id),
  }
  saveAccounts(accounts)
  void persistAccountsToCloud(accounts)
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

export function loginAsGuest(): Session {
  const account: Account = {
    id: 'guest_play_review',
    fullName: 'Guest Reviewer',
    phone: '+70000000000',
    passwordHash: '',
    createdAt: new Date().toISOString(),
  }
  return createSession(account)
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

export function restoreAccount(account: Account): boolean {
  if (!account?.id || !account.phone) return false
  const list = loadAccounts().filter((a) => a.id !== account.id && a.phone !== account.phone)
  list.push({
    id: account.id,
    fullName: account.fullName || '',
    phone: account.phone,
    passwordHash: account.passwordHash || '',
    createdAt: account.createdAt || new Date().toISOString(),
  })
  saveAccounts(list)
  return true
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
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ADMIN_PASSWORD?.trim()) || 'avtoemir-admin'

export function checkAdminPassword(password: string): boolean {
  return password.trim() === ADMIN_PASSWORD
}

export function setAdminSession() {
  if (typeof window === 'undefined') return
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ at: Date.now() }))
}

export function hasAdminSession(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY)
    if (!raw) return false
    const s = JSON.parse(raw) as { at?: number }
    if (!s?.at || Date.now() - s.at > 12 * 60 * 60 * 1000) {
      localStorage.removeItem(ADMIN_SESSION_KEY)
      return false
    }
    return true
  } catch {
    return false
  }
}

export function clearAdminSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(ADMIN_SESSION_KEY)
}
