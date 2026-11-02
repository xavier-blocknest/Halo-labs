// Month in review (GET /api/review?month=YYYY-MM): the highlights of one calendar month across every source, each
// compared with the month before, in the spirit of Strava's monthly recap. Workouts come from buildSessions(), so each
// one counts once under the same source-of-truth rules as every other page. A section is null when its source has
// nothing that month; nothing is estimated. For the month in progress, the comparison uses the same days of last month.
import { readRecords } from '../db.ts'
import type { DexaScan, LabDraw, LabResult, LiftWorkout, NutritionDay, Vo2Test, WhoopCycle, WhoopSleep, WhoopWorkout, JournalEntry } from '../model.ts'
import { personalBests } from './bests.ts'
import { planSummary } from './plan.ts'
import { buildSessions, type Session, type Sport } from './sessions.ts'
import { addDays, medium } from './time.ts'
import { RECOVERY } from './whoop.ts'

const MI = 1609.344, YD = 0.9144, FT = 0.3048
const r1 = (x: number) => Math.round(x * 10) / 10
const avg = (xs: (number | null | undefined)[]) => { const v = xs.filter((x): x is number => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null }
const lastDay = (m: string) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).toISOString().slice(0, 10)
const prevMonth = (m: string) => { const d = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 2, 1)); return d.toISOString().slice(0, 7) }
const monthLabel = (m: string) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1, 15)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const SPORT_LABEL: Record<Sport, string> = { run: 'Running', ride: 'Cycling', swim: 'Swimming', walk: 'Walking', strength: 'Strength', other: 'Other' }

/** A value this month and last, for the ▲/▼ line. `pct` is null when last month had none (nothing to compare). */
const cmp = (now: number | null, prev: number | null) => ({ now, prev, pct: now != null && prev ? Math.round(((now - prev) / Math.abs(prev)) * 100) : null })

/** Every finished month with any data, newest first (the month in progress shows from the 1st of the next one). */
export function reviewMonths(today: string): string[] {
  const days = buildSessions().sessions.map(s => s.day).concat(readRecords('whoop', 'cycle').map(r => r.day ?? '')).filter(Boolean).sort()
  if (!days.length) return []
  const out: string[] = []
  for (let m = prevMonth(today.slice(0, 7)); m >= days[0].slice(0, 7); m = prevMonth(m)) out.push(m)
  return out
}

export function monthReview(month: string, today: string) {
  const from = `${month}-01`, end = lastDay(month), to = end < today ? end : today, partial = to < end
  // The month before: whole, or the same days when this month is still going.
  const pm = prevMonth(month), pFrom = `${pm}-01`, pEnd = lastDay(pm)
  const pTo = partial ? (addDays(pFrom, Number(to.slice(8)) - 1) < pEnd ? addDays(pFrom, Number(to.slice(8)) - 1) : pEnd) : pEnd
  const inM = (d: string | null | undefined) => !!d && d >= from && d <= to
  const inP = (d: string | null | undefined) => !!d && d >= pFrom && d <= pTo

  // ---- Training (each workout once) --------------------------------------------------------------------------------
  const all = buildSessions().sessions
  const S = all.filter(s => inM(s.day)), P = all.filter(s => inP(s.day))
  const tot = (xs: Session[]) => {
    const dist = (sp: Sport) => xs.filter(x => x.sport === sp).reduce((a, x) => a + (x.distanceM ?? 0), 0)
    const time = new Map<Sport, number>()
    for (const x of xs) time.set(x.sport, (time.get(x.sport) ?? 0) + (x.movingS ?? x.elapsedS ?? 0))
    return {
      days: new Set(xs.map(x => x.day)).size, n: xs.length, hours: r1(xs.reduce((a, x) => a + (x.movingS ?? x.elapsedS ?? 0), 0) / 3600),
      runMi: r1(dist('run') / MI), rideMi: r1(dist('ride') / MI), walkMi: r1(dist('walk') / MI), swimYd: Math.round(dist('swim') / YD),
      elevFt: Math.round(xs.reduce((a, x) => a + (x.elevGainM ?? 0), 0) / FT), strain: avg(xs.map(x => x.strain)),
      top: [...time].sort((a, b) => b[1] - a[1])[0] ?? null,
    }
  }
  const t = tot(S), tp = tot(P)
  const activeDays = new Set(S.map(s => s.day))
  const calendar = Array.from({ length: Number(end.slice(8)) }, (_, i) => { const d = addDays(from, i); return { day: d, active: activeDays.has(d), future: d > to } })
  const bySport = (['run', 'ride', 'swim', 'walk', 'strength', 'other'] as Sport[]).map(sp => {
    const xs = S.filter(s => s.sport === sp), px = P.filter(s => s.sport === sp)
    return { sport: sp, label: SPORT_LABEL[sp], n: xs.length, prevN: px.length, hours: r1(xs.reduce((a, x) => a + (x.movingS ?? x.elapsedS ?? 0), 0) / 3600) }
  }).filter(x => x.n || x.prevN)
  const longest = (sp: Sport) => { const x = S.filter(s => s.sport === sp && (s.distanceM ?? 0) > 0).sort((a, b) => b.distanceM! - a.distanceM!)[0]
    return x ? { day: x.day, dayL: medium(x.day), name: x.name, v: sp === 'swim' ? `${Math.round(x.distanceM! / YD).toLocaleString()} yd` : `${r1(x.distanceM! / MI)} mi` } : null }
  const hardest = S.filter(s => s.strain != null).sort((a, b) => b.strain! - a.strain!)[0]
  const training = S.length || P.length ? {
    days: cmp(t.days, tp.days), sessions: cmp(t.n, tp.n), hours: cmp(t.hours, tp.hours),
    // Under a mile of riding is WHOOP's indoor-cycling distance, not real riding: shown as hours (bySport) instead.
    runMi: cmp(t.runMi || null, tp.runMi || null), rideMi: cmp(t.rideMi >= 1 ? t.rideMi : null, tp.rideMi >= 1 ? tp.rideMi : null), swimYd: cmp(t.swimYd || null, tp.swimYd || null),
    walkMi: cmp(t.walkMi || null, tp.walkMi || null), elevFt: cmp(t.elevFt || null, tp.elevFt || null),
    topSport: t.top ? { sport: t.top[0], label: SPORT_LABEL[t.top[0]], hours: r1(t.top[1] / 3600) } : null,
    bySport, calendar, longestRun: longest('run'), longestRide: t.rideMi >= 1 ? longest('ride') : null, longestSwim: longest('swim'),
    hardest: hardest ? { day: hardest.day, dayL: medium(hardest.day), name: hardest.name, strain: hardest.strain } : null,
  } : null

  // ---- Personal bests set this month (all-time bests that still stand) ----------------------------------------------
  const pb = personalBests(all, today)
  const bests: { k: string; v: string; dayL: string; name: string }[] = []
  const add = (k: string, b: { v: string; u: string; day: string; d: string; name: string } | null | undefined) => { if (b && inM(b.day)) bests.push({ k, v: `${b.v}${b.u ? ' ' + b.u : ''}`, dayL: b.d, name: b.name }) }
  for (const e of pb.run.efforts) add(`Fastest ${e.k}`, e)
  add('Longest run', pb.run.longest); add('Longest swim', pb.swim.longest); add('Fastest swim', pb.swim.fastest)
  add('Longest ride', pb.ride.longest); add('Fastest ride', pb.ride.fastest); add('Most climbing', pb.ride.climb)
  for (const s of pb.strength) add(`Heaviest ${s.k}`, s)

  // ---- Lifting (FitnessAI exports) ----------------------------------------------------------------------------------
  const workouts = readRecords<LiftWorkout>('fitnessai', 'workout')
  const lift = (keep: (d: string | null) => boolean) => {
    const ex = workouts.filter(w => keep(w.day)).flatMap(w => w.data.exercises)
    const by = new Map<string, number>()
    let lb = 0, sets = 0, reps = 0
    for (const e of ex) { const v = e.reps.reduce((a, r, i) => a + r * (e.weightLb[i] ?? 0), 0); lb += v; sets += e.reps.filter(r => r > 0).length; reps += e.reps.reduce((a, b) => a + b, 0); by.set(e.name, (by.get(e.name) ?? 0) + v) }
    return { lb: Math.round(lb), sets, reps, top: [...by].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, v]) => ({ name, lb: Math.round(v) })) }
  }
  const L = lift(inM), Lp = lift(inP)
  const lifting = L.sets || Lp.sets ? { lb: cmp(L.lb || null, Lp.lb || null), sets: cmp(L.sets || null, Lp.sets || null), reps: cmp(L.reps || null, Lp.reps || null), top: L.top } : null

  // ---- Recovery and sleep (WHOOP) -----------------------------------------------------------------------------------
  const cyc = readRecords<WhoopCycle>('whoop', 'cycle'), C = cyc.filter(c => inM(c.day)).map(c => c.data), Cp = cyc.filter(c => inP(c.day)).map(c => c.data)
  const sl = readRecords<WhoopSleep>('whoop', 'sleep'), Sl = sl.filter(s => inM(s.day)).map(s => s.data), Slp = sl.filter(s => inP(s.day)).map(s => s.data)
  const rw = readRecords<WhoopWorkout>('whoop', 'workout').filter(w => RECOVERY.test(w.data.name) && !/other recovery/i.test(w.data.name))
  const rwBy = (keep: (d: string | null) => boolean) => { const m = new Map<string, { n: number; min: number }>()
    for (const w of rw.filter(w => keep(w.day))) { const x = m.get(w.data.name) ?? { n: 0, min: 0 }; x.n++; x.min += w.data.durationMin ?? 0; m.set(w.data.name, x) }
    return m }
  const rwM = rwBy(inM), rwP = rwBy(inP)
  const bestRec = cyc.filter(c => inM(c.day) && c.data.recovery != null).sort((a, b) => b.data.recovery! - a.data.recovery!)[0]
  const recovery = C.length || Sl.length ? {
    recovery: cmp(r1(avg(C.map(c => c.recovery)) ?? NaN) || null, r1(avg(Cp.map(c => c.recovery)) ?? NaN) || null),
    green: C.filter(c => (c.recovery ?? -1) >= 67).length, yellow: C.filter(c => c.recovery != null && c.recovery >= 34 && c.recovery < 67).length, red: C.filter(c => c.recovery != null && c.recovery < 34).length,
    hrv: cmp(r1(avg(C.map(c => c.hrv)) ?? NaN) || null, r1(avg(Cp.map(c => c.hrv)) ?? NaN) || null),
    rhr: cmp(r1(avg(C.map(c => c.rhr)) ?? NaN) || null, r1(avg(Cp.map(c => c.rhr)) ?? NaN) || null),
    strain: cmp(r1(avg(C.map(c => c.strain)) ?? NaN) || null, r1(avg(Cp.map(c => c.strain)) ?? NaN) || null),
    sleepH: cmp(r1((avg(Sl.map(s => s.asleepMin)) ?? NaN) / 60) || null, r1((avg(Slp.map(s => s.asleepMin)) ?? NaN) / 60) || null),
    sleepPerf: cmp(Math.round(avg(Sl.map(s => s.performance)) ?? NaN) || null, Math.round(avg(Slp.map(s => s.performance)) ?? NaN) || null),
    bestDay: bestRec ? { dayL: medium(bestRec.day!), v: bestRec.data.recovery } : null,
    work: [...rwM].sort((a, b) => b[1].n - a[1].n).map(([name, x]) => ({ name, n: x.n, min: Math.round(x.min), prevN: rwP.get(name)?.n ?? 0 })),
  } : null

  // ---- Body and fuel (MacroFactor, DEXA) ----------------------------------------------------------------------------
  const mf = readRecords<NutritionDay>('macrofactor', 'day'), N = mf.filter(d => inM(d.day)), Np = mf.filter(d => inP(d.day))
  const logged = (xs: typeof mf) => xs.filter(d => d.data.kcal != null && d.data.kcal > 0)
  const wts = N.filter(d => (d.data.trendLb ?? d.data.weightLb) != null), w0 = wts[0], w1 = wts.at(-1)
  const wOf = (d: (typeof mf)[number]) => d.data.trendLb ?? d.data.weightLb!
  const dexa = readRecords<DexaScan>('dexa', 'scan').filter(s => inM(s.day)).map(s => ({ dayL: medium(s.day!), bodyFatPct: s.data.bodyFatPct, leanLb: s.data.leanLb, totalLb: s.data.totalLb }))
  const body = N.length || Np.length || dexa.length ? {
    weight: w0 && w1 && w0 !== w1 ? { from: r1(wOf(w0)), to: r1(wOf(w1)), change: r1(wOf(w1) - wOf(w0)), trend: w1.data.trendLb != null } : w1 ? { from: null, to: r1(wOf(w1)), change: null, trend: w1.data.trendLb != null } : null,
    daysLogged: cmp(logged(N).length || null, logged(Np).length || null),
    kcal: cmp(Math.round(avg(logged(N).map(d => d.data.kcal)) ?? NaN) || null, Math.round(avg(logged(Np).map(d => d.data.kcal)) ?? NaN) || null),
    protein: cmp(Math.round(avg(logged(N).map(d => d.data.proteinG)) ?? NaN) || null, Math.round(avg(logged(Np).map(d => d.data.proteinG)) ?? NaN) || null),
    satFat: cmp(r1(avg(logged(N).map(d => d.data.satFatG)) ?? NaN) || null, r1(avg(logged(Np).map(d => d.data.satFatG)) ?? NaN) || null),
    dexa,
  } : null

  // ---- Tests, roadmap, journal --------------------------------------------------------------------------------------
  const draws = readRecords<LabDraw>('labs', 'draw').filter(d => inM(d.day))
  const results = readRecords<LabResult>('labs', 'result')
  const labs = draws.map(d => { const rs = results.filter(r => r.day === d.day); return { dayL: medium(d.day!), lab: d.data.lab, n: rs.length, flagged: rs.filter(r => r.data.flag).map(r => r.data.marker) } })
  const vo2 = readRecords<Vo2Test>('vo2', 'test').filter(v => inM(v.day)).map(v => ({ dayL: medium(v.day!), vo2max: v.data.vo2max }))
  const plan = planSummary(today, null)
  const milestones = (plan?.milestones ?? []).filter((m: { name: string; status: string; start: string | null; end: string | null }) => m.start && m.start === m.end && inM(m.start)).map((m: { name: string; status: string; start: string | null }) => ({ name: m.name, dayL: medium(m.start!), status: m.status }))
  const journal = readRecords<JournalEntry>('journal', 'entry').filter(e => inM(e.day)).length

  return {
    month, label: monthLabel(month), prevLabel: monthLabel(pm).split(' ')[0], from, to, partial,
    training, bests, lifting, recovery, body, tests: labs.length || vo2.length ? { labs, vo2 } : null,
    milestones, journal,
  }
}
export type MonthReview = ReturnType<typeof monthReview>
