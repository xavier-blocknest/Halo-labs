// FitnessAI exports: workouts (with per-exercise muscle activation) and individual sets.
import type { RecordRow } from '../db.ts'
import { dayOf, isoSec, num, TZ, type LiftSet, type LiftWorkout } from '../model.ts'
import type { Importer } from './files.ts'

type Exercise = { name: string; reps_completed?: number[]; weight_completed_lbs?: number[]; muscle_groups?: { activation_percent: number; group: string; name: string }[] }
type Workout = {
  id: string; workout_key?: string; started_at?: string; ended_at?: string; date?: string; local_date?: string; timezone?: string; duration?: number; calories_burned?: number
  total_sets_completed?: number; total_reps_completed?: number; total_weight_completed_lbs?: number; exercises?: Exercise[]
}
type Set = {
  id: string; workout: string; exercise: string; time_logged?: string; time_zone?: string; workout_key?: string; logged?: boolean
  reps?: number; weight_lbs?: number; duration?: number; distance_km?: number
}

const isList = (j: unknown): j is Record<string, unknown>[] => Array.isArray(j) && j.length > 0 && typeof j[0] === 'object'

/** FitnessAI timestamps carry no zone ("2024-04-11T02:09:50", timezone ""); they are UTC. */
const utc = (s?: string) => (s ? isoSec(s.endsWith('Z') ? s : `${s}Z`) : null)

export const fitnessWorkouts: Importer = {
  id: 'fitnessai-workouts-json', source: 'fitnessai', label: 'FitnessAI workouts (JSON)',
  detect: f => isList(f.json) && 'exercises' in f.json[0] && 'workout_key' in f.json[0],
  parse(f) {
    return (f.json as Workout[]).flatMap(w => {
      const start = utc(w.started_at ?? w.date)
      if (!start) return []
      const data: LiftWorkout = {
        start, end: utc(w.ended_at), durationS: num(w.duration), kcal: num(w.calories_burned),
        sets: num(w.total_sets_completed), reps: num(w.total_reps_completed), volumeLb: num(w.total_weight_completed_lbs),
        exercises: (w.exercises ?? []).map(e => ({
          name: e.name, sets: e.reps_completed?.length ?? 0, reps: e.reps_completed ?? [], weightLb: e.weight_completed_lbs ?? [],
          muscles: (e.muscle_groups ?? []).map(m => ({ group: m.group, name: m.name, pct: m.activation_percent })),
        })),
      }
      // workout_key is the local day; local_date is often the UTC date (wrong for evening sessions).
      return [{ source: 'fitnessai' as const, kind: 'workout', id: w.id, day: w.workout_key ?? dayOf(start, w.timezone || TZ), data }]
    })
  },
}

export const fitnessSets: Importer = {
  id: 'fitnessai-sets-json', source: 'fitnessai', label: 'FitnessAI exercise sets (JSON)',
  detect: f => isList(f.json) && 'set_group_key' in f.json[0] && 'exercise' in f.json[0],
  parse(f) {
    return (f.json as Set[]).flatMap(s => {
      const loggedAt = utc(s.time_logged)
      if (!loggedAt || s.logged === false) return []
      const data: LiftSet = {
        workout: s.workout, exercise: s.exercise, loggedAt, reps: s.reps ?? 0, weightLb: s.weight_lbs ?? 0,
        durationS: s.duration ?? 0, distanceM: Math.round((s.distance_km ?? 0) * 1000),
      }
      return [{ source: 'fitnessai' as const, kind: 'set', id: s.id, day: s.workout_key ?? dayOf(loggedAt), data }]
    })
  },
}
