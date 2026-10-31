// FORM swims: per-length data turned into a swim summary (for sessions, the Training list and the coach) and a full
// detail view (GET /api/swims/:id, the swim modal on the Training page).
//
// Bad data is ignored, not deleted: the goggles sometimes miscount a turn or a push-off, which shows up as a length
// that is impossibly fast or a freestyle length with no strokes. Such lengths still count toward the swim's
// distance (the length was swum; Strava gets the same total), but never toward pace, SWOLF, stroke metrics or
// bests. Rules (`flagOf`):
//   - faster than 1:00 per 100 m (15 s for a 25 m length): faster than the athlete could swim it;
//   - 0 strokes on a stroke that isn't drill (drill lengths have no stroke count by design).
// Units: stored in metres; shown in yards (the as the rest of the app).
// Heart rate here is FORM's armband per length, used only inside the swim view. A swim's impact (avg/max HR,
// strain, zones, calories) comes from WHOOP, like every other workout (sessions.ts).
import type { FormSwim, SwimLength } from '../model.ts'

const YD = 0.9144
const MIN_S_PER_100M = 60

export const STROKE: Record<string, string> = { FR: 'Freestyle', BK: 'Backstroke', BR: 'Breaststroke', FL: 'Butterfly', DR: 'Drill', IM: 'Individual medley', KI: 'Kick', MX: 'Mixed' }
const strokeName = (c: string) => STROKE[c] ?? c

export function flagOf(l: SwimLength): string | null {
  if (l.m <= 0 || l.s <= 0) return 'No time or distance recorded'
  if (l.s / l.m * 100 < MIN_S_PER_100M) return `${l.s.toFixed(1)} s for ${Math.round(l.m / YD)} yd is faster than possible: likely a missed turn or push-off`
  if (l.stroke !== 'DR' && l.stroke !== 'KI' && !l.strokes) return 'No strokes counted'
  return null
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const avg = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x != null); return v.length ? sum(v) / v.length : null }
const r1 = (x: number | null) => (x == null ? null : Math.round(x * 10) / 10)
const r0 = (x: number | null) => (x == null ? null : Math.round(x))
/** Seconds per 100 yd. */
const per100yd = (s: number, m: number) => (m > 0 ? s / (m / YD / 100) : null)
export const clock = (s: number | null) => {
  if (s == null) return null
  s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`
}

/** Metrics over a set of clean lengths. SWOLF only from lengths with strokes: a drill length's SWOLF is just its time. */
function metrics(ls: SwimLength[]) {
  const m = sum(ls.map(l => l.m)), s = sum(ls.map(l => l.s))
  return {
    yd: Math.round(m / YD), m, s, paceS: r1(per100yd(s, m)), pace: clock(per100yd(s, m)),
    swolf: r1(avg(ls.filter(l => l.strokes).map(l => l.swolf))), strokes: r1(avg(ls.map(l => l.strokes || null))), rate: r0(avg(ls.map(l => l.rate || null))),
    dpsYd: r1(avg(ls.map(l => (l.dps == null ? null : l.dps / YD)))), hr: r0(avg(ls.map(l => l.hr))), maxHr: ls.some(l => l.maxHr) ? Math.max(...ls.map(l => l.maxHr ?? 0)) : null,
  }
}

/** First-third vs last-third of a set's clean freestyle lengths: how stroke, pace and heart rate hold up. */
function driftOf(ls: SwimLength[]) {
  if (ls.length < 6) return null
  const k = Math.max(2, Math.floor(ls.length / 3)), a = ls.slice(0, k), b = ls.slice(-k)
  const pace = (x: SwimLength[]) => r1(per100yd(sum(x.map(l => l.s)), sum(x.map(l => l.m))))
  return { n: k, swolf: [r1(avg(a.map(l => l.swolf))), r1(avg(b.map(l => l.swolf)))], paceS: [pace(a), pace(b)], hr: [r0(avg(a.map(l => l.hr))), r0(avg(b.map(l => l.hr)))] }
}

/** The short version, attached to the swim's session: everything the list, bests and coach need. */
export function swimSummary(f: FormSwim) {
  const clean = f.lengths.filter(l => !flagOf(l)), free = clean.filter(l => l.stroke === 'FR')
  const all = metrics(clean), fr = free.length ? metrics(free) : null
  // The main freestyle set (most clean freestyle lengths) and its drift.
  const bySet = new Map<number, SwimLength[]>()
  for (const l of free) bySet.set(l.set, [...(bySet.get(l.set) ?? []), l])
  const main = [...bySet.values()].sort((a, b) => b.length - a.length)[0]
  const drift = main ? driftOf(main) : null
  return {
    lengths: f.lengths.length, excluded: f.lengths.length - clean.length,
    distanceM: sum(f.lengths.map(l => l.m)), movingS: sum(f.lengths.map(l => l.s)), restS: sum(f.lengths.map(l => l.restS)),
    cleanM: all.m, cleanS: all.s, paceS: all.paceS,
    free: fr && { yd: fr.yd, paceS: fr.paceS, pace: fr.pace, swolf: fr.swolf, strokes: fr.strokes, rate: fr.rate, dpsYd: fr.dpsYd },
    mainSet: main && drift ? { label: `${main[0].setLabel} ${strokeName('FR').toLowerCase()}`, drift } : null,
    poolM: f.poolM, poolUnit: f.poolUnit, variant: f.variant,
  }
}
export type SwimSummary = ReturnType<typeof swimSummary>

/** Seconds per metre of a swim session: FORM's clean lengths when it has them, else moving time over distance. */
export const swimPace = (a: { swim?: SwimSummary; distanceM: number | null; movingS: number | null }) =>
  a.swim ? (a.swim.cleanM ? a.swim.cleanS / a.swim.cleanM : null) : a.distanceM && a.movingS ? a.movingS / a.distanceM : null

/** Everything for the swim view. `impact` is the session's WHOOP data, passed in by the caller. */
export function swimDetail(f: FormSwim) {
  const flagged = f.lengths.map(l => ({ l, flag: flagOf(l) }))
  const sets = [...new Set(f.lengths.map(l => l.set))].map(n => {
    const ls = flagged.filter(x => x.l.set === n), clean = ls.filter(x => !x.flag).map(x => x.l)
    const strokes = [...new Set((clean.length ? clean : ls.map(x => x.l)).map(l => l.stroke))]
    const freeClean = clean.filter(l => l.stroke === 'FR')
    const mt = metrics(clean)
    return {
      n, label: ls[0].l.setLabel, stroke: strokes.map(strokeName).join(' + '), lengths: ls.length, yd: Math.round(sum(ls.map(x => x.l.m)) / YD),
      swimS: r1(sum(ls.map(x => x.l.s))), restS: r1(sum(ls.map(x => x.l.restS))),
      pace: mt.pace, paceS: mt.paceS, swolf: mt.swolf, strokesPerLen: mt.strokes, rate: mt.rate, hr: mt.hr, maxHr: mt.maxHr,
      excluded: ls.length - clean.length, drift: driftOf(freeClean),
    }
  })
  const byStroke = [...new Set(f.lengths.map(l => l.stroke))].map(code => {
    const ls = flagged.filter(x => x.l.stroke === code), clean = ls.filter(x => !x.flag).map(x => x.l), mt = metrics(clean)
    return { code, name: strokeName(code), lengths: ls.length, yd: Math.round(sum(ls.map(x => x.l.m)) / YD), pace: mt.pace, swolf: mt.swolf, excluded: ls.length - clean.length }
  }).sort((a, b) => b.yd - a.yd)
  return {
    summary: swimSummary(f),
    pool: f.poolM == null ? null : f.poolUnit === 'yd' ? `${Math.round(f.poolM / YD)} yd pool` : `${Math.round(f.poolM)} m pool`,
    variant: f.variant, hrDevice: f.hrDevice, device: f.device,
    sets, byStroke,
    lengths: flagged.map(({ l, flag }, i) => ({
      i: i + 1, set: l.set, stroke: l.stroke, atS: l.atS, s: r1(l.s), yd: Math.round(l.m / YD), restS: r1(l.restS),
      paceS: r1(per100yd(l.s, l.m)), swolf: l.swolf, strokes: l.strokes, rate: l.rate, dpsYd: l.dps == null ? null : r1(l.dps / YD), hr: l.hr, maxHr: l.maxHr, flag,
    })),
  }
}
export type SwimDetail = ReturnType<typeof swimDetail>
