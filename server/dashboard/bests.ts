// Personal bests for the Training page, only from recorded workouts:
// - Run: Strava's own best efforts (fastest 1K, mile, 5K, 10K… inside any run; elapsed time, as Strava ranks PRs),
//   plus the longest run. Best efforts come from each run's detail (connectors/strava.ts backfills older runs).
// - Swim and ride: whole-activity bests (Strava has no best efforts for them): longest, fastest pace or speed over a
//   minimum distance, and (rides) most climbing. Rides look at WHOOP sessions and Strava rides together: sessions skip
//   Strava rides so totals don't count a ride twice, but a best is a single maximum, so both can be candidates.
// - Strength: the heaviest set of each of the most-done FitnessAI exercises (from FitnessAI exports). Without FitnessAI
//   sets (strength from WHOOP or Strava), session bests instead: highest strain, longest session, most calories and
//   highest heart rate of the strength sessions (WHOOP has no weights or reps).
import { readRecords } from '../db.ts'
import type { FormSwim, LiftSet, LiftWorkout, RunnaEffort, RunnaRun, StravaActivity } from '../model.ts'
import type { Session } from './sessions.ts'
import { diffDays, medium } from './time.ts'
import { swimDetail, swimPace } from './swims.ts'
import { okFiveMi } from './runs.ts'

const MI = 1609.344, YD = 0.9144, FT = 0.3048
const r1 = (x: number) => Math.round(x * 10) / 10
const clock = (s: number) => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}` }
const pace = (secPerUnit: number) => clock(secPerUnit)
// Strava's best-effort distances, shortest first (names as Strava sends them).
// '5 mile' isn't a Strava best effort: it comes from Runna's fastest 5 miles (its own runs and the Strava runs it mirrors).
const EFFORTS = ['400m', '1/2 mile', '1K', '1 mile', '2 mile', '5K', '5 mile', '10K', '15K', '10 mile', '20K', 'Half-Marathon', '30K', 'Marathon']
const LABEL: Record<string, string> = { '1/2 mile': '½ mile', 'Half-Marathon': 'Half marathon', '5 mile': '5 miles' }
const MIN_SWIM_M = 400 * YD, MIN_RIDE_M = 10 * MI
const LIFTS_SHOWN = 6

// `fresh`: set in the last 14 days (the card marks it "New").
type Best = { v: string; u: string; sub: string; d: string; day: string; name: string; fresh: boolean }
const NEW_DAYS = 14
let today = ''
const best = (v: string, u: string, sub: string, a: { day: string; name: string }): Best => ({ v, u, sub, d: medium(a.day), day: a.day, name: a.name, fresh: diffDays(today, a.day) <= NEW_DAYS })

export function personalBests(acts: Session[], day: string) {
  today = day
  const of = (s: Session['sport']) => acts.filter(a => a.sport === s && (a.distanceM ?? 0) > 0)

  // Run: the fastest effort at each distance across every Strava run that has them.
  const runs = readRecords<StravaActivity>('strava', 'activity').filter(r => /run/i.test(r.data.type) && !/virtual/i.test(r.data.type))
  const byId = new Map(runs.map(r => [r.id, r]))
  const runna5mi = [
    ...readRecords<RunnaRun>('runna', 'run').filter(r => r.day && okFiveMi(r.data.fastest5miS, byId.get(String(r.data.stravaIds[0]))?.data ?? r.data)).map(r => ({ s: r.data.fastest5miS!, m: 5 * MI, day: r.day!, name: byId.get(String(r.data.stravaIds[0]))?.data.name ?? r.data.name })),
    ...readRecords<RunnaEffort>('runna', 'effort').flatMap(r => { const a = byId.get(r.data.stravaId); return a?.day && okFiveMi(r.data.fastest5miS, a.data) ? [{ s: r.data.fastest5miS!, m: 5 * MI, day: a.day, name: a.data.name }] : [] }),
  ]
  const efforts = EFFORTS.map(k => {
    let top: { s: number; m: number; day: string; name: string } | null = null
    for (const r of runs) for (const e of r.data.bestEfforts ?? []) if (e.name === k && e.elapsedS > 0 && (!top || e.elapsedS < top.s)) top = { s: e.elapsedS, m: e.distanceM, day: r.day!, name: r.data.name }
    if (k === '5 mile') for (const c of runna5mi) if (!top || c.s < top.s) top = c
    return top ? { k: LABEL[k] ?? k, spm: top.s / (top.m / MI), ...best(clock(top.s), '', `${pace(top.s / (top.m / MI))} /mi`, top) } : null
  }).filter((x): x is Best & { k: string; spm: number } => !!x)
  const longestRun = of('run').sort((a, b) => b.distanceM! - a.distanceM!)[0]
  const pending = runs.filter(r => r.data.bestEfforts === undefined).length // runs whose detail isn't fetched yet

  // Swim.
  const swims = of('swim')
  const longestSwim = [...swims].sort((a, b) => b.distanceM! - a.distanceM!)[0]
  // Pace over the clean lengths for FORM swims (glitchy lengths would flatter it), moving time otherwise.
  const fastSwim = swims.filter(a => a.distanceM! >= MIN_SWIM_M && swimPace(a)).sort((a, b) => swimPace(a)! - swimPace(b)!)[0]
  // Technique bests from FORM swims, over clean freestyle lengths only, and only swims with 200+ yd of it (no flukes).
  const tech = swims.filter(a => a.swim?.free && a.swim.free.yd >= 200)
  const lowest = (k: 'swolf' | 'strokes') => tech.filter(a => a.swim!.free![k]).sort((a, b) => a.swim!.free![k]! - b.swim!.free![k]! || a.day.localeCompare(b.day))[0]
  const bestSwolf = lowest('swolf'), fewestStrokes = lowest('strokes')
  const bestDps = tech.filter(a => a.swim!.free!.dpsYd).sort((a, b) => b.swim!.free!.dpsYd! - a.swim!.free!.dpsYd! || a.day.localeCompare(b.day))[0]
  // Sets (FORM's own grouping): the longest one, and the fastest freestyle set of 100 yd or more.
  const swimName = new Map(swims.map(a => [a.id, a]))
  const swimSets = readRecords<FormSwim>('form', 'swim').flatMap(r => { const a = swimName.get(`form:${r.id}`); return a ? swimDetail(r.data).sets.map(x => ({ ...x, a })) : [] })
  const longSet = [...swimSets].sort((p, q) => q.yd - p.yd || p.a.day.localeCompare(q.a.day))[0]
  const fastSet = swimSets.filter(x => x.yd >= 100 && /^Freestyle$/i.test(x.stroke) && x.paceS && !x.excluded).sort((p, q) => p.paceS! - q.paceS!)[0]

  // Ride: WHOOP ride sessions and Strava rides (anything recorded with a distance).
  const rides: { day: string; name: string; distanceM: number | null; movingS: number | null; elapsedS: number | null; elevGainM: number | null }[] = [...of('ride'),
    ...readRecords<StravaActivity>('strava', 'activity').filter(r => /ride/i.test(r.data.type) && (r.data.distanceM ?? 0) > 0 && r.day)
      .map(r => ({ day: r.day!, name: r.data.name, distanceM: r.data.distanceM, movingS: r.data.movingS, elapsedS: r.data.elapsedS, elevGainM: r.data.elevGainM }))]
  const longestRide = [...rides].sort((a, b) => b.distanceM! - a.distanceM!)[0]
  const fastRide = rides.filter(a => a.distanceM! >= MIN_RIDE_M && a.movingS).sort((a, b) => b.distanceM! / b.movingS! - a.distanceM! / a.movingS!)[0]
  const climbRide = rides.filter(a => (a.elevGainM ?? 0) > 0).sort((a, b) => b.elevGainM! - a.elevGainM!)[0]

  // Strength: every set from the FitnessAI exports.
  const sets: { ex: string; lb: number; reps: number; day: string }[] = readRecords<LiftSet>('fitnessai', 'set')
    .filter(s => s.day && s.data.weightLb > 0 && s.data.reps > 0).map(s => ({ ex: s.data.exercise, lb: s.data.weightLb, reps: s.data.reps, day: s.day! }))
  const byEx = new Map<string, typeof sets>()
  for (const s of sets) byEx.set(s.ex, [...(byEx.get(s.ex) ?? []), s])
  const strength = [...byEx].map(([ex, xs]) => ({ ex, days: new Set(xs.map(x => x.day)).size, top: xs.sort((a, b) => b.lb - a.lb || b.reps - a.reps || a.day.localeCompare(b.day))[0] }))
    .sort((a, b) => b.days - a.days || b.top.lb - a.top.lb).slice(0, LIFTS_SHOWN)
    .map(({ ex, days, top }) => ({ k: ex, lb: top.lb, ...best(String(top.lb), 'lb', `× ${top.reps} · ${days} session${days === 1 ? '' : 's'}`, { day: top.day, name: ex }) }))

  // Strength sessions (whichever app is the strength source; WHOOP adds strain, calories and heart rate).
  const liftSessions = acts.filter(a => a.sport === 'strength')
  const top = (key: 'strain' | 'calories' | 'maxHr' | 'movingS') => liftSessions.filter(a => (a[key] ?? 0) > 0).sort((a, b) => b[key]! - a[key]! || a.day.localeCompare(b.day))[0]
  const sStrain = top('strain'), sLong = top('movingS'), sCal = top('calories'), sHr = top('maxHr')
  const strengthSessions = {
    strain: sStrain ? best(String(sStrain.strain), 'strain', clock(sStrain.movingS ?? 0), sStrain) : null,
    longest: sLong ? best(clock(sLong.movingS!), '', sLong.strain != null ? `strain ${sLong.strain}` : '', sLong) : null,
    calories: sCal ? best(Math.round(sCal.calories!).toLocaleString(), 'kcal', '', sCal) : null,
    maxHr: sHr ? best(String(Math.round(sHr.maxHr!)), 'bpm', '', sHr) : null,
    n: liftSessions.length,
  }

  return {
    run: { efforts, pending, longest: longestRun ? best(String(r1(longestRun.distanceM! / MI)), 'mi', clock(longestRun.movingS ?? longestRun.elapsedS ?? 0), longestRun) : null },
    swim: {
      longest: longestSwim ? best(Math.round(longestSwim.distanceM! / YD).toLocaleString(), 'yd', clock(longestSwim.movingS ?? longestSwim.elapsedS ?? 0), longestSwim) : null,
      fastest: fastSwim ? best(pace(swimPace(fastSwim)! * YD * 100), '/100 yd', `over ${Math.round(fastSwim.distanceM! / YD).toLocaleString()} yd`, fastSwim) : null,
      swolf: bestSwolf ? best(String(bestSwolf.swim!.free!.swolf), '', 'freestyle', bestSwolf) : null,
      dps: bestDps ? best(String(bestDps.swim!.free!.dpsYd), 'yd', 'per stroke', bestDps) : null,
      strokes: fewestStrokes ? best(String(fewestStrokes.swim!.free!.strokes), '', 'per length', fewestStrokes) : null,
      longSet: longSet ? best(longSet.yd.toLocaleString(), 'yd', `${longSet.label.replace('x', '×')} ${longSet.stroke.toLowerCase()}`, longSet.a) : null,
      fastSet: fastSet ? best(fastSet.pace!, '/100 yd', `${fastSet.yd} yd set`, fastSet.a) : null,
    },
    ride: {
      longest: longestRide ? best(String(r1(longestRide.distanceM! / MI)), 'mi', clock(longestRide.movingS ?? longestRide.elapsedS ?? 0), longestRide) : null,
      fastest: fastRide ? best(String(r1(fastRide.distanceM! / MI / (fastRide.movingS! / 3600))), 'mph', `over ${r1(fastRide.distanceM! / MI)} mi`, fastRide) : null,
      climb: climbRide ? best(Math.round(climbRide.elevGainM! / FT).toLocaleString(), 'ft', `in ${r1(climbRide.distanceM! / MI)} mi`, climbRide) : null,
    },
    strength, strengthSessions,
  }
}
