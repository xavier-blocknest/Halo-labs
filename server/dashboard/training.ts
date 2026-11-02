// Training numbers (spec section 04 · Training) from sessions: one per workout, each sport from its own source
// of truth, chosen in Settings → Activity sources (by default swims: FORM, else Strava; runs: Strava; lifts: FitnessAI;
// everything else: WHOOP; impact data from WHOOP). See sessions.ts. Swim pace for FORM swims leaves out glitchy lengths (swims.ts).
import { readRecords } from '../db.ts'
import type { StravaGear } from '../model.ts'
import { personalBests } from './bests.ts'
import { buildSessions, type Session } from './sessions.ts'
import { swimPace } from './swims.ts'
import { addDays, diffDays, dow, localHour, localTime, short, weekStart } from './time.ts'

const MI = 1609.344, YD = 0.9144, FT = 0.3048
type Act = Session

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const r1 = (x: number) => Math.round(x * 10) / 10
const mins = (a: Act) => (a.movingS ?? a.elapsedS ?? 0) / 60
export const pace = (secPerMile: number) => { let m = Math.floor(secPerMile / 60), s = Math.round(secPerMile % 60); if (s === 60) { m++; s = 0 } return `${m}:${String(s).padStart(2, '0')}` }

export function trainingSummary(today: string) {
  const { sessions, stravaIgnored, unmatched } = buildSessions()
  const acts: Act[] = sessions.filter(a => a.day <= today) // newest first
  if (!acts.length) return null
  const year = today.slice(0, 4)
  const of = (sport: Act['sport']) => acts.filter(a => a.sport === sport)

  // Weekly volume, last 12 Mon–Sun weeks including the current one.
  const thisWeek = weekStart(today)
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const start = addDays(thisWeek, (i - 11) * 7), end = addDays(start, 6)
    const w = acts.filter(a => a.day >= start && a.day <= end)
    const by = (s: Act['sport']) => w.filter(a => a.sport === s)
    return {
      l: i === 11 ? 'Now' : short(start), current: i === 11,
      endH: r1(sum([...by('run'), ...by('ride'), ...by('swim')].map(mins)) / 60),
      runMi: r1(sum(by('run').map(a => (a.distanceM ?? 0) / MI))),
      swimYd: Math.round(sum(by('swim').map(a => (a.distanceM ?? 0) / YD))),
      bikeMi: r1(sum(by('ride').map(a => (a.distanceM ?? 0) / MI))),
      strH: r1(sum(by('strength').map(mins)) / 60), strN: by('strength').length,
      walkMi: r1(sum(by('walk').map(a => (a.distanceM ?? 0) / MI))),
    }
  })

  // Consistency heatmap: 16 weeks of days, swim+bike+run+strength minutes; walk-only days flagged.
  const heatStart = addDays(thisWeek, -15 * 7)
  const heat = Array.from({ length: 16 * 7 }, (_, i) => {
    const day = addDays(heatStart, i), d = acts.filter(a => a.day === day)
    const minutes = Math.round(sum(d.filter(a => ['run', 'ride', 'swim', 'strength'].includes(a.sport)).map(mins)))
    return { day, l: short(day), min: minutes, walkOnly: minutes === 0 && d.some(a => a.sport === 'walk'), future: day > today }
  })

  // Time of day this year, excluding walks.
  const tod = [0, 0, 0, 0]
  for (const a of acts.filter(a => a.day.startsWith(year) && a.sport !== 'walk')) {
    const h = localHour(a.start)
    tod[h < 11 ? 0 : h < 15 ? 1 : h < 20 ? 2 : 3]++
  }

  // Active streak: consecutive days with any activity, counting back from yesterday (today if already
  // active). Until a source syncs live, exports lag a day or two, so count from the last active day when
  // it is that recent.
  const activeDays = new Set(acts.map(a => a.day))
  const lastActive = acts[0].day
  let cursor = activeDays.has(today) ? today : diffDays(today, lastActive) <= 2 ? lastActive : addDays(today, -1), streak = 0
  while (activeDays.has(cursor)) { streak++; cursor = addDays(cursor, -1) }
  const streakSince = streak ? addDays(cursor, 1) : null

  const longest = (s: Act['sport'], unit: number) => {
    const best = of(s).reduce<Act | null>((m, a) => ((a.distanceM ?? 0) > (m?.distanceM ?? 0) ? a : m), null)
    return best ? { v: s === 'swim' ? Math.round(best.distanceM! / unit) : r1(best.distanceM! / unit), day: best.day } : null
  }

  // Gear mileage from activities (and Strava gear totals when the API is connected).
  const apiGear = readRecords<StravaGear>('strava', 'gear').map(g => g.data)
  const gearMap = new Map<string, { m: number; n: number; kind: 'bike' | 'shoe' }>()
  for (const a of acts) if (a.gear) {
    const g = gearMap.get(a.gear) ?? { m: 0, n: 0, kind: a.sport === 'ride' ? 'bike' as const : 'shoe' as const }
    g.m += a.distanceM ?? 0; g.n++; gearMap.set(a.gear, g)
  }
  const gear = [...gearMap].map(([name, g]) => ({ name, kind: g.kind, mi: r1((apiGear.find(x => x.name === name)?.distanceM ?? g.m) / MI), n: g.n, retired: apiGear.find(x => x.name === name)?.retired ?? null }))
    .sort((a, b) => b.mi - a.mi)

  const runs = of('run').filter(a => (a.distanceM ?? 0) >= MI)
  const runsYear = runs.filter(a => a.day.startsWith(year))
  const runRow = (a: Act) => ({ id: a.id, runna: a.sources.includes('runna'), day: a.day, d: short(a.day), name: a.name, mi: r1(a.distanceM! / MI), pace: pace((a.movingS ?? 0) / (a.distanceM! / MI)), min: Math.round(mins(a)), ft: Math.round((a.elevGainM ?? 0) / FT), hr: a.avgHr ? Math.round(a.avgHr) : null, gear: a.gear ?? '' })
  const fastest3 = runs.filter(a => a.distanceM! >= 3 * MI && a.movingS).sort((a, b) => a.movingS! / a.distanceM! - b.movingS! / b.distanceM!)[0]
  const monthMi = (ym: string) => r1(sum(runs.filter(a => a.day.startsWith(ym)).map(a => a.distanceM! / MI)))
  const ym = today.slice(0, 7), prevYm = addDays(`${ym}-01`, -1).slice(0, 7)

  const swims = of('swim').filter(a => a.day.startsWith(year))
  const swimRow = (a: Act) => { const p = swimPace(a); return { id: a.id, detail: !!a.swim, day: a.day, d: short(a.day), name: a.name, yd: Math.round((a.distanceM ?? 0) / YD), min: Math.round(mins(a)), pace: p ? pace(p * YD * 100) : '', swolf: a.swim?.free?.swolf ?? null, hr: a.avgHr ? Math.round(a.avgHr) : null, mhr: a.maxHr ? Math.round(a.maxHr) : null } }
  const bestSwim = swims.filter(a => (a.distanceM ?? 0) >= 200 && swimPace(a)).sort((a, b) => swimPace(a)! - swimPace(b)!)[0]

  const rides = of('ride').filter(a => (a.distanceM ?? 0) >= MI)
  const rideRow = (a: Act) => ({ id: a.id, day: a.day, d: short(a.day), name: a.name, mi: r1(a.distanceM! / MI), min: Math.round(mins(a)), mph: a.movingS ? r1(a.distanceM! / MI / (a.movingS / 3600)) : null, ft: Math.round((a.elevGainM ?? 0) / FT), hr: a.avgHr ? Math.round(a.avgHr) : null })
  // Any real ride, including indoor rides with no distance (often WHOOP-only); under 10 minutes is noise.
  const lastRide = of('ride').find(a => mins(a) >= 10 || (a.distanceM ?? 0) >= MI) ?? null

  const lifts = of('strength')
  const liftsYear = lifts.filter(a => a.day.startsWith(year)), lifts30 = lifts.filter(a => a.day > addDays(today, -30))
  const liftRow = (a: Act) => ({ id: a.id, day: a.day, d: short(a.day), name: a.name, min: Math.round(mins(a)), hr: a.avgHr ? Math.round(a.avgHr) : null, mhr: a.maxHr ? Math.round(a.maxHr) : null, strain: a.strain, cal: a.calories, sets: a.sets, lb: a.liftLb })

  // The best activity per sport, for the "Best" badge on the lists (pinned on top when it's older than the list):
  // run = fastest pace on 3 mi or more; swim = fastest pace per 100 yd; ride = fastest average speed on 10 mi or more
  // (any ride over a mile when none is that long); strength = most weight lifted in one session.
  const mph = (a: Act) => (a.movingS ? a.distanceM! / a.movingS : 0)
  const bestRide = (rides.some(a => a.distanceM! >= 10 * MI) ? rides.filter(a => a.distanceM! >= 10 * MI) : rides).filter(a => a.movingS).sort((a, b) => mph(b) - mph(a))[0]
  const bestLift = lifts.filter(a => (a.liftLb ?? 0) > 0).sort((a, b) => b.liftLb! - a.liftLb!)[0]
  const walks = of('walk').filter(a => a.day.startsWith(year)), walks30 = of('walk').filter(a => a.day > addDays(today, -30))
  const walkRow = (a: Act) => ({ day: a.day, d: short(a.day), name: a.name, mi: r1((a.distanceM ?? 0) / MI), min: Math.round(mins(a)), pace: a.distanceM ? pace((a.movingS ?? 0) / (a.distanceM / MI)) : '', ft: Math.round((a.elevGainM ?? 0) / FT), hr: a.avgHr ? Math.round(a.avgHr) : null })

  // Longest session per month (Roadmap · progress to race) and estimated pace at 140 bpm (aerobic efficiency,
  // spec 04: pace × avg HR / 140, from runs that have WHOOP heart rate).
  const monthlyLongest: Record<string, { run: number; swim: number; ride: number }> = {}
  for (const a of acts) {
    const ym = a.day.slice(0, 7), m = (monthlyLongest[ym] ??= { run: 0, swim: 0, ride: 0 })
    if (a.sport === 'run' && a.distanceM) m.run = Math.max(m.run, r1(a.distanceM / MI))
    if (a.sport === 'swim' && a.distanceM) m.swim = Math.max(m.swim, Math.round(a.distanceM / YD))
    if (a.sport === 'ride' && (a.distanceM ?? 0) >= MI) m.ride = Math.max(m.ride, r1(a.distanceM! / MI))
  }
  const effRuns = runs.filter(a => a.avgHr && a.movingS && a.day > addDays(today, -84)).reverse()
    .map(a => { const paceS = a.movingS! / (a.distanceM! / MI); return { day: a.day, d: short(a.day), paceS: Math.round(paceS), hr: Math.round(a.avgHr!), est: Math.round(paceS * a.avgHr! / 140) } })

  const full4 = weeks.slice(7, 11) // last 4 full weeks

  // This week, day by day, and counts against the 4-week average (there is no plan to compare against yet).
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(thisWeek, i)
    const items = acts.filter(a => a.day === day).sort((a, b) => a.start.localeCompare(b.start)).map(a => ({
      name: a.name, sport: a.sport, time: localTime(a.start), min: Math.round(mins(a)),
      mi: a.distanceM && ['run', 'ride', 'walk'].includes(a.sport) ? r1(a.distanceM / MI) : null,
      yd: a.sport === 'swim' && a.distanceM ? Math.round(a.distanceM / YD) : null,
    }))
    return { day, d: dow(day), date: short(day), today: day === today, future: day > today, items }
  })
  const countWeek = (start: string) => {
    const w = acts.filter(a => a.day >= start && a.day <= addDays(start, 6))
    return { strength: w.filter(a => a.sport === 'strength').length, runs: w.filter(a => a.sport === 'run').length, swims: w.filter(a => a.sport === 'swim').length,
      rides: w.filter(a => a.sport === 'ride').length, activeDays: new Set(w.map(a => a.day)).size }
  }
  const prev4 = [1, 2, 3, 4].map(k => countWeek(addDays(thisWeek, -7 * k)))
  const weekCounts = { now: countWeek(thisWeek), avg4: Object.fromEntries(Object.keys(prev4[0]).map(k => [k, r1(sum(prev4.map(w => w[k as keyof typeof w])) / 4)])) }
  const avgOf = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x !== null); return v.length ? sum(v) / v.length : null }

  return {
    year, weeks, heat, tod, streak, streakSince, gear, weekDays, weekCounts, weekStart: thisWeek,
    merge: { sessions: sessions.length, stravaIgnored, unmatched },
    monthlyLongest, effRuns,
    lastActivity: acts[0].day,
    bests: personalBests(acts, today),
    longest: { swim: longest('swim', YD), ride: longest('ride', MI), run: longest('run', MI) },
    kpis: {
      sbrPerWeek: r1(sum(full4.map(w => w.endH)) / 4), strPerWeek: r1(sum(full4.map(w => w.strN)) / 4),
      runMonth: { mi: monthMi(ym), prevMi: monthMi(prevYm), n: runs.filter(a => a.day.startsWith(ym)).length, longest: r1(Math.max(0, ...runs.filter(a => a.day.startsWith(ym)).map(a => a.distanceM! / MI))) },
      swimYear: { yd: sum(swims.map(a => Math.round((a.distanceM ?? 0) / YD))), n: swims.length },
      lastRide: lastRide ? { day: lastRide.day, mi: (lastRide.distanceM ?? 0) >= MI ? r1(lastRide.distanceM! / MI) : null, min: Math.round(mins(lastRide)), daysAgo: diffDays(today, lastRide.day) } : null,
      strAvgMin: Math.round(avgOf(lifts30.map(mins)) ?? 0),
    },
    run: {
      n: runsYear.length, mi: r1(sum(runsYear.map(a => a.distanceM! / MI))),
      avgPace: runsYear.length ? pace(sum(runsYear.map(a => a.movingS ?? 0)) / sum(runsYear.map(a => a.distanceM! / MI))) : null,
      fastest3: fastest3 ? { pace: pace(fastest3.movingS! / (fastest3.distanceM! / MI)), d: short(fastest3.day), mi: r1(fastest3.distanceM! / MI) } : null,
      ft: Math.round(sum(runsYear.map(a => (a.elevGainM ?? 0) / FT))), list: runs.slice(0, 12).map(runRow),
      bestRow: fastest3 ? runRow(fastest3) : null, bestWhy: 'Fastest pace on a run of 3 mi or more',
    },
    swim: {
      n: swims.length, yd: sum(swims.map(a => Math.round((a.distanceM ?? 0) / YD))), first: swims.at(-1)?.day ?? null,
      best: bestSwim ? { pace: pace(swimPace(bestSwim)! * YD * 100), d: short(bestSwim.day), name: bestSwim.name } : null,
      hr: Math.round(avgOf(swims.map(a => a.avgHr)) ?? 0) || null, mhr: Math.max(0, ...swims.map(a => a.maxHr ?? 0)) || null, list: swims.slice(0, 12).map(swimRow),
      bestRow: bestSwim ? swimRow(bestSwim) : null, bestWhy: 'Fastest pace per 100 yd',
      // FORM technique per swim (newest 8), for the coach: freestyle pace/SWOLF/strokes over clean lengths, main-set drift.
      form: of('swim').filter(a => a.swim).slice(0, 8).map(a => ({ day: a.day, name: a.name, yd: Math.round((a.distanceM ?? 0) / YD), swimMin: Math.round(a.swim!.movingS / 60), restMin: Math.round(a.swim!.restS / 60), excluded: a.swim!.excluded, free: a.swim!.free, mainSet: a.swim!.mainSet })),
    },
    ride: {
      n: rides.filter(a => a.day.startsWith(year)).length, mi: r1(sum(rides.filter(a => a.day.startsWith(year)).map(a => a.distanceM! / MI))),
      mph: (() => { const r = rides.filter(a => a.day.startsWith(year) && a.movingS); return r.length ? r1(sum(r.map(a => a.distanceM! / MI)) / (sum(r.map(a => a.movingS!)) / 3600)) : null })(),
      ft: Math.round(sum(rides.filter(a => a.day.startsWith(year)).map(a => (a.elevGainM ?? 0) / FT))), list: rides.slice(0, 12).map(rideRow),
      bestRow: bestRide ? rideRow(bestRide) : null, bestWhy: rides.some(a => a.distanceM! >= 10 * MI) ? 'Fastest average speed on a ride of 10 mi or more' : 'Fastest average speed',
    },
    strength: {
      n: liftsYear.length, h: r1(sum(liftsYear.map(mins)) / 60), n30: lifts30.length, avgMin: Math.round(avgOf(lifts30.map(mins)) ?? 0),
      hr: Math.round(avgOf(lifts30.map(a => a.avgHr)) ?? 0) || null,
      strain: (() => { const v = avgOf(lifts30.map(a => a.strain)); return v === null ? null : r1(v) })(),
      cal: Math.round(avgOf(lifts30.map(a => a.calories)) ?? 0) || null,
      list: lifts.slice(0, 12).map(liftRow),
      bestRow: bestLift ? liftRow(bestLift) : null, bestWhy: 'Most weight lifted in one session',
    },
    walk: {
      n: walks.length, mi: r1(sum(walks.map(a => (a.distanceM ?? 0) / MI))), perDay30: r1(sum(walks30.map(a => (a.distanceM ?? 0) / MI)) / 30),
      h: r1(sum(walks.map(mins)) / 60), ft: Math.round(sum(walks.map(a => (a.elevGainM ?? 0) / FT))),
      hr: Math.round(avgOf(walks.map(a => a.avgHr)) ?? 0) || null, cal: Math.round(sum(walks.map(a => a.calories ?? 0))) || null,
      list: of('walk').slice(0, 12).map(walkRow),
    },
  }
}
