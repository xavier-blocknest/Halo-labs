// Strava API v3 sync, by polling (webhooks would need a public URL).
// Note: stores Strava data permanently and makes it available to the coach. That goes against Strava's
// API Policy (§5.3, §5.5, §6.2); the athlete chose this knowingly on 2026-10-29.
// Activities map to the same canonical records as the bulk-export CSV (import/strava.ts), keyed by id.
import { db, readRecords, upsertRecords } from '../db.ts'
import { apiActivityRow, apiGearRows, type ApiActivity, type ApiAthlete } from '../import/strava.ts'
import type { StravaGear } from '../model.ts'
import { accessToken } from '../oauth.ts'
import { getJson } from './http.ts'

const BASE = 'https://www.strava.com/api/v3'
const RESYNC_DAYS = 7 // catch edits to recent activities
const DETAIL_PER_RUN = 20 // detail calls cost one request each; the read limit is 100 per 15 min

export async function syncStrava(): Promise<number> {
  const token = await accessToken('strava')

  const athlete = await getJson<ApiAthlete>('Strava', `${BASE}/athlete`, token) // bikes and shoes with totals
  let n = upsertRecords(apiGearRows(athlete))
  const gearNames = new Map(readRecords<StravaGear>('strava', 'gear').map(g => [g.id, g.data.name]))

  const latest = db.prepare(`SELECT MAX(day) AS day FROM records WHERE source = 'strava' AND kind = 'activity'`).get() as { day: string | null }
  const after = latest.day ? Math.floor(Date.parse(latest.day) / 1000) - RESYNC_DAYS * 86_400 : 0
  const activities: ApiActivity[] = []
  for (let page = 1; ; page++) {
    const batch = await getJson<ApiActivity[]>('Strava', `${BASE}/athlete/activities?after=${after}&per_page=200&page=${page}`, token)
    activities.push(...batch)
    if (batch.length < 200) break
  }
  const known = new Set(readRecords('strava', 'activity').map(r => r.id))
  n += upsertRecords(activities.map(a => apiActivityRow(a, gearNames)))

  // Detail (calories, device, description) only for activities seen for the first time; older history
  // already has these from the bulk export. Capped per run to stay inside the read limit.
  const fresh = activities.filter(a => !known.has(String(a.id))).sort((a, b) => b.start_date.localeCompare(a.start_date)).slice(0, DETAIL_PER_RUN)
  for (const a of fresh) {
    const d = await getJson<ApiActivity>('Strava', `${BASE}/activities/${a.id}`, token)
    n += upsertRecords([apiActivityRow(d, gearNames)]) // one at a time so a rate limit keeps progress
  }
  return n
}
