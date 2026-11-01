// Measurable roadmap targets ("VO₂ max 50 by 1 Jun 2027"): the metrics a main goal or a checkpoint can aim at,
// where each one's current value comes from, and the values the athlete types in himself when no data has one yet
// (plan/reading, id "metric|of|day"; e.g. a VO₂ max from a watch when no lab test is uploaded). Typed values are his
// own data, labelled "you entered" wherever they show; nothing here estimates a value.
import { readRecords, upsertRecords } from './db.ts'
import { diffDays, medium } from './dashboard/time.ts'
import type { DexaScan, LabResult, LiftSet, NutritionDay, StravaActivity, Vo2Test, WhoopCycle } from './model.ts'

type Def = { label: string; unit: string; up: boolean | null; time?: boolean; of?: 'exercise' | 'marker'; effort?: string; hint: string }
export const METRICS = {
  vo2max: { label: 'VO₂ max', unit: 'ml/kg/min', up: true, hint: 'lab VO₂ tests' },
  weight: { label: 'Weight', unit: 'lb', up: null, hint: 'MacroFactor and DEXA' },
  body_fat: { label: 'Body fat', unit: '%', up: false, hint: 'DEXA and MacroFactor' },
  lean_mass: { label: 'Lean mass', unit: 'lb', up: true, hint: 'DEXA scans' },
  rhr: { label: 'Resting heart rate', unit: 'bpm', up: false, hint: 'WHOOP, 7-day average' },
  hrv: { label: 'HRV', unit: 'ms', up: true, hint: 'WHOOP, 7-day average' },
  run_5k: { label: '5K time', unit: '', up: false, time: true, effort: '5K', hint: 'Strava best efforts' },
  run_10k: { label: '10K time', unit: '', up: false, time: true, effort: '10K', hint: 'Strava best efforts' },
  run_half: { label: 'Half marathon time', unit: '', up: false, time: true, effort: 'Half-Marathon', hint: 'Strava best efforts' },
  lift: { label: 'Heaviest lift', unit: 'lb', up: true, of: 'exercise', hint: 'FitnessAI sets' },
  lab: { label: 'Lab marker', unit: '', up: null, of: 'marker', hint: 'lab results' },
} satisfies Record<string, Def>
export type MetricId = keyof typeof METRICS
export const def = (m: MetricId): Def => METRICS[m]
export const isMetric = (m: unknown): m is MetricId => typeof m === 'string' && Object.hasOwn(METRICS, m)

export type Target = { metric: MetricId; of?: string | null; value: number; start?: { value: number; day: string } | null }
export type Reading = { value: number; day: string; source: string }
type Manual = { metric: MetricId; of: string | null; value: number }

const same = (a: string | null | undefined, b: string | null | undefined) => (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase()
const latest = (xs: Reading[]) => xs.sort((a, b) => a.day.localeCompare(b.day)).at(-1) ?? null

/** Every reading of a metric up to `today`, from the data and from what he entered. */
function readings(metric: MetricId, of: string | null | undefined, today: string): Reading[] {
  const out: Reading[] = readRecords<Manual>('plan', 'reading').filter(r => r.data.metric === metric && same(r.data.of, of) && r.day)
    .map(r => ({ value: r.data.value, day: r.day!, source: 'you entered' }))
  const add = (day: string | null, value: number | null | undefined, source: string) => { if (day && value != null && Number.isFinite(value)) out.push({ value, day, source }) }
  const d = def(metric)
  if (metric === 'vo2max') for (const r of readRecords<Vo2Test>('vo2', 'test')) add(r.day, r.data.vo2max, 'VO₂ test')
  if (metric === 'weight' || metric === 'body_fat' || metric === 'lean_mass') {
    for (const r of readRecords<DexaScan>('dexa', 'scan')) add(r.day, metric === 'weight' ? r.data.totalLb : metric === 'body_fat' ? r.data.bodyFatPct : r.data.leanLb, 'DEXA scan')
    if (metric !== 'lean_mass') for (const r of readRecords<NutritionDay>('macrofactor', 'day')) add(r.day, metric === 'weight' ? r.data.weightLb : r.data.bodyFatPct, 'MacroFactor')
  }
  if (metric === 'rhr' || metric === 'hrv') {
    // A 7-day average, so one odd night doesn't move the goal: one reading, dated the newest day in the window.
    const xs = readRecords<WhoopCycle>('whoop', 'cycle').filter(c => c.day && c.day <= today && c.data[metric] != null)
    const last = xs.at(-1)
    if (last) { const win = xs.filter(c => diffDays(last.day!, c.day!) < 7); add(last.day, win.reduce((a, c) => a + c.data[metric]!, 0) / win.length, 'WHOOP 7-day average') }
  }
  if (d.effort) for (const r of readRecords<StravaActivity>('strava', 'activity'))
    for (const e of r.data.bestEfforts ?? []) if (e.name === d.effort && e.elapsedS > 0) add(r.day, e.elapsedS, `Strava (${r.data.name})`)
  if (metric === 'lift') for (const r of readRecords<LiftSet>('fitnessai', 'set')) if (same(r.data.exercise, of) && r.data.reps > 0) add(r.day, r.data.weightLb, 'FitnessAI')
  if (metric === 'lab') for (const r of readRecords<LabResult>('labs', 'result')) if (same(r.data.marker, of)) add(r.day, r.data.value, 'lab result')
  return out.filter(r => r.day <= today)
}

/** Where he stands now: the best ever for times and lifts (a PR is what counts), else the newest reading. */
export function current(metric: MetricId, of: string | null | undefined, today: string): Reading | null {
  const xs = readings(metric, of, today)
  if (def(metric).time) return xs.sort((a, b) => a.value - b.value || b.day.localeCompare(a.day))[0] ?? null
  if (metric === 'lift') return xs.sort((a, b) => b.value - a.value || b.day.localeCompare(a.day))[0] ?? null
  return latest(xs)
}

export function unitOf(metric: MetricId, of: string | null | undefined) {
  if (metric !== 'lab') return def(metric).unit
  return readRecords<LabResult>('labs', 'result').filter(r => same(r.data.marker, of)).at(-1)?.data.unit ?? ''
}

const clock = (s: number) => { const r = Math.round(s), h = Math.floor(r / 3600), m = Math.floor((r % 3600) / 60), x = r % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}` }
const num = (v: number) => String(Math.round(v * 10) / 10)
export function fmtValue(metric: MetricId, v: number, unit = def(metric).unit) { return def(metric).time ? clock(v) : num(v) + (unit ? (unit === '%' ? '%' : ' ' + unit) : '') }
export const targetName = (t: { metric: MetricId; of?: string | null }) => (def(t.metric).of && t.of ? t.of.trim() : def(t.metric).label)

/** A target's progress, display-ready. `deadline` = the goal's or checkpoint's date (null when it has none). */
export function targetStatus(t: Target, deadline: string | null, today: string) {
  const d = def(t.metric), unit = unitOf(t.metric, t.of), cur = current(t.metric, t.of, today), start = t.start ?? null
  const f = (v: number) => fmtValue(t.metric, v, unit)
  const base = start?.value ?? cur?.value
  const up = base != null && base !== t.value ? t.value > base : d.up ?? true
  const reached = !!cur && (up ? cur.value >= t.value : cur.value <= t.value)
  const daysLeft = deadline ? diffDays(deadline, today) : null
  const pct = start && cur && start.value !== t.value ? Math.max(0, Math.min(100, Math.round(((cur.value - start.value) / (t.value - start.value)) * 100))) : reached ? 100 : null
  // On pace: compared with a straight line from the start to the target on the deadline, at the newest reading's date.
  let pace: 'reached' | 'on_pace' | 'behind' | 'no_data' | 'unknown' = reached ? 'reached' : !cur ? 'no_data' : 'unknown'
  if (!reached && cur && start && deadline && cur.day > start.day && deadline > start.day) {
    const want = start.value + (t.value - start.value) * Math.min(1, diffDays(cur.day, start.day) / diffDays(deadline, start.day))
    pace = (up ? cur.value >= want : cur.value <= want) ? 'on_pace' : 'behind'
  }
  const months = daysLeft != null && daysLeft > 0 ? daysLeft / 30.44 : null
  const gap = cur ? t.value - cur.value : null
  const need = !reached && gap != null && months ? (d.time ? `${clock(Math.abs(gap) / months)} faster a month` : `${gap > 0 ? '+' : '−'}${num(Math.abs(gap) / months)}${unit && unit !== '%' ? ' ' + unit : unit} a month`) : null
  const name = targetName(t)
  return {
    metric: t.metric, of: t.of ?? null, label: name, unit, up, value: t.value, valueL: f(t.value), sym: d.time ? '' : up ? '≥' : '≤',
    current: cur ? { ...cur, valueL: f(cur.value), dayL: medium(cur.day), ageDays: diffDays(today, cur.day) } : null,
    start: start ? { ...start, valueL: f(start.value), dayL: medium(start.day) } : null,
    pct, pace, need, reached, daysLeft, testOnly: t.metric === 'vo2max' || t.metric === 'lab' || t.metric === 'lean_mass',
    sentence: `${name} ${d.time ? 'of ' + f(t.value) + ' or faster' : (up ? 'of at least ' : 'of at most ') + f(t.value)}` + (deadline ? ` by ${deadline}${daysLeft != null ? ` (${daysLeft} days)` : ''}` : '') + '. ' +
      (cur ? `Now ${f(cur.value)} (${cur.source}, ${cur.day})` : 'No current value yet') + (start ? `; started at ${f(start.value)} on ${start.day}` : '') + '. ' +
      (reached ? 'Target reached.' : (pace === 'on_pace' ? 'On pace. ' : pace === 'behind' ? 'Behind pace. ' : '') + (need ? `Needs ${need}.` : '')),
  }
}
export type TargetStatus = ReturnType<typeof targetStatus>

/** For the planner: the current value of every metric without a subject, plus his exercises and lab markers. */
export function targetChoices(today: string) {
  const plain = (Object.keys(METRICS) as MetricId[]).filter(m => !def(m).of)
  const cur = Object.fromEntries(plain.map(m => { const r = current(m, null, today); return [m, r ? { ...r, valueL: fmtValue(m, r.value) } : null] }))
  const names = (xs: string[]) => [...new Set(xs.map(x => x.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)).slice(0, 300)
  return {
    metrics: (Object.keys(METRICS) as MetricId[]).map(m => ({ id: m, label: def(m).label, unit: def(m).unit, time: !!def(m).time, of: def(m).of ?? null, up: def(m).up, hint: def(m).hint })),
    current: cur,
    exercises: names(readRecords<LiftSet>('fitnessai', 'set').map(r => r.data.exercise)),
    markers: names(readRecords<LabResult>('labs', 'result').filter(r => r.data.value != null).map(r => r.data.marker)),
  }
}

/** A value he entered himself (one per metric, subject and day; a second entry the same day replaces it). */
export function saveReading(metric: MetricId, of: string | null, value: number, day: string) {
  upsertRecords([{ source: 'plan', kind: 'reading', id: `${metric}|${(of ?? '').trim().toLowerCase()}|${day}`, day, data: { metric, of: of?.trim() || null, value } }])
}

/** A target from the planner or a file, checked and cleaned: a known metric, a positive value (times as "24:30"), and
 *  the exercise or lab marker for the metrics that need one. Throws a message for the athlete when something's off. */
export function cleanTarget(t: unknown, who: string): Target {
  const x = t as { metric?: unknown; of?: unknown; value?: unknown; start?: { value?: unknown; day?: unknown } } | null
  if (!x || typeof x !== 'object' || !isMetric(x.metric)) throw new Error(`${who}: pick what to measure.`)
  const value = parseValue(x.metric, x.value)
  if (value == null) throw new Error(`${who}: the target value doesn't read as a number${def(x.metric).time ? ' or a time like 24:30' : ''}.`)
  const needsOf = !!def(x.metric).of
  if (needsOf && (typeof x.of !== 'string' || !x.of.trim() || x.of.length > 80)) throw new Error(`${who}: say which ${x.metric === 'lift' ? 'exercise' : 'lab marker'}.`)
  const sd = x.start?.day, sv = x.start?.value
  const start = typeof sv === 'number' && sv > 0 && typeof sd === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(sd) ? { value: sv, day: sd } : null
  return { metric: x.metric, ...(needsOf ? { of: (x.of as string).trim() } : {}), value, start }
}

/** "45", "45.5", "24:30", "1:52:10" -> a number (seconds for times); null when it doesn't read. */
export function parseValue(metric: MetricId, s: unknown): number | null {
  if (typeof s === 'number') return Number.isFinite(s) && s > 0 ? s : null
  if (typeof s !== 'string') return null
  const t = s.trim()
  if (def(metric).time) {
    const m = /^(?:(\d+):)?(\d{1,2}):(\d{2})$/.exec(t)
    return m ? (+(m[1] ?? 0)) * 3600 + +m[2] * 60 + +m[3] || null : null
  }
  const n = Number(t.replace(',', '.'))
  return Number.isFinite(n) && n > 0 && n < 100000 ? n : null
}
