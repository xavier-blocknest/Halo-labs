// Recovery-side numbers from WHOOP cycles, sleeps and workouts.
import { readRecords } from '../db.ts'
import type { WhoopCycle, WhoopSleep, WhoopWorkout } from '../model.ts'
import { addDays, localTime, monthName, short } from './time.ts'

const avg = (xs: (number | null | undefined)[]) => {
  const v = xs.filter((x): x is number => typeof x === 'number')
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}
const r1 = (x: number | null) => (x === null ? null : Math.round(x * 10) / 10)

export type WhoopDay = { day: string; rec: number | null; hrv: number | null; rhr: number | null; resp: number | null; sl: number | null; st: number | null }

/** WHOOP activities that are recovery work (sauna, meditation, …), not training. */
export const RECOVERY = /sauna|meditation|bath|massage|steam|red light|other recovery|stretching|breathwork/i

const pct = (x: number | null | undefined) => (x == null ? null : Math.round(x))

export function whoopSummary(today: string) {
  const cycles = readRecords<WhoopCycle>('whoop', 'cycle').filter(c => c.day && c.day <= today)
  const sleeps = readRecords<WhoopSleep>('whoop', 'sleep').filter(s => s.day && s.day <= today)
  const workouts = readRecords<WhoopWorkout>('whoop', 'workout').filter(w => w.day && w.day <= today)
  if (!cycles.length) return null

  const sleepByDay = new Map(sleeps.map(s => [s.day!, s.data]))
  const cycleByDay = new Map(cycles.map(c => [c.day!, c.data]))
  const days: WhoopDay[] = cycles.map(c => {
    const s = sleepByDay.get(c.day!)
    return { day: c.day!, rec: c.data.recovery, hrv: c.data.hrv, rhr: c.data.rhr, resp: s?.respRate ?? null, sl: s?.asleepMin ?? null, st: c.data.strain }
  })

  // "Today" is the latest cycle with a recovery score (the morning's numbers).
  const latestIdx = days.findLastIndex(d => d.rec !== null)
  if (latestIdx < 0) return null
  const latest = days[latestIdx], latestCycle = cycleByDay.get(latest.day)!, latestSleep = sleepByDay.get(latest.day)
  const prior = days.filter(d => d.day < latest.day && d.day >= addDays(latest.day, -30))
  const last30 = days.filter(d => d.day > addDays(latest.day, -30) && d.day <= latest.day)
  const sleeps30 = sleeps.filter(s => s.day! > addDays(latest.day, -30) && s.day! <= latest.day).map(s => s.data)
  const cycles30 = cycles.filter(c => c.day! > addDays(latest.day, -30) && c.day! <= latest.day).map(c => c.data)
  const strainDays = days.filter(d => d.st !== null)
  const yesterday = strainDays.filter(d => d.day < latest.day).at(-1) ?? null

  const mix = (n: number) => {
    const ds = days.filter(d => d.rec !== null && d.day > addDays(latest.day, -n))
    return { g: ds.filter(d => d.rec! >= 67).length, y: ds.filter(d => d.rec! >= 34 && d.rec! < 67).length, r: ds.filter(d => d.rec! < 34).length, avg: Math.round(avg(ds.map(d => d.rec)) ?? 0) }
  }

  const hrvMonths: { l: string; v: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const anchor = new Date(Date.parse(`${latest.day.slice(0, 7)}-15T12:00:00Z`))
    anchor.setUTCMonth(anchor.getUTCMonth() - i)
    const ym = anchor.toISOString().slice(0, 7)
    const v = avg(days.filter(d => d.day.startsWith(ym)).map(d => d.hrv))
    if (v !== null) hrvMonths.push({ l: monthName(`${ym}-15`), v: Math.round(v) })
  }

  // Recovery sessions (sauna, meditation, ...) are logged as WHOOP activities but aren't training.
  const recentWorkouts = workouts.filter(w => w.day! > addDays(latest.day, -30) && !RECOVERY.test(w.data.name)).map(w => w.data)
  const byName = new Map<string, WhoopWorkout[]>()
  for (const w of recentWorkouts) byName.set(w.name, [...(byName.get(w.name) ?? []), w])
  const zoneRows = [...byName].map(([name, ws]) => ({
    k: name, n: ws.length,
    min: ws.reduce((a, w) => a + (w.durationMin ?? 0), 0),
    strain: r1(avg(ws.map(w => w.strain))),
    hr: Math.round(avg(ws.map(w => w.avgHr)) ?? 0),
    zoneMin: [0, 1, 2, 3, 4].map(z => Math.round(ws.reduce((a, w) => a + (w.durationMin ?? 0) * ((w.zonePct[z] ?? 0) / 100), 0))),
  })).sort((a, b) => b.min - a.min)

  return {
    latest: {
      day: latest.day, rec: latest.rec, hrv: latest.hrv, rhr: latest.rhr,
      resp: latestSleep?.respRate ?? null, spo2: latestCycle.spo2, skinTemp: latestCycle.skinTempC,
      sleepMin: latestSleep?.asleepMin ?? null, needMin: latestSleep?.needMin ?? null, debtMin: latestSleep?.debtMin ?? null,
      // Whole percents: WHOOP's API sends e.g. 94.95719.
      performance: pct(latestSleep?.performance), efficiency: pct(latestSleep?.efficiency), consistency: pct(latestSleep?.consistency),
      deep: latestSleep?.deepMin ?? null, rem: latestSleep?.remMin ?? null, light: latestSleep?.lightMin ?? null, awake: latestSleep?.awakeMin ?? null,
      woke: latestSleep ? localTime(latestSleep.wake) : null, asleepAt: latestSleep ? localTime(latestSleep.onset) : null,
      respMax30: Math.max(...last30.map(d => d.resp ?? 0)),
      strainToday: r1(latest.st), // WHOOP's day strain so far (the cycle runs until the next sleep)
      strainYesterday: yesterday ? { day: yesterday.day, v: yesterday.st } : null,
      // WHOOP's earlier score when it revised today's recovery (shown so a past reading isn't a mystery).
      revisedFrom: latestCycle.rescores?.at(-1) ?? null,
    },
    avg30: {
      rec: r1(avg(prior.map(d => d.rec))), hrv: r1(avg(prior.map(d => d.hrv))), rhr: r1(avg(prior.map(d => d.rhr))), resp: r1(avg(prior.map(d => d.resp))),
      sl: Math.round(avg(last30.map(d => d.sl)) ?? 0), st: r1(avg(last30.map(d => d.st))),
      spo2: r1(avg(cycles30.map(c => c.spo2))), skinTemp: r1(avg(cycles30.map(c => c.skinTempC))),
      deep: Math.round(avg(sleeps30.map(s => s.deepMin)) ?? 0), rem: Math.round(avg(sleeps30.map(s => s.remMin)) ?? 0), light: Math.round(avg(sleeps30.map(s => s.lightMin)) ?? 0),
      efficiency: Math.round(avg(sleeps30.map(s => s.efficiency)) ?? 0), consistency: Math.round(avg(sleeps30.map(s => s.consistency)) ?? 0),
      performance: Math.round(avg(sleeps30.map(s => s.performance)) ?? 0),
      hrvMin: Math.min(...last30.filter(d => d.hrv !== null).map(d => d.hrv!)), hrvMax: Math.max(...last30.filter(d => d.hrv !== null).map(d => d.hrv!)),
    },
    load7: r1(avg(strainDays.filter(d => d.day > addDays(latest.day, -7) && d.day <= latest.day).map(d => d.st))),
    load30: r1(avg(strainDays.filter(d => d.day > addDays(latest.day, -30) && d.day <= latest.day).map(d => d.st))),
    days30: last30.map(d => ({ ...d, l: short(d.day) })),
    recMix: [['Last 30 days', mix(30)], ['Last 90 days', mix(90)], ['Last 12 months', mix(365)]] as const,
    hrvMonths, zoneRows,
    bedtimes14: sleeps.filter(s => s.day! > addDays(latest.day, -14)).map(s => localTime(s.data.onset)),
  }
}
