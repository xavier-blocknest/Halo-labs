// Optional off-site backups to Backblaze B2 (Settings → APIs: B2_KEY_ID, B2_APP_KEY, B2_BUCKET, default "HaloLabs").
// Nightly around 3 AM (and on demand from Settings): a consistent snapshot of the database (VACUUM INTO) plus the
// encrypted original uploads (data/imports), tar.gz'd and then encrypted as a whole with AES-256-GCM under a key
// derived from HALO_DB_KEY. Backblaze only ever sees an encrypted blob named by date. Restoring needs the same
// HALO_DB_KEY: keep it in a password manager, separately from the backups. See server/backup-restore.ts.
import { execFile } from 'node:child_process'
import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { db, getSecret, setSecret } from './db.ts'
import { today } from './dashboard/time.ts'
import { TZ } from './model.ts'
import { setting } from './settings.ts'

const run = promisify(execFile)
const bucket = () => setting('B2_BUCKET') || 'HaloLabs'
const PREFIX = 'backups/'
export const backupsConfigured = () => !!(setting('B2_KEY_ID') && setting('B2_APP_KEY'))

// ---- encryption ---------------------------------------------------------------------------------------------

const MAGIC = Buffer.from('FLBK1')
const backupKey = () => Buffer.from(hkdfSync('sha256', Buffer.from(process.env.HALO_DB_KEY ?? '', 'base64'), Buffer.alloc(0), 'halolabs-backup-v1', 32))

export function encryptBackup(plain: Buffer) {
  const iv = randomBytes(12), c = createCipheriv('aes-256-gcm', backupKey(), iv)
  const body = Buffer.concat([c.update(plain), c.final()])
  return Buffer.concat([MAGIC, iv, body, c.getAuthTag()])
}
export function decryptBackup(blob: Buffer) {
  if (!blob.subarray(0, 5).equals(MAGIC)) throw new Error('Not a Halo Labs backup')
  const iv = blob.subarray(5, 17), tag = blob.subarray(blob.length - 16), d = createDecipheriv('aes-256-gcm', backupKey(), iv)
  d.setAuthTag(tag)
  return Buffer.concat([d.update(blob.subarray(17, blob.length - 16)), d.final()]) // throws if the key is wrong or the file was altered
}

// ---- archive ------------------------------------------------------------------------------------------------

async function makeArchive(root: string) {
  const dir = mkdtempSync(join(tmpdir(), 'halolabs-backup-'))
  try {
    db.exec(`VACUUM INTO '${join(dir, 'halolabs.db').replace(/'/g, "''")}'`) // consistent copy, WAL included
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ app: 'halolabs', version: 1, created: new Date().toISOString(), contents: ['halolabs.db', 'imports/'] }))
    await run('tar', ['-czf', join(dir, 'backup.tar.gz'), '-C', dir, 'manifest.json', 'halolabs.db', '-C', join(root, 'data'), 'imports'])
    return readFileSync(join(dir, 'backup.tar.gz'))
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

// ---- Backblaze B2 (native API v3) -----------------------------------------------------------------------------

type Auth = { token: string; apiUrl: string; downloadUrl: string; bucketId: string }
let auth: Auth | null = null

async function b2(path: string, body: unknown, retry = true): Promise<any> {
  auth ??= await authorize()
  const r = await fetch(`${auth.apiUrl}/b2api/v3/${path}`, { method: 'POST', headers: { Authorization: auth.token }, body: JSON.stringify(body), signal: AbortSignal.timeout(60_000) })
  if (r.status === 401 && retry) { auth = null; return b2(path, body, false) } // token expired (they last 24 h)
  const j = await r.json()
  if (!r.ok) throw new Error(`B2 ${path}: ${j.code ?? r.status} ${j.message ?? ''}`.trim())
  return j
}

async function authorize(): Promise<Auth> {
  const r = await fetch('https://api.backblazeb2.com/b2api/v3/b2_authorize_account', {
    headers: { Authorization: 'Basic ' + Buffer.from(`${setting('B2_KEY_ID')}:${setting('B2_APP_KEY')}`).toString('base64') }, signal: AbortSignal.timeout(30_000) })
  const j = await r.json()
  if (!r.ok) throw new Error(`B2 sign-in failed: ${j.code ?? r.status} ${j.message ?? ''}`.trim())
  const s = j.apiInfo.storageApi
  const a: Auth = { token: j.authorizationToken, apiUrl: s.apiUrl, downloadUrl: s.downloadUrl, bucketId: s.bucketId ?? '' }
  if (!a.bucketId) {
    auth = a
    const b = await b2('b2_list_buckets', { accountId: j.accountId, bucketName: bucket() })
    if (!b.buckets?.[0]) throw new Error(`B2 bucket "${bucket()}" not found`)
    a.bucketId = b.buckets[0].bucketId
  }
  return a
}

async function upload(name: string, data: Buffer) {
  const sha1 = createHash('sha1').update(data).digest('hex')
  for (let attempt = 1; ; attempt++) {
    const u = await b2('b2_get_upload_url', { bucketId: auth?.bucketId ?? (await authorize()).bucketId })
    const r = await fetch(u.uploadUrl, { method: 'POST', body: new Uint8Array(data), signal: AbortSignal.timeout(10 * 60_000),
      headers: { Authorization: u.authorizationToken, 'X-Bz-File-Name': encodeURIComponent(name), 'Content-Type': 'application/octet-stream', 'X-Bz-Content-Sha1': sha1 } })
    const j = await r.json().catch(() => ({}))
    if (r.ok) { if (j.contentSha1 !== sha1) throw new Error('B2 upload checksum mismatch'); return j as { fileId: string; contentLength: number } }
    if (attempt >= 3 || (r.status < 500 && r.status !== 401 && r.status !== 408)) throw new Error(`B2 upload: ${j.code ?? r.status} ${j.message ?? ''}`.trim())
    await new Promise(res => setTimeout(res, attempt * 3000))
  }
}

export type Remote = { name: string; id: string; bytes: number; at: string }
export async function listBackups(): Promise<Remote[]> {
  auth ??= await authorize()
  const out: Remote[] = []
  let start: string | null = null
  do {
    const j = await b2('b2_list_file_names', { bucketId: auth.bucketId, prefix: PREFIX, maxFileCount: 1000, ...(start ? { startFileName: start } : {}) })
    for (const f of j.files) if (f.action === 'upload') out.push({ name: f.fileName, id: f.fileId, bytes: f.contentLength, at: new Date(f.uploadTimestamp).toISOString() })
    start = j.nextFileName
  } while (start)
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

export async function downloadBackup(name: string) {
  auth ??= await authorize()
  const r = await fetch(`${auth.downloadUrl}/file/${encodeURIComponent(bucket())}/${name.split('/').map(encodeURIComponent).join('/')}`, { headers: { Authorization: auth.token }, signal: AbortSignal.timeout(10 * 60_000) })
  if (!r.ok) throw new Error(`B2 download: ${r.status}`)
  return Buffer.from(await r.arrayBuffer())
}

// ---- retention: 14 nightly, one per week for 8 weeks, one per month for 12 months --------------------------

function keepSet(list: Remote[]) {
  const newest = [...list].sort((a, b) => b.at.localeCompare(a.at)), keep = new Set(newest.slice(0, 14).map(f => f.name))
  const week = (iso: string) => { const d = new Date(iso); const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 864e5; return Math.floor((t + 3) / 7) }
  const firstPer = (key: (f: Remote) => string, n: number) => { const seen = new Set<string>(); for (const f of newest) { const k = key(f); if (!seen.has(k) && seen.size < n) { seen.add(k); keep.add(f.name) } } }
  firstPer(f => String(week(f.at)), 8)
  firstPer(f => f.at.slice(0, 7), 12)
  return keep
}

// ---- the job ------------------------------------------------------------------------------------------------

export type BackupStatus = { at: string; ok: boolean; name?: string; bytes?: number; seconds?: number; error?: string; stored?: number; storedBytes?: number; pruned?: number; lastOk?: string }
let running = false
export const backupStatus = () => ({ configured: backupsConfigured(), running, last: getSecret<BackupStatus>('backup:last') })

export async function runBackup(root: string, reason = 'scheduled'): Promise<BackupStatus> {
  if (running) throw new Error('A backup is already running')
  running = true
  const t0 = Date.now(), prev = getSecret<BackupStatus>('backup:last')
  try {
    const blob = encryptBackup(await makeArchive(root))
    const name = `${PREFIX}halolabs-${new Date().toISOString().replace(/:\d\d\.\d+Z$/, 'Z').replace(':', '')}.tar.gz.enc`
    await upload(name, blob)
    const list = await listBackups(), keep = keepSet(list)
    let pruned = 0
    for (const f of list) if (!keep.has(f.name)) { await b2('b2_delete_file_version', { fileName: f.name, fileId: f.id }); pruned++ }
    const kept = list.filter(f => keep.has(f.name))
    const s: BackupStatus = { at: new Date().toISOString(), ok: true, name, bytes: blob.length, seconds: Math.round((Date.now() - t0) / 1000), stored: kept.length, storedBytes: kept.reduce((a, f) => a + f.bytes, 0), pruned }
    s.lastOk = s.at
    setSecret('backup:last', s)
    console.log(`backup (${reason}): ${name} ${(blob.length / 1e6).toFixed(1)} MB in ${s.seconds}s; ${kept.length} stored${pruned ? `, ${pruned} pruned` : ''}`)
    return s
  } catch (e) {
    const s: BackupStatus = { at: new Date().toISOString(), ok: false, error: (e as Error).message, lastOk: prev?.lastOk }
    setSecret('backup:last', s)
    console.error(`backup (${reason}) failed:`, (e as Error).message)
    return s
  } finally { running = false }
}

/** Every 30 minutes: back up once per local day, from 3 AM on (so a Mac that was asleep catches up when it wakes).
 *  Checks for B2 keys on every tick, so adding them in Settings turns backups on without a restart. */
export function startBackups(root: string) {
  const tick = () => {
    if (!backupsConfigured()) return
    const last = getSecret<BackupStatus>('backup:last'), hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', hourCycle: 'h23' }).format(new Date()))
    const lastDay = last?.lastOk ? new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(last.lastOk)) : null
    const failedRecently = last && !last.ok && Date.now() - Date.parse(last.at) < 2 * 3600_000
    if (!running && !failedRecently && (lastDay === null || (lastDay !== today() && hour >= 3))) void runBackup(root)
  }
  setTimeout(tick, 2 * 60_000)
  setInterval(tick, 30 * 60_000)
}
