// Web Push to the athlete's devices (the Mac's browser, or the iPhone Home Screen app through `./halo phone`).
// Payloads are end-to-end encrypted (RFC 8291) with the keys each device gave us, so the push relay (Apple, Mozilla,
// Google) carries ciphertext only. VAPID keys and subscriptions live in the encrypted secrets table.
// Built on node:crypto (no npm package), so this feature arrives through the in-app update without a lockfile change.
//
// What gets sent, all computed from stored data:
//  - the morning call (Hard / Easy / Rest), once a day, when WHOOP's recovery for today first syncs
//  - sync problems: a connector failing 3 times in a row (or rejecting its token), then "back to normal"
//  - calendar reminders: 48 h, 24 h and 30 min before each Calendar item (all-day items: 8 AM two days and one day before)
import { createECDH, createCipheriv, createPrivateKey, generateKeyPairSync, hkdfSync, randomBytes, sign } from 'node:crypto'
import { getSecret, getState, setSecret } from './db.ts'
import { whoopSummary } from './dashboard/whoop.ts'
import { calendarSummary, type CalItem } from './calendar.ts'
import { planSummary } from './dashboard/plan.ts'
import { protocolSummary } from './dashboard/nutrition.ts'
import { testsSummary } from './dashboard/tests.ts'
import { addDays, diffDays, localHour, today } from './dashboard/time.ts'
import { TZ } from './model.ts'
import { publicUrl } from './oauth.ts'

export type PushKind = 'call' | 'problems' | 'calendar'
type Device = { id: string; label: string; endpoint: string; keys: { p256dh: string; auth: string }; created: string; lastSent: string | null }
type Prefs = Record<PushKind, boolean>
type Memo = { callDay?: string; alerted?: Record<string, string>; calSent?: Record<string, string> }

const DEVICES = 'push-devices', VAPID = 'push-vapid', PREFS = 'push-prefs', MEMO = 'push-memo'
const devices = () => getSecret<Device[]>(DEVICES) ?? []
const memo = () => getSecret<Memo>(MEMO) ?? {}
export const prefs = (): Prefs => ({ call: true, problems: true, calendar: true, ...(getSecret<Partial<Prefs>>(PREFS) ?? {}) })

type Vapid = { publicKey: string; jwk: { kty: string; crv: string; x: string; y: string; d: string } }
const b64u = (b: Buffer | Uint8Array) => Buffer.from(b).toString('base64url')

/** The app's VAPID key pair (P-256), made once. publicKey = the uncompressed point, base64url (what browsers want). */
function vapid(): Vapid {
  let k = getSecret<Vapid>(VAPID)
  if (!k?.jwk) {
    const jwk = generateKeyPairSync('ec', { namedCurve: 'prime256v1' }).privateKey.export({ format: 'jwk' }) as Vapid['jwk']
    k = { publicKey: b64u(Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, 'base64url'), Buffer.from(jwk.y, 'base64url')])), jwk }
    setSecret(VAPID, k)
  }
  return k
}

/** VAPID (RFC 8292) Authorization header for one push service. The subject must be https or mailto: the app's own
 *  address when it's https (Tailscale), else the project's page (no email address is sent). */
function vapidHeader(endpoint: string) {
  const k = vapid(), url = publicUrl()
  const sub = url.startsWith('https://') ? url : 'https://github.com/xavier-blocknest/Halo-labs'
  const part = (o: unknown) => b64u(Buffer.from(JSON.stringify(o)))
  const unsigned = `${part({ typ: 'JWT', alg: 'ES256' })}.${part({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub })}`
  const sig = sign('sha256', Buffer.from(unsigned), { key: createPrivateKey({ key: k.jwk, format: 'jwk' }), dsaEncoding: 'ieee-p1363' })
  return `vapid t=${unsigned}.${b64u(sig)}, k=${k.publicKey}`
}

/** RFC 8291 message encryption (aes128gcm, one record) for the device's keys. */
function encrypt(payload: Buffer, p256dh: string, auth: string) {
  const ua = Buffer.from(p256dh, 'base64url'), secret = Buffer.from(auth, 'base64url')
  const ecdh = createECDH('prime256v1'); ecdh.generateKeys()
  const as = ecdh.getPublicKey(), shared = ecdh.computeSecret(ua)
  const ikm = Buffer.from(hkdfSync('sha256', shared, secret, Buffer.concat([Buffer.from('WebPush: info\0'), ua, as]), 32))
  const salt = randomBytes(16)
  const cek = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16))
  const nonce = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12))
  const c = createCipheriv('aes-128-gcm', cek, nonce)
  const body = Buffer.concat([c.update(Buffer.concat([payload, Buffer.from([2])])), c.final(), c.getAuthTag()])
  const rs = Buffer.alloc(4); rs.writeUInt32BE(4096)
  return Buffer.concat([salt, rs, Buffer.from([as.length]), as, body])
}

async function sendPush(d: Device, payload: string, topic: string) {
  const res = await fetch(d.endpoint, {
    method: 'POST', body: encrypt(Buffer.from(payload.slice(0, 3000)), d.keys.p256dh, d.keys.auth), signal: AbortSignal.timeout(15_000),
    headers: { Authorization: vapidHeader(d.endpoint), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: String(12 * 3600), Urgency: 'normal', ...(topic ? { Topic: topic } : {}) },
  })
  if (!res.ok) throw Object.assign(new Error(`${res.status} ${(await res.text().catch(() => '')).slice(0, 120)}`), { statusCode: res.status })
}

export const pushStatus = () => ({
  publicKey: vapid().publicKey,
  prefs: prefs(),
  devices: devices().map(({ keys: _k, ...d }) => ({ ...d, service: new URL(d.endpoint).hostname })),
})

export function subscribe(input: unknown, label: string) {
  const s = input as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } }
  if (typeof s?.endpoint !== 'string' || !/^https:\/\//.test(s.endpoint) || typeof s.keys?.p256dh !== 'string' || typeof s.keys?.auth !== 'string') throw new Error('Not a push subscription')
  const list = devices().filter(d => d.endpoint !== s.endpoint)
  const d: Device = { id: randomBytes(6).toString('hex'), label: label.trim().slice(0, 60) || 'Device', endpoint: s.endpoint,
    keys: { p256dh: s.keys.p256dh, auth: s.keys.auth }, created: new Date().toISOString(), lastSent: null }
  setSecret(DEVICES, [...list, d])
  return d.id
}

export function unsubscribe(id: string) {
  const list = devices(), next = list.filter(d => d.id !== id && d.endpoint !== id)
  setSecret(DEVICES, next)
  return next.length < list.length
}

export function setPrefs(p: Partial<Record<string, unknown>>) {
  const cur = prefs()
  for (const k of ['call', 'problems', 'calendar'] as const) if (typeof p[k] === 'boolean') cur[k] = p[k]
  setSecret(PREFS, cur)
  return cur
}

type Note = { title: string; body: string; tag: string; url?: string }

/** Send to every device (or one). Devices the push service says are gone (404/410) are forgotten. */
export async function notify(n: Note, onlyId?: string): Promise<{ sent: number; failed: string[] }> {
  const list = devices(), targets = list.filter(d => !onlyId || d.id === onlyId)
  const gone = new Set<string>(), failed: string[] = []
  let sent = 0
  await Promise.all(targets.map(async d => {
    try {
      await sendPush(d, JSON.stringify({ ...n, url: n.url ?? '/' }), n.tag.replace(/[^A-Za-z0-9_-]/g, '').slice(-32))
      d.lastSent = new Date().toISOString(); sent++
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) gone.add(d.id)
      failed.push(`${d.label}: ${(e as Error).message}`)
    }
  }))
  setSecret(DEVICES, list.filter(d => !gone.has(d.id)))
  if (failed.length) console.error('push: failed:', failed.join('; '))
  return { sent, failed }
}

// ---- The morning call ---------------------------------------------------------------------------
// Same rules as the Overview's "Today's call" (verdict() / signalsOf() in src/legacy/builders.tsx): keep them in step.

const R = 2, W = 1, G = 0
const pctOf = (a: number | null, b: number | null) => (a == null || !b ? null : Math.round((a - b) / b * 100))
const hm = (min: number | null) => (min == null ? '—' : Math.floor(min / 60) + ':' + String(Math.round(min % 60)).padStart(2, '0'))

export function morningCall(day = today()) {
  const w = whoopSummary(day)
  if (!w || w.latest.day !== day || w.latest.rec == null) return null
  const L = w.latest, rec = w.latest.rec, M = w.avg30, st = (bad: boolean, warn: boolean) => (bad ? R : warn ? W : G)
  // `?? 0` mirrors how the browser compares a missing value (null counts as 0).
  const hrvPct = pctOf(L.hrv, M.hrv) ?? 0
  const respD = L.resp != null && M.resp != null ? +(L.resp - M.resp).toFixed(1) : 0
  const rhrD = L.rhr != null && M.rhr != null ? +(L.rhr - M.rhr).toFixed(1) : 0
  const sleep = L.performance != null ? st(L.performance < 70, L.performance < 85)
    : st((L.sleepMin ?? 0) < (L.needMin ?? 0) * 0.8, (L.sleepMin ?? 0) < (L.needMin ?? 0))
  const load7 = w.load7 ?? 0, load30 = w.load30 ?? 0
  const sig = [st(rec < 34, rec < 67), st(hrvPct <= -20, hrvPct <= -8), st(respD >= 1.5, respD >= 0.6), st(rhrD >= 4, rhrD >= 2), sleep,
    st(load7 > load30 * 1.3, load7 > load30 * 1.1)]
  const reds = sig.filter(s => s === R).length, yellows = sig.filter(s => s === W).length
  let call: 'hard' | 'easy' | 'rest' = (rec < 34 || reds >= 2) ? 'rest' : (rec >= 67 && reds === 0 && yellows <= 1) ? 'hard' : 'easy'
  let injury = ''
  try {
    const inj = JSON.parse(getState()['im4-inj'] ?? '[]') as { area?: string; sev?: string; status?: string }[]
    const hurt = inj.filter(x => x.status !== 'Resolved' && x.sev !== 'Mild')
    if (hurt.length) { call = 'rest'; injury = `Active injury: ${String(hurt[0].area ?? '').toLowerCase()} (${String(hurt[0].sev ?? '').toLowerCase()}).` }
  } catch { /* no injury log */ }
  const zones = testsSummary().vo2.at(-1)?.zones ?? [], z2 = zones.some(z => z.zone === 'Z2'), z1 = zones.some(z => z.zone === 'Z1')
  const word = { hard: 'Train hard', easy: 'Train easy', rest: 'Rest' }[call]
  const what = injury || {
    hard: 'Green light for a quality session.',
    easy: `Keep it aerobic: stay in ${z2 ? 'Zone 2' : 'an easy, conversational effort'}.`,
    rest: `Skip training: easy walk${z1 ? ' in Zone 1' : ''}, mobility, early night.`,
  }[call]
  const hrv = L.hrv != null ? ` · HRV ${Math.round(L.hrv)} ms` : ''
  return { call, title: `Today: ${word}`, body: `Recovery ${Math.round(rec)}%${hrv} · slept ${hm(L.sleepMin)}. ${what}` }
}

/** After each WHOOP sync: send today's call once, the first time today's recovery is in (mornings only). */
export async function maybeSendMorningCall() {
  const day = today(), m = memo()
  if (m.callDay === day || !prefs().call || !devices().length) return
  const c = morningCall(day)
  if (!c) return
  setSecret(MEMO, { ...memo(), callDay: day }) // once a day, even if it arrives too late to send
  const hour = localHour(new Date().toISOString())
  if (hour < 4 || hour >= 14) return
  await notify({ title: c.title, body: c.body, tag: `call-${day}` })
}

// ---- Sync problems ------------------------------------------------------------------------------

const NAMES: Record<string, string> = { whoop: 'WHOOP', strava: 'Strava' }
const failures = new Map<string, number>()
const AUTH = /\b(401|403)\b|invalid_grant|unauthori[sz]ed/i

export async function syncResult(source: string, ok: boolean, error = '') {
  const m = memo(), alerted = { ...(m.alerted ?? {}) }, name = NAMES[source] ?? source
  if (ok) {
    failures.delete(source)
    if (!alerted[source]) return
    delete alerted[source]; setSecret(MEMO, { ...memo(), alerted })
    if (prefs().problems) await notify({ title: `${name} is syncing again`, body: 'Back to normal.', tag: `sync-${source}` })
    return
  }
  const n = (failures.get(source) ?? 0) + 1
  failures.set(source, n)
  if (alerted[source] || !(n >= 3 || AUTH.test(error))) return
  alerted[source] = new Date().toISOString(); setSecret(MEMO, { ...memo(), alerted })
  if (!prefs().problems) return
  const auth = AUTH.test(error)
  await notify({
    title: auth ? `${name} needs you to reconnect` : `${name} sync keeps failing`,
    body: (auth ? 'It rejected the saved login. Open Settings and reconnect. ' : `${n} failures in a row. `) + error.replace(/\s+/g, ' ').slice(0, 120),
    tag: `sync-${source}`,
  })
}

// ---- Calendar reminders -------------------------------------------------------------------------
// Every Calendar item (his own events, dated roadmap milestones, the protocol retest). Checked every minute; each
// reminder is sent once (remembered by item, date, time and offset), and only shortly after it falls due, so a
// late-added event or a restart never sends stale ones.

const OFFSETS = [
  { key: '48h', ms: 48 * 3_600_000, grace: 2 * 3_600_000 },
  { key: '24h', ms: 24 * 3_600_000, grace: 2 * 3_600_000 },
  { key: '30m', ms: 30 * 60_000, grace: 20 * 60_000 },
]
const ALL_DAY_AT = '08:00' // all-day items are reminded at 8 AM two days and one day before (no 30-minute one)

/** The UTC instant of a local wall-clock time in the athlete's time zone (DST-safe). */
function zonedMs(day: string, time: string, tz = TZ) {
  const guess = Date.parse(`${day}T${time}:00Z`)
  const offsetAt = (ms: number) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(new Date(ms)).map(x => [x.type, x.value]))
    return Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`) - ms
  }
  const first = guess - offsetAt(guess)
  return guess - offsetAt(first)
}

const clock = (time: string) => { const [h, m] = time.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}` }
const dayName = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' })

function reminderText(i: CalItem, off: string, now: string) {
  const d = diffDays(i.date, now)
  const when = off === '30m' ? 'In 30 minutes' : d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `In ${d} days, ${dayName(i.date)}`
  // A location that's a web link (often a long tracking URL) is left out: it doesn't read on a lock screen.
  const where = /^\s*(https?:\/\/|www\.)/i.test(i.location) ? '' : i.location
  return [when + (i.time ? ` at ${clock(i.time)}` : ''), where].filter(Boolean).join(' · ')
}

let calCache: { at: number; items: CalItem[] } | null = null
function upcoming() {
  if (calCache && Date.now() - calCache.at < 5 * 60_000) return calCache.items
  const d = today()
  const items = calendarSummary(d, planSummary(d, null), protocolSummary(d)).filter(i => i.daysTo >= 0 && i.daysTo <= 3)
  calCache = { at: Date.now(), items }
  return items
}
/** Call after the athlete edits the calendar, so a new event is seen at the next check. */
export const calendarChanged = () => { calCache = null }

export async function checkCalendar(now = Date.now()) {
  if (!prefs().calendar || !devices().length) return
  const m = memo(), sent = { ...(m.calSent ?? {}) }, due: { i: CalItem; off: string; key: string }[] = []
  for (const i of upcoming()) {
    const start = zonedMs(i.date, i.time ?? ALL_DAY_AT)
    for (const o of OFFSETS) {
      if (!i.time && o.key === '30m') continue
      const at = i.time ? start - o.ms : zonedMs(addDays(i.date, o.key === '48h' ? -2 : -1), ALL_DAY_AT)
      const key = `${i.id}|${i.date}|${i.time ?? ''}|${o.key}`
      if (sent[key] || now < at || now > at + o.grace) continue
      due.push({ i, off: o.key, key })
    }
  }
  if (!due.length) return
  const day = new Date(now).toLocaleDateString('en-CA', { timeZone: TZ }) // the local day at `now`
  for (const x of due) sent[x.key] = new Date(now).toISOString()
  // Forget reminders for items more than a week past.
  for (const [k, v] of Object.entries(sent)) if (now - Date.parse(v) > 10 * 86_400_000) delete sent[k]
  setSecret(MEMO, { ...memo(), calSent: sent })
  for (const x of due) await notify({ title: x.i.title, body: reminderText(x.i, x.off, day), tag: `cal-${x.i.id}-${x.off}`.slice(0, 64) })
}

export function startPushScheduler() {
  setInterval(() => { checkCalendar().catch(e => console.error('push: calendar:', (e as Error).message)) }, 60_000)
}
