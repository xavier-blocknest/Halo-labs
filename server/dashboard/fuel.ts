// Fuel page: MacroFactor weight, logging, steps, targets and macros.
import { readRecords } from '../db.ts'
import type { NutritionDay, NutritionTarget } from '../model.ts'
import { addDays, short } from './time.ts'

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function fuelSummary(today: string) {
  const days = readRecords<NutritionDay>('macrofactor', 'day').filter(d => d.day && d.day <= today).map(d => ({ day: d.day!, ...d.data }))
  if (!days.length) return null
  const targets = readRecords<NutritionTarget>('macrofactor', 'target').map(t => t.data)
  const from30 = addDays(today, -29)
  const last30 = Array.from({ length: 30 }, (_, i) => { const day = addDays(from30, i); return days.find(d => d.day === day) ?? { day } as Partial<NutritionDay> & { day: string } })
  const logged = (d: Partial<NutritionDay>) => (d.kcal ?? 0) > 0
  const loggedDays = days.filter(logged)

  // Current target: the newest one for today's weekday effective on or before today (a program update from the full
  // export, or a day's own targets from a Quick Export).
  const wd = WEEKDAYS[(new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7]
  const forWd = targets.filter(t => t.weekday === wd && t.effective <= today).sort((a, b) => a.effective.localeCompare(b.effective))
  const target = forWd.at(-1) ?? null
  // "Since": the start of the unbroken run of identical targets (Quick Exports repeat the same target every day).
  const same = (t: NutritionTarget) => t.kcal === target?.kcal && t.proteinG === target?.proteinG && t.carbsG === target?.carbsG && t.fatG === target?.fatG
  let since = forWd.length - 1
  while (since > 0 && same(forWd[since - 1])) since--
  const effective = target ? forWd[since].effective : null

  // Longest run of consecutive logged days.
  let best = { len: 0, start: '', end: '', protein: 0, kcal: 0 }, run: typeof loggedDays = []
  for (const d of loggedDays) {
    if (run.length && addDays(run.at(-1)!.day, 1) !== d.day) run = []
    run.push(d)
    if (run.length > best.len) best = { len: run.length, start: run[0].day, end: d.day, protein: Math.round(avg(run.map(x => x.proteinG ?? 0)) ?? 0), kcal: Math.round(avg(run.map(x => x.kcal ?? 0)) ?? 0) }
  }

  const trend = days.filter(d => d.trendLb !== null && d.trendLb !== undefined)
  const weighIns = days.filter(d => d.weightLb)
  const recentLogged = loggedDays.slice(-7)
  const steps30 = last30.filter(d => d.steps).map(d => d.steps!)
  const peakSteps = last30.reduce<(typeof last30)[number] | null>((m, d) => ((d.steps ?? 0) > (m?.steps ?? 0) ? d : m), null)

  return {
    days30: last30.map(d => ({ day: d.day, l: short(d.day), w: d.weightLb ?? null, bf: d.bodyFatPct ?? null, steps: d.steps ?? null, cal: d.kcal ?? null })),
    trend: trend.length ? { now: trend.at(-1)!.trendLb!, ago30: trend.find(d => d.day >= from30)?.trendLb ?? null } : null,
    lastWeighIn: weighIns.length ? { lb: weighIns.at(-1)!.weightLb!, day: weighIns.at(-1)!.day } : null,
    weighIns30: last30.filter(d => d.weightLb).length,
    logged30: last30.filter(logged).map(d => d.day),
    loggedYear: loggedDays.filter(d => d.day.startsWith(today.slice(0, 4))).length,
    steps30: steps30.length ? Math.round(avg(steps30)!) : null,
    peakSteps: peakSteps?.steps ? { n: peakSteps.steps, day: peakSteps.day } : null,
    target, targetSince: effective ?? null,
    bestStreak: best.len ? best : null,
    recent: recentLogged.reverse().map(d => ({ day: d.day, d: short(d.day), kcal: d.kcal ?? 0, protein: d.proteinG ?? 0, carbs: d.carbsG ?? 0, fat: d.fatG ?? 0, fiber: d.fiberG ?? null, satFat: d.satFatG ?? null, chol: d.cholesterolMg ?? null })),
    lastLogged: loggedDays.at(-1)?.day ?? null,
  }
}
