// Upload-only tokens, for sending exports straight from the iPhone share sheet (an iOS Shortcut) to POST /hooks/import.
// A token can import files and nothing else: no reading data, no other routes. Only its SHA-256 is stored (encrypted,
// in secrets); the token itself is shown once when created. Repeated bad tokens from one address are slowed down.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { getSecret, setSecret } from './db.ts'

type Token = { id: string; label: string; hash: string; created: string; lastUsed: string | null; uses: number }
const KEY = 'upload-tokens'
const hash = (t: string) => createHash('sha256').update(t).digest()
const all = () => getSecret<Token[]>(KEY) ?? []

export const listUploadTokens = () => all().map(({ hash: _h, ...t }) => t)

export function createUploadToken(label: string) {
  const token = 'flu_' + randomBytes(32).toString('base64url')
  const t: Token = { id: randomBytes(6).toString('hex'), label: label.trim().slice(0, 60) || 'iPhone Shortcut', hash: hash(token).toString('hex'), created: new Date().toISOString(), lastUsed: null, uses: 0 }
  setSecret(KEY, [...all(), t])
  return { id: t.id, label: t.label, token }
}

export function revokeUploadToken(id: string) {
  const list = all(), next = list.filter(t => t.id !== id)
  setSecret(KEY, next)
  return next.length < list.length
}

// Failed attempts per address: 10 in 10 minutes, then refuse until the window passes.
const fails = new Map<string, number[]>()
export function throttled(ip: string) {
  const now = Date.now(), recent = (fails.get(ip) ?? []).filter(t => now - t < 10 * 60_000)
  fails.set(ip, recent)
  return recent.length >= 10
}

/** The token from "Authorization: Bearer flu_…", if it's a live one. Records the use. */
export function checkUploadToken(header: string | undefined, ip: string): boolean {
  const m = /^Bearer\s+(flu_[A-Za-z0-9_-]{20,100})$/.exec(header ?? '')
  const list = all(), h = m ? hash(m[1]) : null
  const hit = h ? list.find(t => timingSafeEqual(Buffer.from(t.hash, 'hex'), h)) : undefined
  if (!hit) { fails.set(ip, [...(fails.get(ip) ?? []), Date.now()]); return false }
  hit.lastUsed = new Date().toISOString(); hit.uses++
  setSecret(KEY, list)
  return true
}
