// Runna activity export (JSON): runs with plan context and links to the matching Strava activities.
import { dayOf, isoSec, num, type RunnaEffort, type RunnaRun, type RunWeather } from '../model.ts'
import type { Importer } from './files.ts'
import type { RecordRow } from '../db.ts'

type Run = {
  id: string; recordType?: string; name?: string; type?: string; description?: string; workoutId?: string; feedback?: string; tzOffset?: number; createdOn?: number
  summary?: { distance?: number; totalTime?: number; movingTime?: number; totalElevationGain?: number; startTimestamp?: number }
  stravaActivities?: { stravaActivityId: number }[]
  mileSplits?: [number, number, ...number[]][]
  predictedRunType?: string; externalId?: string; address?: string; mapPolyline?: string
  weather?: { temperature?: number; feelsLike?: number; humidity?: number; windSpeed?: number; windGust?: number; precipitation?: number; status?: string; statusDescription?: string }
  fastestTimes?: { type: string; time: number }[]
}
const fiveMi = (r: Run) => { const t = r.fastestTimes?.find(x => x.type === 'FIVEMI')?.time; return t ? Math.round(t / 1000) : null }

export const runnaRuns: Importer = {
  id: 'runna-activities-json', source: 'runna', label: 'Runna runs (JSON)',
  detect: f => Array.isArray(f.json) && f.json.length > 0 && typeof f.json[0] === 'object' && 'mileSplits' in f.json[0] && 'workoutId' in f.json[0],
  parse(f) {
    return (f.json as Run[]).flatMap((r): RecordRow[] => {
      // Entries mirrored from Strava (recordType STRAVA) are already in the Strava data; keep them only when Runna
      // linked them to a plan workout. From the others keep just Runna's fastest 5 miles (Strava has no such effort).
      if ((r.recordType === 'STRAVA' || r.id.startsWith('strava-')) && !r.workoutId) {
        const s = fiveMi(r), sid = r.externalId ?? r.id.replace(/^strava-/, '')
        return (s || r.predictedRunType) && /^\d+$/.test(sid) ? [{ source: 'runna' as const, kind: 'effort', id: sid, day: null, data: { stravaId: sid, fastest5miS: s, guessType: r.predictedRunType ?? null } satisfies RunnaEffort }] : []
      }
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
        mileSplits: (r.mileSplits ?? []).map(s => ({ m: s[0], s: Math.round(s[1] / 1000), speed: num(s[2]) })),
        runType: /plan_week_\d+_([A-Z_]+?)_\d+$/.exec(r.workoutId ?? '')?.[1] ?? null, // the plan's type, not Runna's guess
        weather: r.weather ? { tempC: num(r.weather.temperature), feelsC: num(r.weather.feelsLike), humidity: num(r.weather.humidity), windMs: num(r.weather.windSpeed),
          gustMs: num(r.weather.windGust), precipMm: num(r.weather.precipitation), status: r.weather.status ?? null, desc: r.weather.statusDescription ?? null } satisfies RunWeather : null,
        route: r.mapPolyline || r.address ? { polyline: r.mapPolyline || null, address: r.address || null } : null,
        fastest5miS: fiveMi(r),
      }
      return [{ source: 'runna' as const, kind: 'run', id: r.id, day: dayOf(start), data }]
    })
  },
}
