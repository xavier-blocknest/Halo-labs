// Training page · run view (GET /api/runs/:id): one run with everything we have on it, like the swim view.
// - The run itself: Strava (or WHOOP for a treadmill run), counted once by buildSessions().
// - Impact from WHOOP: heart rate, strain, zones, calories.
// - From Runna, when Runna tracked it (linked by Strava id): run type, plan workout, weather, mile splits with speed,
//   route and place, its fastest 5 miles. From Strava (runs fetched since Nov 2026): per-mile splits and the route line.
// - Best efforts inside the run (Strava's, plus Runna's 5 miles), each marked when it's the all-time best.
// The route is drawn from the encoded polyline here (no map tiles: nothing about where he runs leaves the Mac).
import { readRecords } from '../db.ts'
import type { RunnaEffort, RunnaRun, StravaActivity } from '../model.ts'
import { buildSessions } from './sessions.ts'

const MI = 1609.344, FT = 0.3048
const RUN_TYPE: Record<string, string> = { EASY_RUN: 'Easy run', LONG_RUN: 'Long run', TEMPO: 'Tempo', INTERVALS: 'Intervals', RECOVERY_RUN: 'Recovery run', RACE: 'Race', HILLS: 'Hills', FARTLEK: 'Fartlek' }
export const runTypeLabel = (t: string | null | undefined) => (t ? RUN_TYPE[t] ?? t.toLowerCase().replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()) : null)
const clock = (s: number) => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}` }
const r1 = (x: number) => Math.round(x * 10) / 10
const LABEL: Record<string, string> = { '1/2 mile': '½ mile', 'Half-Marathon': 'Half marathon', '5 mile': '5 miles' }

/** Google's encoded polyline → [lat, lng] points. */
function decode(s: string): [number, number][] {
  const out: [number, number][] = []
  let i = 0, lat = 0, lng = 0
  while (i < s.length) {
    for (const k of [0, 1]) {
      let shift = 0, res = 0, b: number
      do { b = s.charCodeAt(i++) - 63; res |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20 && i < s.length)
      const d = res & 1 ? ~(res >> 1) : res >> 1
      if (k === 0) lat += d; else lng += d
    }
    out.push([lat / 1e5, lng / 1e5])
  }
  return out
}

/** The route as an SVG path in a 100-wide box (north up, true proportions), thinned to ≤ 400 points. */
function routeShape(polyline: string | null | undefined) {
  if (!polyline) return null
  const pts = decode(polyline).filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b) && (a !== 0 || b !== 0))
  if (pts.length < 2) return null
  const k = Math.cos((pts.reduce((a, p) => a + p[0], 0) / pts.length) * Math.PI / 180)
  const xs = pts.map(p => p[1] * k), ys = pts.map(p => -p[0])
  const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0 || 1e-9, h = Math.max(...ys) - y0 || 1e-9
  const sc = 100 / Math.max(w, h), W = r1(w * sc), H = r1(h * sc)
  const step = Math.max(1, Math.ceil(pts.length / 400))
  const P = pts.map((_, j) => [r1((xs[j] - x0) * sc), r1((ys[j] - y0) * sc)]).filter((_, j) => j % step === 0 || j === pts.length - 1)
  return { w: W, h: H, d: 'M' + P.map(p => p.join(' ')).join('L'), start: P[0], end: P.at(-1)! }
}

/** Runna's fastest 5 miles is only believable when it's no slower than the whole run's average (elapsed time over
 *  Strava's distance): Runna sometimes reports one that includes stops. Shared with bests.ts. */
export function okFiveMi(s: number | null | undefined, run: { distanceM: number | null; elapsedS: number | null } | null | undefined) {
  if (!s) return false
  if (!run?.distanceM || !run.elapsedS || run.distanceM < 5 * MI * 0.98) return !run?.distanceM || run.distanceM >= 5 * MI * 0.98
  return s / 5 <= (run.elapsedS / (run.distanceM / MI)) * 1.02
}

/** Fastest effort per distance across every run (Strava's best efforts, Runna's 5 miles), to mark PRs. */
function allTimeBests() {
  const best = new Map<string, number>()
  const take = (k: string, s: number) => { if (s > 0 && (!best.has(k) || s < best.get(k)!)) best.set(k, s) }
  for (const r of readRecords<StravaActivity>('strava', 'activity')) for (const e of r.data.bestEfforts ?? []) take(e.name, e.elapsedS)
  const st = new Map(readRecords<StravaActivity>('strava', 'activity').map(r => [r.id, r.data]))
  for (const r of readRecords<RunnaRun>('runna', 'run')) if (okFiveMi(r.data.fastest5miS, st.get(String(r.data.stravaIds[0])) ?? r.data)) take('5 mile', r.data.fastest5miS!)
  for (const r of readRecords<RunnaEffort>('runna', 'effort')) if (okFiveMi(r.data.fastest5miS, st.get(r.data.stravaId))) take('5 mile', r.data.fastest5miS!)
  return best
}

export function runView(sessionId: string) {
  const s = buildSessions().sessions.find(x => x.id === sessionId && x.sport === 'run')
  if (!s) return null
  const sid = /^strava:(.+)$/.exec(s.id)?.[1] ?? null
  const st = sid ? readRecords<StravaActivity>('strava', 'activity').find(r => r.id === sid)?.data ?? null : null
  const rn = sid ? readRecords<RunnaRun>('runna', 'run').find(r => r.data.stravaIds.map(String).includes(sid))?.data ?? null : null
  const eff = sid ? readRecords<RunnaEffort>('runna', 'effort').find(r => r.data.stravaId === sid)?.data ?? null : null
  const mi = s.distanceM ? s.distanceM / MI : null, moving = s.movingS ?? s.elapsedS

  // Splits: Runna's when it tracked the run (with its speed), else Strava's (with elevation and heart rate).
  const splits = rn?.mileSplits.length
    ? rn.mileSplits.map((x, j) => ({ n: j + 1, mi: r1(x.m / MI), paceS: x.m > 0 ? Math.round(x.s / (x.m / MI)) : null, mph: x.speed ? r1(x.speed * 2.23694) : x.m > 0 && x.s > 0 ? r1((x.m / MI) / (x.s / 3600)) : null, elevFt: null as number | null, hr: null as number | null }))
    : (st?.splits ?? []).filter(x => x.m > 50).map((x, j) => ({ n: j + 1, mi: r1(x.m / MI), paceS: Math.round((x.movingS || x.s) / (x.m / MI)), mph: r1((x.m / MI) / ((x.movingS || x.s) / 3600)), elevFt: x.elevM == null ? null : Math.round(x.elevM / FT), hr: x.hr == null ? null : Math.round(x.hr) }))

  // Best efforts inside this run, shortest first; PR when it equals the all-time best.
  const all = allTimeBests()
  const five = rn?.fastest5miS ?? eff?.fastest5miS ?? null, fiveOk = okFiveMi(five, st ?? { distanceM: s.distanceM, elapsedS: s.elapsedS })
  const efforts = [...(st?.bestEfforts ?? []).map(e => ({ k: e.name, s: e.elapsedS, m: e.distanceM })), ...(fiveOk ? [{ k: '5 mile', s: five!, m: 5 * MI }] : [])]
    .sort((a, b) => a.m - b.m).map(e => ({ k: LABEL[e.k] ?? e.k, time: clock(e.s), pace: clock(e.s / (e.m / MI)), pr: all.get(e.k) === e.s }))

  const w = rn?.weather
  const route = routeShape(rn?.route?.polyline ?? st?.polyline)
  return {
    id: s.id, day: s.day, start: s.start, name: s.name, sources: s.sources,
    treadmill: s.sources.length === 1 && s.sources[0] === 'whoop',
    distanceMi: mi == null ? null : r1(mi), movingS: moving, elapsedS: s.elapsedS, paceS: mi && moving ? Math.round(moving / mi) : null,
    elevFt: s.elevGainM == null ? null : Math.round(s.elevGainM / FT), gear: s.gear,
    impact: { avgHr: s.avgHr, maxHr: s.maxHr, strain: s.strain, zonePct: s.zonePct, calories: s.calories },
    // Run type: the plan workout's when Runna tracked it; else Runna's guess from a run it only mirrored.
    runType: rn?.runType ? runTypeLabel(rn.runType) : eff?.guessType ? runTypeLabel(eff.guessType) : null, runTypeGuess: !rn?.runType && !!eff?.guessType,
    runna: rn ? { workout: rn.name, description: rn.description, planWeek: rn.planWeek, feedback: rn.feedback } : null,
    weather: w ? { tempF: w.tempC == null ? null : Math.round(w.tempC * 9 / 5 + 32), feelsF: w.feelsC == null ? null : Math.round(w.feelsC * 9 / 5 + 32), humidity: w.humidity,
      windMph: w.windMs == null ? null : Math.round(w.windMs * 2.23694), gustMph: w.gustMs == null ? null : Math.round(w.gustMs * 2.23694), precipMm: w.precipMm,
      desc: w.desc ? w.desc.replace(/^\w/, c => c.toUpperCase()) : w.status } : null,
    splits, splitsFrom: rn?.mileSplits.length ? 'Runna' : splits.length ? 'Strava' : null,
    efforts, route, place: rn?.route?.address ?? null, routeFrom: rn?.route?.polyline ? 'Runna' : st?.polyline ? 'Strava' : null,
  }
}
export type RunView = ReturnType<typeof runView>
