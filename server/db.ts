// SQLite storage. Health data lives in `records`, one row per source record, payload encrypted.
// In the clear: source, kind and local day (to find rows). The natural id is stored inside the payload;
// the row key is a keyed hash of it (crypto.tag), so ids like "<date>|<lab marker>" are not readable.
import { DatabaseSync } from 'node:sqlite'
import { open, seal, tag } from './crypto.ts'

export type Source = 'whoop' | 'strava' | 'fitnessai' | 'runna' | 'macrofactor' | 'labs' | 'dexa' | 'vo2' | 'plan' | 'profile' | 'coach' | 'journal' | 'calendar'

export type RecordRow<T = unknown> = { source: Source; kind: string; id: string; day: string | null; data: T }

export let db: DatabaseSync

export function openDb(path: string) {
  db = new DatabaseSync(path)
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS records (
      source TEXT NOT NULL, kind TEXT NOT NULL, id TEXT NOT NULL,
      day TEXT,                       -- local calendar day (YYYY-MM-DD) the record belongs to
      payload BLOB NOT NULL,          -- encrypted JSON
      synced_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (source, kind, id));
    CREATE INDEX IF NOT EXISTS records_kind_day ON records (source, kind, day);
    CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY, value BLOB NOT NULL, updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS secrets (name TEXT PRIMARY KEY, value BLOB NOT NULL);
    CREATE TABLE IF NOT EXISTS imports (
      id INTEGER PRIMARY KEY, sha256 TEXT NOT NULL UNIQUE, name TEXT NOT NULL, source TEXT, importer TEXT,
      status TEXT NOT NULL,           -- imported | unrecognized | failed
      records INTEGER NOT NULL DEFAULT 0, detail TEXT, archived_as TEXT,
      imported_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS sync_runs (
      id INTEGER PRIMARY KEY, source TEXT NOT NULL, started_at TEXT NOT NULL, finished_at TEXT,
      ok INTEGER, records INTEGER, detail TEXT);
  `)
}

/** Fail at startup if HALO_DB_KEY can't decrypt the stored data, instead of serving errors and sealing new
 *  records with a different key than the old ones. */
export function verifyKey() {
  const row = db.prepare('SELECT payload FROM records LIMIT 1').get() as { payload: Uint8Array } | undefined
  if (!row) return
  try { open(row.payload) } catch { throw new Error('HALO_DB_KEY does not decrypt data/halolabs.db: wrong key in .env (check for a second HALO_DB_KEY line)') }
}

/** Insert or update. Updates merge field by field: a value that is null/undefined in the new row keeps
 *  the stored one, so a CSV export and the API can each fill in what they know about the same event. */
export function upsertRecords(rows: RecordRow[]) {
  const get = db.prepare('SELECT day, payload FROM records WHERE source = ? AND kind = ? AND id = ?')
  const stmt = db.prepare(`INSERT INTO records (source, kind, id, day, payload) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (source, kind, id) DO UPDATE SET day = excluded.day, payload = excluded.payload, synced_at = datetime('now')`)
  db.exec('BEGIN')
  try {
    for (const r of rows) {
      const key = recordKey(r.source, r.kind, r.id)
      const prev = get.get(r.source, r.kind, key) as { day: string | null; payload: Uint8Array } | undefined
      const next = { ...(r.data as Record<string, unknown>), _id: r.id }
      const data = prev ? merge(open<Record<string, unknown>>(prev.payload), next) : next
      stmt.run(r.source, r.kind, key, r.day ?? prev?.day ?? null, seal(data))
    }
    db.exec('COMMIT')
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
  return rows.length
}

export const recordKey = (source: Source, kind: string, id: string) => tag(`${source}|${kind}|${id}`)

function merge(prev: Record<string, unknown>, next: Record<string, unknown>) {
  const out = { ...prev }
  for (const [k, v] of Object.entries(next)) if (v !== null && v !== undefined) out[k] = v
  return out
}

export function readRecords<T>(source: Source, kind: string, fromDay?: string): RecordRow<T>[] {
  const rows = (fromDay
    ? db.prepare('SELECT source, kind, id, day, payload FROM records WHERE source = ? AND kind = ? AND day >= ? ORDER BY day').all(source, kind, fromDay)
    : db.prepare('SELECT source, kind, id, day, payload FROM records WHERE source = ? AND kind = ? ORDER BY day').all(source, kind)
  ) as { source: Source; kind: string; id: string; day: string | null; payload: Uint8Array }[]
  return rows.map(r => {
    const { _id, ...data } = open<Record<string, unknown>>(r.payload)
    return { source: r.source, kind: r.kind, id: String(_id), day: r.day, data: data as T }
  })
}

/** Delete one record by its natural id, or every record of a kind. */
export function deleteRecord(source: Source, kind: string, id: string) {
  return Number(db.prepare('DELETE FROM records WHERE source = ? AND kind = ? AND id = ?').run(source, kind, recordKey(source, kind, id)).changes)
}
export function deleteKind(source: Source, kind: string) {
  return Number(db.prepare('DELETE FROM records WHERE source = ? AND kind = ?').run(source, kind).changes)
}

export function deleteSource(source: Source) {
  return Number(db.prepare('DELETE FROM records WHERE source = ?').run(source).changes)
}

export function sourceSummary() {
  return db.prepare(`SELECT source, kind, COUNT(*) AS n, MIN(day) AS first, MAX(day) AS last, MAX(synced_at) AS synced
    FROM records GROUP BY source, kind ORDER BY source, kind`).all() as { source: string; kind: string; n: number; first: string; last: string; synced: string }[]
}

/** Settings → Delete all data: every record, saved state, import log entry and sync run, and every secret except
 *  the ones named in `keep` (passkeys and sessions live in their own tables and stay). Then compacts the file so the
 *  deleted rows don't linger on disk. */
export function wipeData(keep: string[]) {
  db.exec('BEGIN')
  try {
    db.exec('DELETE FROM records; DELETE FROM state; DELETE FROM imports; DELETE FROM sync_runs;')
    db.prepare(`DELETE FROM secrets WHERE name NOT IN (${keep.map(() => '?').join(', ')})`).run(...keep)
    db.exec('COMMIT')
  } catch (e) { db.exec('ROLLBACK'); throw e }
  db.exec('PRAGMA wal_checkpoint(TRUNCATE); VACUUM;')
}

export function getSecret<T>(name: string): T | null {
  const row = db.prepare('SELECT value FROM secrets WHERE name = ?').get(name) as { value: Uint8Array } | undefined
  return row ? open<T>(row.value) : null
}

export function setSecret(name: string, value: unknown | null) {
  if (value === null) db.prepare('DELETE FROM secrets WHERE name = ?').run(name)
  else db.prepare('INSERT INTO secrets (name, value) VALUES (?, ?) ON CONFLICT (name) DO UPDATE SET value = excluded.value').run(name, seal(value))
}

export function getState(): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM state').all() as { key: string; value: Uint8Array }[]
  return Object.fromEntries(rows.map(r => [r.key, open<string>(r.value)]))
}

export function setState(key: string, value: string | null) {
  if (value === null) db.prepare('DELETE FROM state WHERE key = ?').run(key)
  else db.prepare(`INSERT INTO state (key, value) VALUES (?, ?)
    ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`).run(key, seal(value))
}

export function startRun(source: string) {
  return Number(db.prepare(`INSERT INTO sync_runs (source, started_at) VALUES (?, datetime('now'))`).run(source).lastInsertRowid)
}

export function finishRun(id: number, ok: boolean, records: number, detail = '') {
  db.prepare(`UPDATE sync_runs SET finished_at = datetime('now'), ok = ?, records = ?, detail = ? WHERE id = ?`).run(ok ? 1 : 0, records, detail.slice(0, 500), id)
}

export function lastRuns() {
  return db.prepare(`SELECT source, MAX(finished_at) AS last_ok FROM sync_runs WHERE ok = 1 GROUP BY source`).all() as { source: string; last_ok: string }[]
}

export function lastError(source: string) {
  return db.prepare(`SELECT finished_at, detail FROM sync_runs WHERE source = ? AND ok = 0 ORDER BY id DESC LIMIT 1`).get(source) as { finished_at: string; detail: string } | undefined
}

export function findImport(sha256: string) {
  return db.prepare('SELECT status, imported_at FROM imports WHERE sha256 = ?').get(sha256) as { status: string; imported_at: string } | undefined
}

export function logImport(e: { sha256: string; name: string; source?: string; importer?: string; status: string; records?: number; detail?: string; archivedAs?: string }) {
  db.prepare(`INSERT INTO imports (sha256, name, source, importer, status, records, detail, archived_as) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (sha256) DO UPDATE SET name = excluded.name, source = excluded.source, importer = excluded.importer, status = excluded.status,
      records = excluded.records, detail = excluded.detail, archived_as = excluded.archived_as, imported_at = datetime('now')`)
    .run(e.sha256, seal(e.name).toString('base64'), e.source ?? null, e.importer ?? null, e.status, e.records ?? 0,
      e.detail ? seal(e.detail.slice(0, 1000)).toString('base64') : null, e.archivedAs ?? null)
}

export function recentImports(limit = 50) {
  const rows = db.prepare('SELECT name, source, importer, status, records, detail, imported_at FROM imports ORDER BY id DESC LIMIT ?').all(limit) as
    { name: string; source: string; importer: string; status: string; records: number; detail: string | null; imported_at: string }[]
  const unseal = (v: string | null) => (v ? open<string>(Buffer.from(v, 'base64')) : null)
  return rows.map(r => ({ ...r, name: unseal(r.name), detail: unseal(r.detail) }))
}
