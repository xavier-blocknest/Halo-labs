// WHOOP: the app's "Export data" CSVs, and the v2 API mappers used by the connector.
// Both produce the same canonical records (see model.ts), keyed by event start time.
import type { RecordRow } from '../db.ts'
import { isoSec, localToUtc, normOffset, num, type WhoopBody, type WhoopCycle, type WhoopJournal, type WhoopSleep, type WhoopWorkout } from '../model.ts'
import { localDay } from '../connectors/http.ts'
import { columns, hasColumns, type Importer } from './files.ts'

/** A cycle starts when you fall asleep; it belongs to the day you wake up. */
export const cycleDay = (startUtc: string, tz: string) => localDay(startUtc, tz, 12)
const bool = (v: string | null) => (v === null ? null : v.toLowerCase() === 'true')

const utc = (local: string | null, tz: string) => (local ? localToUtc(local, tz) : null)

export const whoopCycles: Importer = {
  id: 'whoop-cycles-csv', source: 'whoop', label: 'WHOOP physiological cycles (CSV)',
  detect: f => hasColumns(f, 'Cycle start time', 'Recovery score %', 'Day Strain'),
  parse(f) {
    const c = columns(f.csv!.header)
    return f.csv!.rows.map(r => {
      const tz = normOffset(c(r, 'Cycle timezone') ?? '+00:00')
      const start = utc(c(r, 'Cycle start time'), tz)!
      const data: WhoopCycle = {
        start, end: utc(c(r, 'Cycle end time'), tz), tz,
        recovery: num(c(r, 'Recovery score %')), rhr: num(c(r, 'Resting heart rate (bpm)')), hrv: num(c(r, 'Heart rate variability (ms)')),
        skinTempC: num(c(r, 'Skin temp (celsius)')), spo2: num(c(r, 'Blood oxygen %')),
        strain: num(c(r, 'Day Strain')), kcal: num(c(r, 'Energy burned (cal)')), maxHr: num(c(r, 'Max HR (bpm)')), avgHr: num(c(r, 'Average HR (bpm)')),
      }
      return { source: 'whoop', kind: 'cycle', id: start, day: cycleDay(start, tz), data }
    })
  },
}

export const whoopSleeps: Importer = {
  id: 'whoop-sleeps-csv', source: 'whoop', label: 'WHOOP sleeps (CSV)',
  detect: f => hasColumns(f, 'Sleep onset', 'Wake onset', 'Nap') && !hasColumns(f, 'Recovery score %'),
  parse(f) {
    const c = columns(f.csv!.header)
    return f.csv!.rows.flatMap(r => {
      const tz = normOffset(c(r, 'Cycle timezone') ?? '+00:00')
      const onset = utc(c(r, 'Sleep onset'), tz), wake = utc(c(r, 'Wake onset'), tz)
      if (!onset || !wake) return []
      const data: WhoopSleep = {
        onset, wake, tz, cycleStart: utc(c(r, 'Cycle start time'), tz),
        performance: num(c(r, 'Sleep performance %')), respRate: num(c(r, 'Respiratory rate (rpm)')),
        asleepMin: num(c(r, 'Asleep duration (min)')), inBedMin: num(c(r, 'In bed duration (min)')), lightMin: num(c(r, 'Light sleep duration (min)')),
        deepMin: num(c(r, 'Deep (SWS) duration (min)')), remMin: num(c(r, 'REM duration (min)')), awakeMin: num(c(r, 'Awake duration (min)')),
        needMin: num(c(r, 'Sleep need (min)')), debtMin: num(c(r, 'Sleep debt (min)')),
        efficiency: num(c(r, 'Sleep efficiency %')), consistency: num(c(r, 'Sleep consistency %')),
      }
      return [{ source: 'whoop' as const, kind: bool(c(r, 'Nap')) ? 'nap' : 'sleep', id: onset, day: localDay(wake, tz), data }]
    })
  },
}

export const whoopWorkouts: Importer = {
  id: 'whoop-workouts-csv', source: 'whoop', label: 'WHOOP workouts (CSV)',
  detect: f => hasColumns(f, 'Workout start time', 'Activity Strain'),
  parse(f) {
    const c = columns(f.csv!.header)
    return f.csv!.rows.flatMap(r => {
      const tz = normOffset(c(r, 'Cycle timezone') ?? '+00:00')
      const start = utc(c(r, 'Workout start time'), tz), end = utc(c(r, 'Workout end time'), tz)
      if (!start || !end) return []
      const data: WhoopWorkout = {
        start, end, tz, name: c(r, 'Activity name') ?? 'Workout', durationMin: num(c(r, 'Duration (min)')),
        strain: num(c(r, 'Activity Strain')), kcal: num(c(r, 'Energy burned (cal)')), maxHr: num(c(r, 'Max HR (bpm)')), avgHr: num(c(r, 'Average HR (bpm)')),
        zonePct: [1, 2, 3, 4, 5].map(z => num(c(r, `HR Zone ${z} %`))), distanceM: null,
      }
      return [{ source: 'whoop' as const, kind: 'workout', id: start, day: localDay(start, tz), data }]
    })
  },
}

export const whoopJournal: Importer = {
  id: 'whoop-journal-csv', source: 'whoop', label: 'WHOOP journal (CSV)',
  detect: f => hasColumns(f, 'Cycle start time', 'Question text', 'Answered yes'),
  parse(f) {
    const c = columns(f.csv!.header)
    return f.csv!.rows.flatMap(r => {
      const tz = normOffset(c(r, 'Cycle timezone') ?? '+00:00')
      const cycleStart = utc(c(r, 'Cycle start time'), tz), question = c(r, 'Question text')
      if (!cycleStart || !question) return []
      const data: WhoopJournal = { cycleStart, question, yes: bool(c(r, 'Answered yes')), notes: c(r, 'Notes') }
      return [{ source: 'whoop' as const, kind: 'journal', id: `${cycleStart}|${question}`, day: cycleDay(cycleStart, tz), data }]
    })
  },
}

// ---- WHOOP API v2 -> canonical ------------------------------------------------------------------

type ApiScore<T> = { score_state?: string; score?: T | null }
export type ApiCycle = { id: number; start: string; end?: string | null; timezone_offset: string } & ApiScore<{ strain?: number; kilojoule?: number; average_heart_rate?: number; max_heart_rate?: number }>
export type ApiRecovery = { cycle_id: number } & ApiScore<{ recovery_score?: number; resting_heart_rate?: number; hrv_rmssd_milli?: number; spo2_percentage?: number; skin_temp_celsius?: number }>
export type ApiSleep = { id: string; cycle_id?: number; start: string; end: string; timezone_offset: string; nap: boolean } & ApiScore<{
  stage_summary?: { total_in_bed_time_milli?: number; total_awake_time_milli?: number; total_light_sleep_time_milli?: number; total_slow_wave_sleep_time_milli?: number; total_rem_sleep_time_milli?: number }
  sleep_needed?: { baseline_milli?: number; need_from_sleep_debt_milli?: number; need_from_recent_strain_milli?: number; need_from_recent_nap_milli?: number }
  respiratory_rate?: number; sleep_performance_percentage?: number; sleep_consistency_percentage?: number; sleep_efficiency_percentage?: number }>
export type ApiWorkout = { id: string; sport_name?: string; start: string; end: string; timezone_offset: string } & ApiScore<{
  strain?: number; average_heart_rate?: number; max_heart_rate?: number; kilojoule?: number; distance_meter?: number
  zone_durations?: Record<string, number> }>

/** "hiking-rucking" / "red_light_therapy" (API) -> "Hiking Rucking" / "Red Light Therapy" (as in the CSV export). */
export const sportName = (n: string) => n.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
const kcal = (kj?: number) => (kj === undefined ? null : Math.round(kj / 4.184))
const min = (ms?: number) => (ms === undefined ? null : Math.round(ms / 60_000))
const n = (v?: number) => (v === undefined ? null : v)
const n1 = (v?: number) => (v === undefined ? null : Math.round(v * 10) / 10)

export function apiCycleRows(cycles: ApiCycle[], recoveries: ApiRecovery[]): RecordRow[] {
  const rec = new Map(recoveries.map(r => [r.cycle_id, r.score]))
  return cycles.map(cy => {
    const tz = normOffset(cy.timezone_offset), start = isoSec(cy.start), r = rec.get(cy.id), s = cy.score
    const data: Partial<WhoopCycle> = {
      start, end: cy.end ? isoSec(cy.end) : null, tz,
      recovery: n(r?.recovery_score), rhr: n(r?.resting_heart_rate), hrv: r?.hrv_rmssd_milli === undefined ? null : Math.round(r.hrv_rmssd_milli),
      spo2: r?.spo2_percentage === undefined ? null : Math.round(r.spo2_percentage * 10) / 10, skinTempC: r?.skin_temp_celsius === undefined ? null : Math.round(r.skin_temp_celsius * 100) / 100,
      strain: n1(s?.strain), kcal: kcal(s?.kilojoule), avgHr: n(s?.average_heart_rate), maxHr: n(s?.max_heart_rate),
    }
    return { source: 'whoop', kind: 'cycle', id: start, day: cycleDay(start, tz), data }
  })
}

export function apiSleepRows(sleeps: ApiSleep[], cycleStartById: Map<number, string>): RecordRow[] {
  return sleeps.map(sl => {
    const tz = normOffset(sl.timezone_offset), onset = isoSec(sl.start), wake = isoSec(sl.end), s = sl.score, st = s?.stage_summary, need = s?.sleep_needed
    const asleep = st ? (st.total_light_sleep_time_milli ?? 0) + (st.total_slow_wave_sleep_time_milli ?? 0) + (st.total_rem_sleep_time_milli ?? 0) : undefined
    const needMs = need ? (need.baseline_milli ?? 0) + (need.need_from_sleep_debt_milli ?? 0) + (need.need_from_recent_strain_milli ?? 0) + (need.need_from_recent_nap_milli ?? 0) : undefined
    const data: Partial<WhoopSleep> = {
      onset, wake, tz, cycleStart: sl.cycle_id !== undefined ? cycleStartById.get(sl.cycle_id) ?? null : null,
      performance: n(s?.sleep_performance_percentage), respRate: s?.respiratory_rate === undefined ? null : Math.round(s.respiratory_rate * 10) / 10,
      asleepMin: min(asleep), inBedMin: min(st?.total_in_bed_time_milli), lightMin: min(st?.total_light_sleep_time_milli),
      deepMin: min(st?.total_slow_wave_sleep_time_milli), remMin: min(st?.total_rem_sleep_time_milli), awakeMin: min(st?.total_awake_time_milli),
      needMin: min(needMs), debtMin: min(need?.need_from_sleep_debt_milli),
      efficiency: n(s?.sleep_efficiency_percentage), consistency: n(s?.sleep_consistency_percentage),
    }
    return { source: 'whoop', kind: sl.nap ? 'nap' : 'sleep', id: onset, day: localDay(wake, tz), data }
  })
}

export function apiWorkoutRows(workouts: ApiWorkout[]): RecordRow[] {
  return workouts.map(w => {
    const tz = normOffset(w.timezone_offset), start = isoSec(w.start), end = isoSec(w.end), s = w.score
    const zones = s?.zone_durations
    const total = zones ? Object.values(zones).reduce((a, b) => a + b, 0) : 0
    const pct = (k: string) => (zones && total ? Math.round((zones[k] ?? 0) / total * 100) : null)
    const data: Partial<WhoopWorkout> = {
      start, end, tz, name: sportName(w.sport_name ?? 'Workout'), durationMin: Math.round((Date.parse(end) - Date.parse(start)) / 60_000),
      strain: n1(s?.strain), kcal: kcal(s?.kilojoule), avgHr: n(s?.average_heart_rate), maxHr: n(s?.max_heart_rate),
      zonePct: zones ? ['zone_one_milli', 'zone_two_milli', 'zone_three_milli', 'zone_four_milli', 'zone_five_milli'].map(pct) : undefined,
      distanceM: n(s?.distance_meter),
    }
    return { source: 'whoop', kind: 'workout', id: start, day: localDay(start, tz), data }
  })
}

export const apiBodyRow = (b: { height_meter?: number; weight_kilogram?: number; max_heart_rate?: number }): RecordRow => ({
  source: 'whoop', kind: 'body', id: 'current', day: null,
  data: { heightM: n(b.height_meter), weightKg: n(b.weight_kilogram), maxHr: n(b.max_heart_rate) } satisfies WhoopBody,
})
