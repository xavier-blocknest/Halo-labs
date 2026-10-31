// WHOOP API v2 sync. Polling only: there are no webhooks for cycles, and webhooks would need a public URL.
// First run backfills all history; later runs re-fetch the last 3 days because WHOOP rescores records.
// Records are mapped to the same canonical shapes as the CSV export (import/whoop.ts), so they merge.
import { db, readRecords, upsertRecords } from '../db.ts'
import { apiBodyRow, apiCycleRows, apiSleepRows, apiWorkoutRows, type ApiCycle, type ApiRecovery, type ApiSleep, type ApiWorkout } from '../import/whoop.ts'
import { isoSec, type WhoopCycle } from '../model.ts'
import { accessToken } from '../oauth.ts'
import { getJson } from './http.ts'

const BASE = 'https://api.prod.whoop.com/developer'
const RESYNC_DAYS = 3

type Page<T> = { records: T[]; next_token?: string | null }

async function list<T>(path: string, token: string, start?: string): Promise<T[]> {
  const out: T[] = []
  let next: string | null | undefined
  do {
    const q = new URLSearchParams({ limit: '25' })
    if (start) q.set('start', start)
    if (next) q.set('nextToken', next)
    const page = await getJson<Page<T>>('WHOOP', `${BASE}${path}?${q}`, token)
    out.push(...page.records)
    next = page.next_token
  } while (next)
  return out
}

export async function syncWhoop(): Promise<number> {
  const token = await accessToken('whoop')
  // Backfill everything once (the API is the source of truth for anything newer than the last CSV import).
  const synced = db.prepare(`SELECT 1 FROM sync_runs WHERE source = 'whoop' AND ok = 1 LIMIT 1`).get()
  const start = synced ? new Date(Date.now() - RESYNC_DAYS * 86_400_000).toISOString() : undefined

  const cycles = await list<ApiCycle>('/v2/cycle', token, start)
  const recoveries = await list<ApiRecovery>('/v2/recovery', token, start)
  const sleeps = await list<ApiSleep>('/v2/activity/sleep', token, start)
  const workouts = await list<ApiWorkout>('/v2/activity/workout', token, start)
  const body = await getJson<object>('WHOOP', `${BASE}/v2/user/measurement/body`, token)

  const cycleStart = new Map(cycles.map(c => [c.id, isoSec(c.start)]))
  const cycleRows = apiCycleRows(cycles, recoveries)
  noteRescores(cycleRows)
  return upsertRecords([
    ...cycleRows,
    ...apiSleepRows(sleeps, cycleStart),
    ...apiWorkoutRows(workouts),
    apiBodyRow(body),
  ])
}

/** WHOOP can revise a recovery score after first posting it. Keep the earlier values (encrypted, in the record)
 *  so a mismatch with the WHOOP app can be explained later; the newest score always wins. */
function noteRescores(rows: ReturnType<typeof apiCycleRows>) {
  const from = rows.map(r => r.day!).sort()[0]
  if (!from) return
  const stored = new Map(readRecords<WhoopCycle>('whoop', 'cycle', from).map(c => [c.id, c.data]))
  let n = 0
  for (const r of rows) {
    const prev = stored.get(r.id), next = r.data as Partial<WhoopCycle>
    if (prev?.recovery == null || next.recovery == null || prev.recovery === next.recovery) continue
    next.rescores = [...(prev.rescores ?? []), { at: isoSec(new Date().toISOString()), from: prev.recovery }].slice(-5)
    n++
  }
  if (n) console.log(`WHOOP revised ${n} recovery score${n === 1 ? '' : 's'}`)
}

/** Poll faster while the newest cycle is under 14 h old: a cycle starts when you fall asleep, so this covers the
 *  night (recovery pending) and the morning, when WHOOP scores and sometimes revises recovery. */
export function whoopEager() {
  const latest = readRecords<WhoopCycle>('whoop', 'cycle', new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10)).at(-1)
  return !!latest && Date.now() - Date.parse(latest.data.start) < 14 * 3_600_000
}
