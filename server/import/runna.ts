// Runna activity export (JSON): runs with plan context and links to the matching Strava activities.
import { dayOf, isoSec, num, type RunnaRun } from '../model.ts'
import type { Importer } from './files.ts'

type Run = {
  id: string; recordType?: string; name?: string; type?: string; description?: string; workoutId?: string; feedback?: string; tzOffset?: number; createdOn?: number
  summary?: { distance?: number; totalTime?: number; movingTime?: number; totalElevationGain?: number; startTimestamp?: number }
  stravaActivities?: { stravaActivityId: number }[]
  mileSplits?: [number, number, ...number[]][]
}

export const runnaRuns: Importer = {
  id: 'runna-activities-json', source: 'runna', label: 'Runna runs (JSON)',
  detect: f => Array.isArray(f.json) && f.json.length > 0 && typeof f.json[0] === 'object' && 'mileSplits' in f.json[0] && 'workoutId' in f.json[0],
  parse(f) {
    return (f.json as Run[]).flatMap(r => {
      // Entries mirrored from Strava (recordType STRAVA) are already in the Strava data; keep them only
      // when Runna linked them to a plan workout.
      if ((r.recordType === 'STRAVA' || r.id.startsWith('strava-')) && !r.workoutId) return []
      const ts = r.summary?.startTimestamp ?? r.createdOn
      if (!ts) return []
      const start = isoSec(new Date(ts).toISOString())
      const week = /plan_week_(\d+)/.exec(r.workoutId ?? '')
      const data: RunnaRun = {
        start, name: r.name ?? 'Run', type: r.type ?? 'RUN', description: r.description ?? null,
        workoutId: r.workoutId ?? null, planWeek: week ? Number(week[1]) : null,
        distanceM: num(r.summary?.distance), movingS: r.summary?.movingTime ? Math.round(r.summary.movingTime / 1000) : null,
        elapsedS: r.summary?.totalTime ? Math.round(r.summary.totalTime / 1000) : null, elevGainM: num(r.summary?.totalElevationGain),
        feedback: r.feedback ?? null, stravaIds: (r.stravaActivities ?? []).map(s => s.stravaActivityId),
        mileSplits: (r.mileSplits ?? []).map(s => ({ m: s[0], s: Math.round(s[1] / 1000) })),
      }
      return [{ source: 'runna' as const, kind: 'run', id: r.id, day: dayOf(start), data }]
    })
  },
}
