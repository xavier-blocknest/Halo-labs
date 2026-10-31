// One training session per real-world workout, with one source of truth per sport. The athlete picks it in Settings →
// Activity sources (secret `activity-sources`); "Auto" (the default) resolves per sport in resolveSources() below:
// run/swim = Strava if it has any, ride = WHOOP if it has any, strength = FitnessAI if exported, each else WHOOP (so with
// only WHOOP connected, everything is WHOOP). The text below describes the defaults:
//   Running, swimming:  Strava defines the session (distance, pace, name, gear; Runna adds the plan link);
//                       WHOOP supplies the physical impact (heart rate, strain, zones, calories).
//   Weightlifting:      FitnessAI defines the session (sets, exercises, duration); WHOOP supplies the impact.
//                       FitnessAI is exported by hand, so WHOOP lifts after the last FitnessAI workout count as
//                       provisional sessions until the next export arrives and replaces them.
//   Everything else:    WHOOP is the source of truth (walks, rides, hikes, golf, ...).
// A record from an app that doesn't own its sport never counts on its own: Strava walks/rides/lifts are ignored,
// WHOOP swims without a Strava activity and WHOOP lifts without a FitnessAI workout are left out (and counted
// in `unmatched` so the gaps are visible). Exception: a WHOOP run with no Strava activity is a treadmill run (the
// owner deletes those from Strava since GPS can't measure them, Oct 30). It counts for time, heart rate and strain
// but with no distance: WHOOP's GPS distance indoors is meaningless (e.g. 147 m for 47 min). WHOOP recovery sessions (sauna, meditation, ...) are never training.
// Matching: time spans overlapping by at least half of the shorter one, same sport; for lifts also the closest
// WHOOP lift on the same day within 2 hours, since FitnessAI times are when logging started.
import { getSecret, readRecords } from '../db.ts'
import type { LiftWorkout, RunnaRun, StravaActivity, WhoopWorkout } from '../model.ts'
import { RECOVERY } from './whoop.ts'

export type Sport = 'run' | 'ride' | 'swim' | 'walk' | 'strength' | 'other'

export type Session = {
  id: string; day: string; start: string; sport: Sport; name: string
  movingS: number | null; elapsedS: number | null; distanceM: number | null; elevGainM: number | null
  avgHr: number | null; maxHr: number | null; calories: number | null; gear: string | null
  strain: number | null; zonePct: (number | null)[] | null; sets: number | null; exercises: number | null
  liftLb: number | null // weight lifted, Σ reps × weight (FitnessAI export)
  sources: ('strava' | 'whoop' | 'fitnessai' | 'runna')[]
  provisional?: boolean // stand-in for a lift FitnessAI hasn't been exported for yet (WHOOP alone)
}

const STRAVA_SPORT: Record<string, Sport> = {
  Run: 'run', 'Trail Run': 'run', 'Virtual Run': 'run', Ride: 'ride', 'Virtual Ride': 'ride', 'Mountain Bike Ride': 'ride', 'Gravel Ride': 'ride', 'E Bike Ride': 'ride',
  Swim: 'swim', Walk: 'walk', Hike: 'walk', 'Weight Training': 'strength', Workout: 'strength', Crossfit: 'strength',
}
const WHOOP_SPORT: [RegExp, Sport | 'recovery'][] = [
  [RECOVERY, 'recovery'],
  [/run/i, 'run'], [/swim/i, 'swim'], [/cycl|bik|spin/i, 'ride'], [/walk|hik|ruck/i, 'walk'],
  [/weight|power|functional|strength|crossfit/i, 'strength'],
]
export const stravaSport = (t: string): Sport => STRAVA_SPORT[t] ?? STRAVA_SPORT[t.replace(/([a-z])([A-Z])/g, '$1 $2')] ?? 'other'
const whoopSport = (n: string) => WHOOP_SPORT.find(([re]) => re.test(n))?.[1] ?? 'other'

// ---- Activity sources (Settings) ------------------------------------------------------------------------------
export type SourceSport = 'run' | 'swim' | 'ride' | 'strength'
export type Source = 'strava' | 'whoop' | 'fitnessai'
export type SourcePrefs = Record<SourceSport, 'auto' | Source>
/** What each sport can come from; the first is Auto's preference when it has data, WHOOP is the fallback. */
export const SOURCE_CHOICES: Record<SourceSport, Source[]> = { run: ['strava', 'whoop'], swim: ['strava', 'whoop'], ride: ['whoop', 'strava'], strength: ['fitnessai', 'whoop', 'strava'] }
export const SOURCE_SPORTS = Object.keys(SOURCE_CHOICES) as SourceSport[]
export const SOURCES_KEY = 'activity-sources'

export function sourcePrefs(): SourcePrefs {
  const p = getSecret<Partial<SourcePrefs>>(SOURCES_KEY) ?? {}
  return Object.fromEntries(SOURCE_SPORTS.map(k => [k, p[k] && (p[k] === 'auto' || SOURCE_CHOICES[k].includes(p[k] as Source)) ? p[k] : 'auto'])) as SourcePrefs
}

/** The source each sport uses: the athlete's choice, or for Auto the preferred app when it has that sport, else WHOOP
 *  (ride: WHOOP when it has rides, else Strava when it does). `has` = which apps have records of which sport. */
export function resolveSources(prefs: SourcePrefs, has: Record<Source, Set<Sport>>): Record<SourceSport, Source> {
  return Object.fromEntries(SOURCE_SPORTS.map(k => {
    if (prefs[k] !== 'auto') return [k, prefs[k]]
    const [first, ...rest] = SOURCE_CHOICES[k]
    const sport: Sport = k
    if (has[first].has(sport)) return [k, first]
    return [k, rest.find(s => s !== 'whoop' && has[s].has(sport) && !has.whoop.has(sport)) ?? 'whoop']
  })) as Record<SourceSport, Source>
}

type Span = { t0: number; t1: number }
const overlapOf = (a: Span, b: Span) => {
  const ov = Math.min(a.t1, b.t1) - Math.max(a.t0, b.t0), shorter = Math.min(a.t1 - a.t0, b.t1 - b.t0)
  return shorter > 0 && ov >= shorter / 2 ? ov / shorter : 0
}

/** "Chest · Shoulders · Triceps": the most-worked muscle groups of a FitnessAI workout. */
function liftName(w: LiftWorkout) {
  const g: Record<string, number> = {}
  for (const e of w.exercises) for (const m of e.muscles) g[m.group] = (g[m.group] ?? 0) + e.sets * m.pct
  const top = Object.entries(g).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k)
  return top.length ? top.join(' · ') : 'Strength'
}

export function buildSessions() {
  const whoop = readRecords<WhoopWorkout>('whoop', 'workout').map(r => ({ r, sport: whoopSport(r.data.name), t0: Date.parse(r.data.start), t1: Date.parse(r.data.end) }))
    .filter(w => w.sport !== 'recovery')
  const stravaActs = readRecords<StravaActivity>('strava', 'activity')
  const lifts = readRecords<LiftWorkout>('fitnessai', 'workout')
  const has: Record<Source, Set<Sport>> = {
    strava: new Set(stravaActs.map(a => stravaSport(a.data.type))),
    whoop: new Set(whoop.map(w => w.sport as Sport)),
    fitnessai: new Set(lifts.length ? ['strength' as const] : []),
  }
  const src = resolveSources(sourcePrefs(), has)
  const used = new Set<string>() // WHOOP records already attached to a session
  const impact = (w: (typeof whoop)[number] | undefined) => w
    ? { avgHr: w.r.data.avgHr, maxHr: w.r.data.maxHr, calories: w.r.data.kcal, strain: w.r.data.strain == null ? null : Math.round(w.r.data.strain * 10) / 10, zonePct: w.r.data.zonePct }
    : { avgHr: null, maxHr: null, calories: null, strain: null, zonePct: null }
  const bestWhoop = (span: Span, sport: Sport, day: string, sameDayHours = 0) => {
    let best: (typeof whoop)[number] | undefined, score = 0
    for (const w of whoop) {
      if (used.has(w.r.id) || w.sport !== sport) continue
      let s = overlapOf(span, w)
      if (!s && sameDayHours && w.r.day === day && Math.abs(w.t0 - span.t0) <= sameDayHours * 3600e3) s = 0.01 / (1 + Math.abs(w.t0 - span.t0))
      if (s > score) { score = s; best = w }
    }
    if (best) used.add(best.r.id)
    return best
  }

  const sessions: Session[] = []
  const runna = readRecords<RunnaRun>('runna', 'run')
  const runnaByStrava = new Map(runna.flatMap(r => r.data.stravaIds.map(id => [String(id), r] as const)))
  let stravaIgnored = 0

  // Strava: the sports whose source is Strava (by default runs and swims).
  for (const a of stravaActs) {
    const sport = stravaSport(a.data.type)
    if (!SOURCE_SPORTS.includes(sport as SourceSport) || src[sport as SourceSport] !== 'strava') { stravaIgnored++; continue }
    const t0 = Date.parse(a.data.start), span = { t0, t1: t0 + 1000 * (a.data.elapsedS ?? a.data.movingS ?? 1800) }
    const w = bestWhoop(span, sport, a.day!, sport === 'strength' ? 2 : 0)
    const rn = sport === 'run' ? runnaByStrava.get(a.id) : undefined
    sessions.push({
      id: `strava:${a.id}`, day: a.day!, start: a.data.start, sport, name: a.data.name,
      movingS: a.data.movingS, elapsedS: a.data.elapsedS, distanceM: sport === 'strength' ? null : a.data.distanceM, elevGainM: sport === 'strength' ? null : a.data.elevGainM, gear: a.data.gear,
      ...impact(w), sets: null, exercises: null, liftLb: null,
      sources: ['strava', ...(w ? ['whoop' as const] : []), ...(rn ? ['runna' as const] : [])],
    })
  }

  // Weightlifting: FitnessAI, when it's the strength source.
  const fitnessCoveredUntil = src.strength === 'fitnessai' ? lifts.reduce((m, f) => (f.day! > m ? f.day! : m), '') : ''
  for (const f of src.strength === 'fitnessai' ? lifts : []) {
    const t0 = Date.parse(f.data.start), span = { t0, t1: f.data.end ? Date.parse(f.data.end) : t0 + 1000 * (f.data.durationS ?? 3600) }
    const w = bestWhoop(span, 'strength', f.day!, 2)
    sessions.push({
      id: `fitnessai:${f.id}`, day: f.day!, start: f.data.start, sport: 'strength', name: liftName(f.data),
      movingS: f.data.durationS, elapsedS: Math.round((span.t1 - span.t0) / 1000), distanceM: null, elevGainM: null, gear: null,
      ...impact(w), calories: w?.r.data.kcal ?? (f.data.kcal != null ? Math.round(f.data.kcal) : null),
      sets: f.data.sets, exercises: f.data.exercises.length, liftLb: f.data.volumeLb == null ? null : Math.round(f.data.volumeLb),
      sources: ['fitnessai', ...(w ? ['whoop' as const] : [])],
    })
  }

  // WHOOP: the sports whose source is WHOOP, everything outside the four (walks, hikes, golf…), and what the other
  // sources leave over: with Strava for runs, a WHOOP run with no Strava match is a treadmill run (no distance); with
  // Strava for rides, an unmatched WHOOP ride is an indoor ride (no distance); with FitnessAI for strength, WHOOP lifts
  // after the last export are provisional. Unmatched WHOOP swims, and lifts the chosen app should have, are left out.
  const unmatched = { treadmillRuns: 0, whoopSwims: 0, whoopLifts: 0, provisionalLifts: [] as string[], fitnessCoveredUntil }
  for (const w of whoop) {
    if (used.has(w.r.id)) continue
    const own = !SOURCE_SPORTS.includes(w.sport as SourceSport) || src[w.sport as SourceSport] === 'whoop'
    let name = w.r.data.name, distanceM = w.r.data.distanceM, provisional = false
    if (!own) {
      if (w.sport === 'run') { unmatched.treadmillRuns++; name = 'Treadmill run'; distanceM = null }
      else if (w.sport === 'ride') { name = 'Indoor ride'; distanceM = null }
      else if (w.sport === 'swim') { unmatched.whoopSwims++; continue }
      else if (src.strength === 'fitnessai' && w.r.day! > fitnessCoveredUntil) { provisional = true; unmatched.provisionalLifts.push(w.r.day!); name = `${name} · from WHOOP` }
      else { unmatched.whoopLifts++; continue }
    }
    sessions.push({
      id: `whoop:${w.r.id}`, day: w.r.day!, start: w.r.data.start, sport: w.sport as Sport, name, provisional,
      movingS: w.r.data.durationMin != null ? w.r.data.durationMin * 60 : Math.round((w.t1 - w.t0) / 1000), elapsedS: Math.round((w.t1 - w.t0) / 1000),
      distanceM, elevGainM: null, gear: null, ...impact(w), sets: null, exercises: null, liftLb: null, sources: ['whoop'],
    })
  }
  unmatched.provisionalLifts.sort()

  return { sessions: sessions.sort((a, b) => b.start.localeCompare(a.start)), records: sessions.length, stravaIgnored, unmatched, sources: src }
}
