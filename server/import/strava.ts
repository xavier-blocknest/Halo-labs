// Strava: the bulk export's activities.csv, and the API mappers used by the connector.
// Both key activities by Strava activity id, so exports and API syncs merge into the same rows.
import type { RecordRow } from '../db.ts'
import { dayOf, isoSec, num, type StravaActivity, type StravaGear } from '../model.ts'
import { columns, hasColumns, type Importer } from './files.ts'

const MONTHS: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 }

/** Export dates look like "Oct 28, 2026, 12:35:40 AM" and are UTC. */
export function parseExportDate(s: string): string | null {
  const m = /^([A-Z][a-z]{2}) (\d{1,2}), (\d{4}),? (\d{1,2}):(\d{2}):(\d{2}) ?(AM|PM)$/.exec(s.trim())
  if (!m) return null
  let h = Number(m[4]) % 12
  if (m[7] === 'PM') h += 12
  return isoSec(new Date(Date.UTC(Number(m[3]), MONTHS[m[1]], Number(m[2]), h, Number(m[5]), Number(m[6]))).toISOString())
}

export const stravaCsv: Importer = {
  id: 'strava-activities-csv', source: 'strava', label: 'Strava activities (bulk export CSV)',
  detect: f => hasColumns(f, 'Activity ID', 'Activity Date', 'Activity Type'),
  parse(f) {
    const c = columns(f.csv!.header)
    return f.csv!.rows.flatMap(r => {
      const id = c(r, 'Activity ID'), start = parseExportDate(c(r, 'Activity Date') ?? '')
      if (!id || !start) return []
      // Duplicate headers: the second "Distance"/"Elapsed Time"/... columns are the precise SI values.
      const data: StravaActivity = {
        start, name: c(r, 'Activity Name') ?? '', type: c(r, 'Activity Type') ?? 'Workout', description: c(r, 'Activity Description'),
        elapsedS: num(c(r, 'Elapsed Time', 1) ?? c(r, 'Elapsed Time')), movingS: num(c(r, 'Moving Time')),
        distanceM: num(c(r, 'Distance', 1)), elevGainM: num(c(r, 'Elevation Gain')),
        avgHr: num(c(r, 'Average Heart Rate')), maxHr: num(c(r, 'Max Heart Rate', 1) ?? c(r, 'Max Heart Rate')),
        avgSpeed: num(c(r, 'Average Speed')), maxSpeed: num(c(r, 'Max Speed')), calories: num(c(r, 'Calories')),
        relativeEffort: num(c(r, 'Relative Effort', 1) ?? c(r, 'Relative Effort')), gear: c(r, 'Activity Gear'),
        commute: c(r, 'Commute') === null ? null : c(r, 'Commute') === 'true', device: null,
      }
      return [{ source: 'strava' as const, kind: 'activity', id, day: dayOf(start), data }]
    })
  },
}

// ---- Strava API v3 -> canonical ------------------------------------------------------------------

export type ApiActivity = {
  id: number; name: string; sport_type?: string; type?: string; description?: string | null
  start_date: string; start_date_local: string; elapsed_time?: number; moving_time?: number; distance?: number; total_elevation_gain?: number
  average_heartrate?: number; max_heartrate?: number; average_speed?: number; max_speed?: number; calories?: number; suffer_score?: number | null
  gear_id?: string | null; commute?: boolean; device_name?: string
  best_efforts?: { name: string; distance: number; elapsed_time: number }[] // detail only, runs
}
type ApiGear = { id: string; name?: string; nickname?: string; distance?: number; retired?: boolean }
export type ApiAthlete = { bikes?: ApiGear[]; shoes?: ApiGear[] }

const n = (v?: number | null) => (v === undefined || v === null ? null : v)

export function apiActivityRow(a: ApiActivity, gearNames: Map<string, string>): RecordRow {
  const data: Partial<StravaActivity> = {
    // Legacy `type` with spaces ("WeightTraining" -> "Weight Training"), as in the bulk export.
    start: isoSec(a.start_date), name: a.name, type: (a.type ?? a.sport_type ?? 'Workout').replace(/([a-z])([A-Z])/g, '$1 $2'), description: a.description ?? undefined,
    elapsedS: n(a.elapsed_time), movingS: n(a.moving_time), distanceM: n(a.distance), elevGainM: n(a.total_elevation_gain),
    avgHr: n(a.average_heartrate), maxHr: n(a.max_heartrate), avgSpeed: n(a.average_speed), maxSpeed: n(a.max_speed),
    calories: n(a.calories), relativeEffort: n(a.suffer_score), gear: a.gear_id ? gearNames.get(a.gear_id) ?? null : null,
    commute: a.commute ?? null, device: a.device_name ?? null,
    bestEfforts: a.best_efforts?.map(e => ({ name: e.name, distanceM: e.distance, elapsedS: e.elapsed_time })),
  }
  return { source: 'strava', kind: 'activity', id: String(a.id), day: a.start_date_local.slice(0, 10), data }
}

export function apiGearRows(athlete: ApiAthlete): RecordRow[] {
  const rows = (list: ApiGear[] | undefined, kind: StravaGear['kind']) => (list ?? []).map(g => ({
    source: 'strava' as const, kind: 'gear', id: g.id, day: null,
    data: { name: g.nickname || g.name || g.id, kind, distanceM: g.distance ?? 0, retired: g.retired ?? null } satisfies StravaGear,
  }))
  return [...rows(athlete.bikes, 'bike'), ...rows(athlete.shoes, 'shoe')]
}
