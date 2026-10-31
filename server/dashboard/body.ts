// Body page: muscle load from FitnessAI activation, key lifts (Epley e1RM), DEXA scans.
import { readRecords, type RecordRow } from '../db.ts'
import type { DexaScan, LiftSet, LiftWorkout } from '../model.ts'
import { buildSessions } from './sessions.ts'
import { addDays, medium, monthName, short, weekStart } from './time.ts'

const KEY_LIFTS: [label: string, exercise: string][] = [
  ['Bench Press', 'Bench Press'], ['Incline Bench', 'Incline Bench'], ['Deadlift', 'Deadlift'],
  ['Squat', 'Squat'], ['Shoulder Press', 'Barbell Shoulder Press'], ['Dumbbell Row', 'Dumbbell Row'],
]

/** Weighted sets per muscle = Σ sets × activation (spec 04 · Strength). */
function muscleLoad(workouts: LiftWorkout[]) {
  const m: Record<string, number> = {}, g: Record<string, number> = {}
  let sets = 0
  for (const w of workouts) for (const e of w.exercises) {
    sets += e.sets
    for (const mu of e.muscles) {
      m[mu.name] = (m[mu.name] ?? 0) + e.sets * mu.pct
      g[mu.group] = (g[mu.group] ?? 0) + e.sets * mu.pct
    }
  }
  const round = (o: Record<string, number>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.round(v)]))
  return { n: workouts.length, sets, m: round(m), g: round(g) }
}

const e1rm = (weight: number, reps: number) => weight * (1 + reps / 30)

/** Lifting totals: weight lifted (Σ reps × weight, as FitnessAI computes it), sets, reps, sessions and time.
 *  Sets/reps/weight come from FitnessAI workouts; sessions and time from the
 *  strength sessions, which also count WHOOP-only lifts that have no sets yet (`noSets`). */
function liftVolume(today: string, workouts: RecordRow<LiftWorkout>[]) {
  const per = workouts.map(w => {
    const ex = w.data.exercises.map(e => ({ name: e.name, sets: e.reps.filter(r => r > 0).length, reps: e.reps.reduce((a, b) => a + b, 0),
      lb: e.reps.reduce((a, r, i) => a + r * (e.weightLb[i] ?? 0), 0) }))
    return { day: w.day!, ex, sets: ex.reduce((n, e) => n + e.sets, 0), reps: ex.reduce((n, e) => n + e.reps, 0), lb: ex.reduce((n, e) => n + e.lb, 0) }
  })
  const lifts = buildSessions().sessions.filter(x => x.sport === 'strength' && x.day <= today)
  const sum = (from: string, to: string) => {
    const w = per.filter(x => x.day >= from && x.day <= to), s = lifts.filter(x => x.day >= from && x.day <= to)
    const top = new Map<string, { lb: number; sets: number }>()
    for (const e of w.flatMap(x => x.ex)) { const t = top.get(e.name) ?? { lb: 0, sets: 0 }; t.lb += e.lb; t.sets += e.sets; top.set(e.name, t) }
    return { lb: Math.round(w.reduce((n, x) => n + x.lb, 0)), sets: w.reduce((n, x) => n + x.sets, 0), reps: w.reduce((n, x) => n + x.reps, 0),
      n: s.length, min: Math.round(s.reduce((n, x) => n + (x.movingS ?? 0), 0) / 60), noSets: s.filter(x => !x.sets).length,
      top: [...top].sort((a, b) => b[1].lb - a[1].lb).slice(0, 5).map(([name, t]) => ({ name, lb: Math.round(t.lb), sets: t.sets })) }
  }
  const first = [...per.map(x => x.day), ...lifts.map(x => x.day)].sort()[0] ?? today
  const wk = weekStart(today), yr = `${today.slice(0, 4)}-01-01`, lastYr = `${Number(today.slice(0, 4)) - 1}${today.slice(4)}`
  const span = (from: string, prevFrom: string | null, prevTo: string | null) => ({ ...sum(from, today), from, prev: prevFrom && prevTo ? sum(prevFrom, prevTo) : null })
  return {
    periods: {
      week: span(wk, addDays(wk, -7), addDays(today, -7)), // this week so far vs the same days last week
      d30: span(addDays(today, -29), addDays(today, -59), addDays(today, -30)),
      d90: span(addDays(today, -89), addDays(today, -179), addDays(today, -90)),
      year: span(yr, `${lastYr.slice(0, 4)}-01-01`, lastYr), // year to date vs the same stretch last year
      all: span(first, null, null),
    },
    weeks: Array.from({ length: 12 }, (_, i) => { const from = addDays(wk, -7 * (11 - i)); return { start: from, ...sum(from, addDays(from, 6)), top: undefined } }),
  }
}

export function bodySummary(today: string) {
  const workouts = readRecords<LiftWorkout>('fitnessai', 'workout').filter(w => w.day && w.day <= today)
  const sets = readRecords<LiftSet>('fitnessai', 'set').filter(s => s.day && s.day <= today && s.data.weightLb > 0 && s.data.reps > 0)
  const scans = readRecords<DexaScan>('dexa', 'scan').map(s => ({ day: s.day!, label: short(s.day!), year: s.day!.slice(0, 4), ...s.data }))

  const window = (days: number | null) => muscleLoad(workouts.filter(w => days === null || w.day! > addDays(today, -days)).map(w => w.data))
  const lastWorkout = workouts.at(-1)?.day ?? null

  // Key lifts: best e1RM per month for the last six months, from sets of 12 reps or fewer.
  const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(Date.parse(`${today.slice(0, 7)}-15T12:00:00Z`)); d.setUTCMonth(d.getUTCMonth() - 5 + i); return d.toISOString().slice(0, 7) })
  const lifts = KEY_LIFTS.flatMap(([label, exercise]) => {
    const own = sets.filter(s => s.data.exercise === exercise)
    if (!own.length) return []
    const counted = own.filter(s => s.data.reps <= 12)
    const mo = months.map(ym => { const best = Math.max(0, ...counted.filter(s => s.day!.startsWith(ym)).map(s => e1rm(s.data.weightLb, s.data.reps))); return best ? Math.round(best) : null })
    const top = counted.reduce<(typeof own)[number] | null>((b, s) => (!b || e1rm(s.data.weightLb, s.data.reps) > e1rm(b.data.weightLb, b.data.reps) ? s : b), null)
    const last = own.at(-1)!
    return [{ label, mo, months: months.map(ym => monthName(`${ym}-15`)), best: top ? `${top.data.weightLb} × ${top.data.reps} · ${short(top.day!)}` : null, last: `${last.data.weightLb} × ${last.data.reps} · ${short(last.day!)}` }]
  })

  return {
    load: { d30: window(30), d90: window(90), all: window(null) },
    asOf: lastWorkout ? medium(lastWorkout) : null,
    lifts, scans, volume: liftVolume(today, workouts),
  }
}
