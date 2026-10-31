// Passkey (WebAuthn) lock for the UI and the data API. Background syncing and the inbox are unaffected.
// - The first passkey needs a one-time setup code, written to data/setup-code while no passkey exists,
//   so nobody else who can reach the app can claim it first. Later passkeys are added from a signed-in session.
// - Sessions are random tokens in an HttpOnly cookie (Secure when the app is served over HTTPS); only their SHA-256
//   is stored.
// - A session locks after the idle timeout (Settings, default 15 min) and at the latest after 30 days.
//   Only real use counts as activity: the app pings /auth/ping on taps and keys, not on background refreshes.
// - Lost every passkey? Run `./halo reset-passkeys` and set up again.
import {
  generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse,
  type AuthenticationResponseJSON, type RegistrationResponseJSON,
} from '@simplewebauthn/server'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { db, getSecret, setSecret } from './db.ts'
import { publicUrl } from './oauth.ts'
import { setting } from './settings.ts'

const COOKIE = 'fl_session'
const SESSION_DAYS = 30
const FLOW_TTL_MS = 5 * 60_000
export const IDLE_CHOICES = [5, 15, 60, 480, 1440] // minutes
const DEFAULT_IDLE = 15
export const idleMinutes = () => getSecret<number>('auth:idleMinutes') ?? DEFAULT_IDLE
const flows = new Map<string, { challenge: string; kind: 'register' | 'login'; at: number }>()
let setupCodeFile = ''

const sha = (s: string) => createHash('sha256').update(s).digest('hex')
const rp = () => { const u = new URL(publicUrl()); return { id: u.hostname, origin: u.origin } }
// Safari won't keep a Secure cookie on http://localhost, so Secure only when the public address is HTTPS.
const secure = () => (publicUrl().startsWith('https:') ? ' Secure;' : '')

export function initAuth(dataDir: string) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS passkeys (
      id TEXT PRIMARY KEY, public_key BLOB NOT NULL, counter INTEGER NOT NULL, transports TEXT, name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')), last_used_at TEXT);
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, passkey_id TEXT, expires_at INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
  `)
  const cols = (db.prepare('PRAGMA table_info(sessions)').all() as { name: string }[]).map(c => c.name)
  if (!cols.includes('last_seen')) db.exec('ALTER TABLE sessions ADD COLUMN last_seen INTEGER')
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now())
  setupCodeFile = `${dataDir}/setup-code`
  if (passkeyCount() === 0 && !existsSync(setupCodeFile)) {
    writeFileSync(setupCodeFile, randomBytes(6).toString('hex').toUpperCase() + '\n', { mode: 0o600 })
    console.log(`No passkey yet. Setup code: ${readFileSync(setupCodeFile, 'utf8').trim()} (also in data/setup-code; ./halo setup-code prints it)`)
  }
}

const passkeyCount = () => (db.prepare('SELECT COUNT(*) AS n FROM passkeys').get() as { n: number }).n

function cookieToken(req: IncomingMessage) {
  const m = /(?:^|;\s*)fl_session=([A-Za-z0-9_-]+)/.exec(req.headers.cookie ?? '')
  return m?.[1] ?? null
}

/** The signed-in session, or null if missing, idle too long, or past 30 days. Extended (cookie) when used. */
export function session(req: IncomingMessage, res?: ServerResponse) {
  const token = cookieToken(req)
  if (!token) return null
  const row = db.prepare('SELECT passkey_id, expires_at, last_seen FROM sessions WHERE token_hash = ?').get(sha(token)) as { passkey_id: string; expires_at: number; last_seen: number | null } | undefined
  if (!row || row.expires_at < Date.now()) return null
  if (row.last_seen && Date.now() - row.last_seen > idleMinutes() * 60_000) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha(token))
    return null
  }
  const full = Date.now() + SESSION_DAYS * 86_400_000
  if (res && full - row.expires_at > 86_400_000) {
    db.prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?').run(full, sha(token))
    setCookie(res, token)
  }
  return { passkeyId: row.passkey_id }
}

function setCookie(res: ServerResponse, token: string, maxAge = SESSION_DAYS * 86_400) {
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly;${secure()} SameSite=Lax; Max-Age=${maxAge}`)
}

function startSession(res: ServerResponse, passkeyId: string) {
  const token = randomBytes(32).toString('base64url')
  db.prepare('INSERT INTO sessions (token_hash, passkey_id, expires_at, last_seen) VALUES (?, ?, ?, ?)').run(sha(token), passkeyId, Date.now() + SESSION_DAYS * 86_400_000, Date.now())
  setCookie(res, token)
}

function newFlow(challenge: string, kind: 'register' | 'login') {
  const now = Date.now()
  for (const [k, v] of flows) if (now - v.at > FLOW_TTL_MS) flows.delete(k)
  const id = randomBytes(16).toString('base64url')
  flows.set(id, { challenge, kind, at: now })
  return id
}

function takeFlow(id: string, kind: 'register' | 'login') {
  const f = flows.get(id)
  flows.delete(id)
  if (!f || f.kind !== kind || Date.now() - f.at > FLOW_TTL_MS) throw new AuthError('This sign-in attempt expired. Try again.')
  return f.challenge
}

export class AuthError extends Error {}

function setupCodeOk(code: unknown) {
  if (!existsSync(setupCodeFile) || typeof code !== 'string') return false
  const want = Buffer.from(readFileSync(setupCodeFile, 'utf8').trim().toUpperCase())
  const got = Buffer.from(code.trim().toUpperCase())
  return want.length === got.length && timingSafeEqual(want, got)
}

export function status(req: IncomingMessage) {
  return { authenticated: !!session(req), setup: passkeyCount() === 0, idleMinutes: idleMinutes() }
}

/** The user is active in the app: push back the idle lock. */
export function ping(req: IncomingMessage) {
  const token = cookieToken(req)
  if (!token || !session(req)) return { ok: false }
  db.prepare('UPDATE sessions SET last_seen = ? WHERE token_hash = ?').run(Date.now(), sha(token))
  return { ok: true }
}

export function setIdleMinutes(minutes: number) {
  if (!IDLE_CHOICES.includes(minutes)) throw new AuthError(`Choose one of ${IDLE_CHOICES.join(', ')} minutes.`)
  setSecret('auth:idleMinutes', minutes)
  return { idleMinutes: minutes }
}

export async function registerOptions(req: IncomingMessage, body: { setupCode?: string }) {
  const signedIn = !!session(req)
  if (!signedIn && !(passkeyCount() === 0 && setupCodeOk(body.setupCode))) {
    throw new AuthError(passkeyCount() === 0 ? 'That setup code is not right.' : 'Sign in with an existing passkey to add another.')
  }
  const existing = db.prepare('SELECT id, transports FROM passkeys').all() as { id: string; transports: string | null }[]
  const options = await generateRegistrationOptions({
    rpName: 'Halo Labs', rpID: rp().id, userName: 'Halo Labs', userDisplayName: setting('HALO_NAME') || 'Halo Labs',
    userID: new TextEncoder().encode('halolabs-owner'), attestationType: 'none',
    excludeCredentials: existing.map(c => ({ id: c.id, transports: c.transports ? JSON.parse(c.transports) : undefined })),
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
  })
  return { flow: newFlow(options.challenge, 'register'), options }
}

export async function registerVerify(req: IncomingMessage, res: ServerResponse, body: { flow: string; response: RegistrationResponseJSON; name?: string; setupCode?: string }) {
  const first = passkeyCount() === 0
  if (!session(req) && !(first && setupCodeOk(body.setupCode))) throw new AuthError('Not allowed to add a passkey.')
  const { id, origin } = rp()
  const v = await verifyRegistrationResponse({ response: body.response, expectedChallenge: takeFlow(body.flow, 'register'), expectedOrigin: origin, expectedRPID: id, requireUserVerification: true })
  if (!v.verified) throw new AuthError('The passkey could not be verified.')
  const c = v.registrationInfo.credential
  const name = (body.name ?? '').trim().slice(0, 60) || `Passkey ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  db.prepare('INSERT INTO passkeys (id, public_key, counter, transports, name) VALUES (?, ?, ?, ?, ?)').run(c.id, Buffer.from(c.publicKey), c.counter, c.transports ? JSON.stringify(c.transports) : null, name)
  if (first) rmSync(setupCodeFile, { force: true })
  if (!session(req)) startSession(res, c.id)
  return { ok: true }
}

export async function loginOptions() {
  if (passkeyCount() === 0) throw new AuthError('No passkey has been set up yet.')
  const options = await generateAuthenticationOptions({ rpID: rp().id, userVerification: 'required' })
  return { flow: newFlow(options.challenge, 'login'), options }
}

export async function loginVerify(res: ServerResponse, body: { flow: string; response: AuthenticationResponseJSON }) {
  const expectedChallenge = takeFlow(body.flow, 'login')
  const row = db.prepare('SELECT id, public_key, counter, transports FROM passkeys WHERE id = ?').get(body.response?.id ?? '') as
    { id: string; public_key: Uint8Array; counter: number; transports: string | null } | undefined
  if (!row) throw new AuthError('That passkey is not registered with Halo Labs.')
  const { id, origin } = rp()
  const v = await verifyAuthenticationResponse({
    response: body.response, expectedChallenge, expectedOrigin: origin, expectedRPID: id, requireUserVerification: true,
    credential: { id: row.id, publicKey: new Uint8Array(row.public_key), counter: row.counter, transports: row.transports ? JSON.parse(row.transports) : undefined },
  })
  if (!v.verified) throw new AuthError('The passkey could not be verified.')
  db.prepare(`UPDATE passkeys SET counter = ?, last_used_at = datetime('now') WHERE id = ?`).run(v.authenticationInfo.newCounter, row.id)
  startSession(res, row.id)
  return { ok: true }
}

export function logout(req: IncomingMessage, res: ServerResponse) {
  const token = cookieToken(req)
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha(token))
  setCookie(res, '', 0)
  return { ok: true }
}

export function listPasskeys(req: IncomingMessage) {
  const current = session(req)?.passkeyId
  return (db.prepare('SELECT id, name, created_at, last_used_at FROM passkeys ORDER BY created_at').all() as { id: string; name: string; created_at: string; last_used_at: string | null }[])
    .map(p => ({ id: p.id, name: p.name, created: p.created_at, lastUsed: p.last_used_at, current: p.id === current }))
}

/** Settings → Delete all data, with "passkeys" ticked: removes every passkey and session (signing everyone out) and
 *  writes a fresh setup code, returned so the page can show it before the lock screen asks for it. */
export function resetPasskeys() {
  db.exec('DELETE FROM sessions; DELETE FROM passkeys;')
  const code = randomBytes(6).toString('hex').toUpperCase()
  writeFileSync(setupCodeFile, code + '\n', { mode: 0o600 })
  console.log(`All passkeys removed. Setup code: ${code} (also in data/setup-code; ./halo setup-code prints it)`)
  return code
}

export function deletePasskey(id: string) {
  if (passkeyCount() <= 1) throw new AuthError('This is your only passkey. Add another before removing it.')
  db.prepare('DELETE FROM sessions WHERE passkey_id = ?').run(id)
  return { removed: Number(db.prepare('DELETE FROM passkeys WHERE id = ?').run(id).changes) }
}
