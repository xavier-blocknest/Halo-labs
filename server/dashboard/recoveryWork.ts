// Recovery work (sauna, red light, massage, …) from WHOOP activities: how often, how long, and whether next-day
// recovery differs on days with a session once day strain is accounted for. WHOOP's API sends these activities
// without a score, so heart rate is reported only when a session actually has one.
import { readRecords } from '../db.ts'
import type { WhoopCycle, WhoopWorkout } from '../model.ts'
import { addDays, diffDays, short, weekStart } from './time.ts'
import { RECOVERY } from './whoop.ts'

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const r1 = (x: number) => Math.round(x * 10) / 10

/** Strain-matched comparison needs at least this many session days with a matching no-session day. */
// WHOOP's catch-all "Other Recovery" is left off the list (owner's request, Oct 30); it still isn't counted as training.
const HIDDEN = /^other recovery$/i
const MIN_MATCHED = 15, MIN_PER_BIN = 3, WEEKS = 12

export function recoveryWork(today: string) {
  const sessions = readRecords<WhoopWorkout>('whoop', 'workout')
    .filter(w => w.day && w.day <= today && RECOVERY.test(w.data.name) && !HIDDEN.test(w.data.name)).map(w => ({ day: w.day!, ...w.data }))
  if (!sessions.length) return null

  const byName = new Map<string, typeof sessions>()
  for (const s of sessions) byName.set(s.name, [...(byName.get(s.name) ?? []), s])
  const since = (n: number) => addDays(today, -(n - 1))

  // Next-day recovery and HRV keyed by the day before (a session on day d shows up in the d+1 morning numbers).
  const cycles = readRecords<WhoopCycle>('whoop', 'cycle').filter(c => c.day && c.day <= today)
  const cyc = new Map(cycles.map(c => [c.day!, c.data]))
  const pairs = cycles.flatMap(c => {
    const next = cyc.get(addDays(c.day!, 1))
    return c.data.strain != null && next?.recovery != null ? [{ day: c.day!, st: c.data.strain, rec: next.recovery, hrv: next.hrv }] : []
  })

  const effect = (name: string, list: typeof sessions) => {
    const days = new Set(list.map(s => s.day)), first = list.reduce((a, s) => (s.day < a ? s.day : a), today)
    const bins = new Map<number, { w: typeof pairs; wo: typeof pairs }>()
    for (const p of pairs.filter(p => p.day >= first)) {
      const k = Math.min(6, Math.floor(p.st / 3)), b = bins.get(k) ?? { w: [], wo: [] }
      ;(days.has(p.day) ? b.w : b.wo).push(p); bins.set(k, b)
    }
    let n = 0, dRec = 0, dHrv = 0, nHrv = 0, wRec = 0, woRec = 0
    for (const { w, wo } of bins.values()) {
      if (w.length < MIN_PER_BIN || wo.length < MIN_PER_BIN) continue
      const wr = avg(w.map(p => p.rec))!, wor = avg(wo.map(p => p.rec))!
      n += w.length; dRec += (wr - wor) * w.length; wRec += wr * w.length; woRec += wor * w.length
      const wh = avg(w.flatMap(p => (p.hrv == null ? [] : [p.hrv]))), woh = avg(wo.flatMap(p => (p.hrv == null ? [] : [p.hrv])))
      if (wh !== null && woh !== null) { dHrv += (wh - woh) * w.length; nHrv += w.length }
    }
    if (n < MIN_MATCHED) return { name, ready: false as const, have: n, need: MIN_MATCHED }
    return { name, ready: true as const, n, since: first, rec: r1(dRec / n), recWith: Math.round(wRec / n), recWithout: Math.round(woRec / n), hrv: nHrv ? Math.round(dHrv / nHrv) : null }
  }

  const types = [...byName].map(([name, list]) => {
    const hr = list.filter(s => s.avgHr != null)
    const last = list.reduce((a, s) => (s.day > a ? s.day : a), '')
    return {
      name, total: list.length, first: list.reduce((a, s) => (s.day < a ? s.day : a), today), last, lastL: short(last), ago: diffDays(today, last),
      n7: list.filter(s => s.day >= since(7)).length, n30: list.filter(s => s.day >= since(30)).length, n90: list.filter(s => s.day >= since(90)).length,
      min30: Math.round(list.filter(s => s.day >= since(30)).reduce((a, s) => a + (s.durationMin ?? 0), 0)),
      avgMin: Math.round(avg(list.map(s => s.durationMin ?? 0)) ?? 0),
      thisWeek: list.filter(s => s.day >= weekStart(today)).length,
      hr: hr.length ? { avg: Math.round(avg(hr.map(s => s.avgHr!))!), max: Math.max(...hr.map(s => s.maxHr ?? 0)), n: hr.length } : null,
    }
  }).filter(t => t.ago <= 180).sort((a, b) => b.n90 - a.n90 || b.total - a.total)

  const wk0 = weekStart(today)
  const weeks = Array.from({ length: WEEKS }, (_, i) => {
    const start = addDays(wk0, -7 * (WEEKS - 1 - i)), end = addDays(start, 6)
    const inWeek = sessions.filter(s => s.day >= start && s.day <= end)
    return { start, l: short(start), counts: Object.fromEntries(types.map(t => [t.name, inWeek.filter(s => s.name === t.name).length])) }
  })

  return {
    types, weeks, weekStart: wk0,
    effects: types.filter(t => t.n90 > 0).map(t => effect(t.name, byName.get(t.name)!)),
    hrMissing: sessions.some(s => s.avgHr == null),
    recent: sessions.filter(s => s.day >= since(7)).sort((a, b) => (a.day < b.day ? 1 : -1)).map(s => ({ day: s.day, l: short(s.day), name: s.name, min: s.durationMin, hr: s.avgHr })),
  }
}
