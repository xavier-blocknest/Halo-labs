// Sample data ("Explore with sample data" on first run). Runs as its own process with its own throwaway database
// and key in a temporary folder, fills it with a made-up athlete's year, and prints the dashboard JSON for today.
// The real database is never opened here, so sample records can't mix with real ones.
//   node server/sample.ts            (the server runs this and caches the result; see /api/sample/dashboard)
// Everything is generated relative to today, deterministic per day (same day → same numbers).
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadKey } from './crypto.ts'
import { openDb, upsertRecords, type RecordRow } from './db.ts'
import type { CalendarEvent, DexaScan, LabDraw, LabResult, LiftSet, LiftWorkout, NutritionDay, NutritionTarget, StravaActivity, StravaGear, Vo2Test, WhoopBody, WhoopCycle, WhoopSleep, WhoopWorkout } from './model.ts'
import { TZ, dayOf, isoSec } from './model.ts'

console.log = (...a: unknown[]) => console.error(...a) // stdout carries only the JSON
const dir = mkdtempSync(join(tmpdir(), 'halolabs-sample-'))
process.on('exit', () => rmSync(dir, { recursive: true, force: true }))
loadKey(join(dir, '.env'), join(dir, 'sample.db'))
openDb(join(dir, 'sample.db'))

// ---- helpers ------------------------------------------------------------------------------------------------

const today = dayOf(new Date().toISOString())
let seed = [...today].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32 }
const between = (a: number, b: number) => a + (b - a) * rnd()
const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)]
const round = (x: number, dp = 0) => Math.round(x * 10 ** dp) / 10 ** dp
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x))
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10)
const weekday = (day: string) => (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7 // Mon = 0

/** UTC offset of TZ at an instant, as minutes and "+HH:MM". */
function offsetAt(ms: number) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .formatToParts(new Date(ms)).map(x => [x.type, x.value]))
  const mins = Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - ms) / 60_000)
  const s = mins < 0 ? '-' : '+', a = Math.abs(mins)
  return { mins, tz: `${s}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}` }
}
/** The UTC instant at local `hours` (may be fractional or negative) on `day` in TZ. */
function at(day: string, hours: number) {
  const guess = Date.parse(`${day}T00:00:00Z`) + hours * 3600e3
  const ms = guess - offsetAt(guess).mins * 60_000
  return { iso: isoSec(new Date(ms).toISOString()), ms, tz: offsetAt(ms).tz }
}
const plusMin = (iso: string, min: number) => isoSec(new Date(Date.parse(iso) + min * 60_000).toISOString())

const rows: RecordRow[] = []
const put = (r: RecordRow) => rows.push(r)
const DAYS = 365
const start = addDays(today, -DAYS + 1)

// ---- training week template (what the athlete actually did) ---------------------------------------------------

type Plan = { sport: 'run' | 'swim' | 'ride' | 'lift' | 'none'; kind?: string; hour: number }
function planFor(day: string, i: number): Plan[] {
  const wd = weekday(day), build = i / DAYS // fitness builds through the year
  if (rnd() < 0.07) return [] // missed day / life happens
  switch (wd) {
    case 0: return [{ sport: 'lift', kind: 'upper', hour: 6.5 }]
    case 1: return [{ sport: 'run', kind: 'easy', hour: 6.25 }]
    case 2: return [{ sport: 'swim', hour: 12.25 }, ...(build > 0.4 ? [{ sport: 'lift' as const, kind: 'lower', hour: 18 }] : [])]
    case 3: return [{ sport: 'run', kind: build > 0.3 ? 'tempo' : 'easy', hour: 6.25 }]
    case 4: return [{ sport: 'lift', kind: 'lower', hour: 6.5 }]
    case 5: return [{ sport: 'run', kind: 'long', hour: 7.5 }]
    default: return build > 0.25 ? [{ sport: 'ride', hour: 8 }] : []
  }
}

// ---- WHOOP: cycles, sleep, workouts ---------------------------------------------------------------------------

let fitness = 0 // slow-moving baseline, improves through the year
let strainYesterday = 10
const workouts: { day: string; sport: Plan['sport']; kind?: string; start: string; end: string; tz: string; min: number; strain: number; avgHr: number; maxHr: number; kcal: number }[] = []

for (let i = 0; i < DAYS; i++) {
  const day = addDays(start, i)
  fitness = i / DAYS
  const plan = planFor(day, i)

  // sleep: onset the evening before
  const onset = at(addDays(day, -1), between(22.2, 23.6))
  const inBed = between(400, 500) + (weekday(day) >= 5 ? 35 : 0)
  const awake = between(20, 55), asleep = inBed - awake
  const deep = asleep * between(0.17, 0.23), rem = asleep * between(0.2, 0.27), light = asleep - deep - rem
  const need = 470 + strainYesterday * 3
  const performance = clamp(round(asleep / need * 100), 55, 100)
  const wake = plusMin(onset.iso, inBed)
  const cycleStart = onset.iso

  // recovery follows sleep and yesterday's strain, plus noise; HRV/RHR follow recovery and fitness
  const recovery = clamp(round(42 + (performance - 75) * 0.9 - (strainYesterday - 11) * 2.2 + fitness * 8 + between(-14, 14)), 8, 99)
  const hrv = round(52 + fitness * 14 + (recovery - 60) * 0.32 + between(-5, 5))
  const rhr = round(57 - fitness * 5 - (recovery - 60) * 0.06 + between(-1.5, 1.5))

  // workouts
  let dayStrain = between(4, 7)
  let dayKcal = between(2050, 2300)
  for (const p of plan) {
    if (p.sport === 'none') continue
    const len = p.sport === 'run' ? (p.kind === 'long' ? 55 + fitness * 50 : p.kind === 'tempo' ? 42 : 36) : p.sport === 'swim' ? 40 : p.sport === 'ride' ? 70 + fitness * 50 : 58
    const min = round(len * between(0.9, 1.1))
    const s = at(day, p.hour + between(-0.2, 0.25))
    const e = plusMin(s.iso, min)
    const intensity = p.kind === 'tempo' ? 0.82 : p.kind === 'long' ? 0.72 : p.sport === 'lift' ? 0.62 : p.sport === 'swim' ? 0.7 : 0.68
    const avgHr = round(188 * intensity - fitness * 4 + between(-4, 4)), maxHr = round(avgHr + between(14, 26))
    const strain = round(clamp(min / 60 * 9 * intensity + between(-1, 1.5), 4, 18), 1)
    const kcal = round(min * (p.sport === 'lift' ? 6.5 : 10.5) * between(0.9, 1.1))
    dayStrain = Math.min(20.5, dayStrain + strain * 0.55); dayKcal += kcal
    workouts.push({ day, sport: p.sport, kind: p.kind, start: s.iso, end: e, tz: s.tz, min, strain, avgHr, maxHr, kcal })
    const z = p.kind === 'tempo' ? [5, 12, 28, 45, 10] : p.sport === 'lift' ? [38, 34, 20, 7, 1] : [8, 52, 32, 7, 1]
    put({ source: 'whoop', kind: 'workout', id: s.iso, day, data: {
      start: s.iso, end: e, tz: s.tz, name: p.sport === 'run' ? 'Running' : p.sport === 'swim' ? 'Swimming' : p.sport === 'ride' ? 'Cycling' : 'Weightlifting',
      durationMin: min, strain, kcal, maxHr, avgHr, zonePct: z.map(x => round(x * between(0.85, 1.15))), distanceM: p.sport === 'ride' ? round(min / 60 * between(15.5, 18.5) * 1609.344) : null,
    } satisfies WhoopWorkout })
  }
  // recovery work: sauna twice a week in the second half of the year
  if (i > DAYS / 2 && (weekday(day) === 1 || weekday(day) === 4)) {
    const s = at(day, 19.5)
    put({ source: 'whoop', kind: 'workout', id: s.iso, day, data: { start: s.iso, end: plusMin(s.iso, 20), tz: s.tz, name: 'Sauna', durationMin: 20, strain: null, kcal: null, maxHr: null, avgHr: null, zonePct: [], distanceM: null } satisfies WhoopWorkout })
  }

  const isToday = day === today
  put({ source: 'whoop', kind: 'cycle', id: cycleStart, day, data: {
    start: cycleStart, end: isToday ? null : at(day, 22.8).iso, tz: onset.tz,
    recovery, rhr, hrv, skinTempC: round(33.4 + between(-0.4, 0.4), 1), spo2: round(between(95.5, 98), 1),
    strain: round(dayStrain, 1), kcal: round(dayKcal), maxHr: round(150 + dayStrain * 2), avgHr: round(64 + dayStrain),
  } satisfies WhoopCycle })
  put({ source: 'whoop', kind: 'sleep', id: onset.iso, day, data: {
    onset: onset.iso, wake, tz: onset.tz, cycleStart, performance, respRate: round(14.6 + between(-0.4, 0.5), 1),
    asleepMin: round(asleep), inBedMin: round(inBed), lightMin: round(light), deepMin: round(deep), remMin: round(rem), awakeMin: round(awake),
    needMin: round(need), debtMin: round(Math.max(0, need - asleep) * 0.4), efficiency: round(asleep / inBed * 100), consistency: round(between(68, 90)),
  } satisfies WhoopSleep })
  strainYesterday = dayStrain
}
put({ source: 'whoop', kind: 'body', id: 'current', day: null, data: { heightM: 1.8, weightKg: 79.5, maxHr: 191 } satisfies WhoopBody })

// ---- Strava: runs and swims (rides are WHOOP's), gear ----------------------------------------------------------

let stravaId = 9_000_000_000
const SAMPLE_EFFORTS: [string, number, number][] = [['400m', 400, 0.86], ['1/2 mile', 804.672, 0.9], ['1K', 1000, 0.92], ['1 mile', 1609.344, 0.94], ['2 mile', 3218.688, 0.97], ['5K', 5000, 0.98], ['10K', 10000, 1], ['Half-Marathon', 21097.5, 1.02]]
const RUN_NAMES: Record<string, string[]> = { easy: ['Easy Zone 2 run', 'Morning shakeout', 'Recovery run'], tempo: ['Tempo intervals', 'Threshold run', '3 × 1 mi at tempo'], long: ['Long run', 'Sunday long run', 'Long, slow and steady'] }
for (const w of workouts.filter(x => x.sport === 'run' || x.sport === 'swim')) {
  const run = w.sport === 'run', paceMinMi = run ? (w.kind === 'tempo' ? 8.4 : 10.4) - fitnessOf(w.day) * 1.1 + between(-0.3, 0.3) : 0
  const moving = Math.round(w.min * 60 * between(0.94, 0.99))
  const dist = run ? moving / 60 / paceMinMi * 1609.344 : moving / 60 / between(2.3, 2.7) * 100 // swim: ~2:30 per 100 m
  put({ source: 'strava', kind: 'activity', id: String(stravaId++), day: w.day, data: {
    start: w.start, name: run ? pick(RUN_NAMES[w.kind ?? 'easy']) : pick(['Pool swim', 'Technique + endurance', 'Lap swim']), type: run ? 'Run' : 'Swim', description: null,
    elapsedS: Math.round(w.min * 60), movingS: moving, distanceM: round(dist), elevGainM: run ? round(between(15, 90)) : 0,
    avgHr: w.avgHr, maxHr: w.maxHr, avgSpeed: round(dist / moving, 2), maxSpeed: round(dist / moving * 1.35, 2), calories: w.kcal, relativeEffort: round(w.strain * 6),
    gear: run ? 'g1' : null, commute: false, device: 'WHOOP',
    // Strava's best efforts inside the run (Training → Personal bests): quicker than the run's pace over short distances.
    ...(run ? { bestEfforts: SAMPLE_EFFORTS.filter(([, m]) => m <= dist).map(([name, m, quick]) => ({ name, distanceM: m, elapsedS: Math.round(m / 1609.344 * paceMinMi * 60 * quick * between(0.98, 1.02)) })) } : {}),
  } satisfies StravaActivity })
}
function fitnessOf(day: string) { return clamp((Date.parse(day) - Date.parse(start)) / (DAYS * 864e5), 0, 1) }
put({ source: 'strava', kind: 'gear', id: 'g1', day: null, data: { name: 'Daily trainer', kind: 'shoe', distanceM: 412_000, retired: false } satisfies StravaGear })
put({ source: 'strava', kind: 'gear', id: 'b1', day: null, data: { name: 'Road bike', kind: 'bike', distanceM: 1_840_000, retired: false } satisfies StravaGear })

// ---- FitnessAI: lifts with sets and muscle activation -------------------------------------------------------------

type Ex = { name: string; base: number; muscles: { group: string; name: string; pct: number }[] }
const UPPER: Ex[] = [
  { name: 'Bench Press', base: 165, muscles: [{ group: 'Chest', name: 'Lower Chest', pct: 0.5 }, { group: 'Chest', name: 'Upper Chest', pct: 0.25 }, { group: 'Arms', name: 'Upper Tricep', pct: 0.15 }, { group: 'Shoulders', name: 'Front Shoulder', pct: 0.1 }] },
  { name: 'Incline Bench', base: 135, muscles: [{ group: 'Chest', name: 'Upper Chest', pct: 0.55 }, { group: 'Shoulders', name: 'Front Shoulder', pct: 0.25 }, { group: 'Arms', name: 'Outer Tricep', pct: 0.2 }] },
  { name: 'Dumbbell Row', base: 65, muscles: [{ group: 'Back', name: 'Lats', pct: 0.5 }, { group: 'Back', name: 'Upper Back', pct: 0.3 }, { group: 'Arms', name: 'Outer Bicep', pct: 0.2 }] },
  { name: 'Barbell Shoulder Press', base: 95, muscles: [{ group: 'Shoulders', name: 'Front Shoulder', pct: 0.6 }, { group: 'Arms', name: 'Lower Tricep', pct: 0.25 }, { group: 'Back', name: 'Upper Back', pct: 0.15 }] },
  { name: 'Lat Pulldown', base: 140, muscles: [{ group: 'Back', name: 'Lats', pct: 0.6 }, { group: 'Shoulders', name: 'Back Shoulder', pct: 0.2 }, { group: 'Arms', name: 'Inner Bicep', pct: 0.2 }] },
  { name: 'Cable Crunch', base: 90, muscles: [{ group: 'Core', name: 'Upper Abs', pct: 0.6 }, { group: 'Core', name: 'Lower Abs', pct: 0.3 }, { group: 'Core', name: 'Obliques', pct: 0.1 }] },
]
const LOWER: Ex[] = [
  { name: 'Squat', base: 205, muscles: [{ group: 'Legs', name: 'Quads', pct: 0.55 }, { group: 'Legs', name: 'Glutes', pct: 0.3 }, { group: 'Back', name: 'Lower Back', pct: 0.15 }] },
  { name: 'Deadlift', base: 245, muscles: [{ group: 'Legs', name: 'Hamstrings', pct: 0.35 }, { group: 'Legs', name: 'Glutes', pct: 0.3 }, { group: 'Back', name: 'Lower Back', pct: 0.35 }] },
  { name: 'Walking Lunge', base: 40, muscles: [{ group: 'Legs', name: 'Quads', pct: 0.45 }, { group: 'Legs', name: 'Glutes', pct: 0.35 }, { group: 'Legs', name: 'Inner Thigh', pct: 0.2 }] },
  { name: 'Standing Calf Raise', base: 140, muscles: [{ group: 'Legs', name: 'Calves', pct: 0.8 }, { group: 'Legs', name: 'Hamstrings', pct: 0.2 }] },
  { name: 'Hanging Leg Raise', base: 0, muscles: [{ group: 'Core', name: 'Lower Abs', pct: 0.7 }, { group: 'Core', name: 'Obliques', pct: 0.3 }] },
]
let liftId = 1, setId = 1
for (const w of workouts.filter(x => x.sport === 'lift')) {
  const prog = 1 + fitnessOf(w.day) * 0.12
  const list = (w.kind === 'upper' ? UPPER : LOWER).slice(0, w.kind === 'upper' ? 5 : 4)
  const exercises = list.map(e => {
    const sets = e.base > 150 ? 4 : 3, top = Math.round(e.base * prog / 5) * 5
    const reps = Array.from({ length: sets }, (_, k) => Math.max(5, Math.round(between(6, 10)) - k))
    const weightLb = reps.map(() => top)
    return { name: e.name, sets, reps, weightLb, muscles: e.muscles }
  })
  const id = String(liftId++)
  const reps = exercises.reduce((n, e) => n + e.reps.reduce((a, b) => a + b, 0), 0)
  const volumeLb = exercises.reduce((n, e) => n + e.reps.reduce((a, r, k) => a + r * e.weightLb[k], 0), 0)
  put({ source: 'fitnessai', kind: 'workout', id, day: w.day, data: {
    start: w.start, end: w.end, durationS: w.min * 60, kcal: w.kcal, sets: exercises.reduce((n, e) => n + e.sets, 0), reps, volumeLb, exercises,
  } satisfies LiftWorkout })
  let t = Date.parse(w.start)
  for (const e of exercises) e.reps.forEach((r, k) => {
    t += 150_000
    put({ source: 'fitnessai', kind: 'set', id: String(setId++), day: w.day, data: { workout: id, exercise: e.name, loggedAt: isoSec(new Date(t).toISOString()), reps: r, weightLb: e.weightLb[k], durationS: 0, distanceM: 0 } satisfies LiftSet })
  })
}

// ---- MacroFactor: daily nutrition, weight trend, targets ---------------------------------------------------------

let weight = 182.5, trend = 182.5
for (let i = 0; i < DAYS; i++) {
  const day = addDays(start, i)
  if (rnd() < 0.08 && day !== today) continue // a day not logged
  weight = weight - 0.022 + between(-0.9, 0.9) * 0.25
  const scale = round(weight + between(-1.2, 1.2), 1)
  trend = trend + (scale - trend) * 0.1
  const kcal = round(between(2150, 2650) - (weekday(day) === 5 ? -300 : 0)), protein = round(between(150, 190))
  const fat = round(kcal * between(0.26, 0.32) / 9), carbs = round((kcal - protein * 4 - fat * 9) / 4)
  put({ source: 'macrofactor', kind: 'day', id: day, day, data: {
    kcal, proteinG: protein, carbsG: carbs, fatG: fat, satFatG: round(fat * between(0.25, 0.36)), fiberG: round(between(24, 40)),
    cholesterolMg: round(between(180, 420)), sodiumMg: round(between(2100, 3400)), micros: null,
    weightLb: day === today ? null : scale, bodyFatPct: round(18.5 - fitnessOf(day) * 2.5 + between(-0.6, 0.6), 1), trendLb: round(trend, 1),
    expenditure: round(2620 + fitnessOf(day) * 90 + between(-40, 40)), steps: round(between(6500, 13500)),
  } satisfies NutritionDay })
}
for (const [k, wd] of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].entries())
  put({ source: 'macrofactor', kind: 'target', id: `${addDays(today, -60)}|${wd}`, day: null, data: { effective: addDays(today, -60), weekday: wd, kcal: k === 5 ? 2800 : 2450, proteinG: 175, carbsG: k === 5 ? 320 : 260, fatG: 78 } satisfies NutritionTarget })

// ---- Labs (Quest-style), DEXA, VO2 --------------------------------------------------------------------------------

const MARKERS: [marker: string, panel: string, unit: string, low: number | null, high: number | null, base: number, step: number, dp: number][] = [
  ['CHOLESTEROL, TOTAL', 'LIPID PANEL', 'mg/dL', null, 200, 214, -8, 0], ['HDL CHOLESTEROL', 'LIPID PANEL', 'mg/dL', 39, null, 48, 2, 0],
  ['TRIGLYCERIDES', 'LIPID PANEL', 'mg/dL', null, 150, 128, -14, 0], ['LDL-CHOLESTEROL', 'LIPID PANEL', 'mg/dL (calc)', null, 100, 138, -9, 0],
  ['APOLIPOPROTEIN B', 'APOLIPOPROTEIN B', 'mg/dL', null, 90, 104, -6, 0], ['GLUCOSE', 'COMPREHENSIVE METABOLIC PANEL', 'mg/dL', 65, 99, 94, -2, 0],
  ['HEMOGLOBIN A1c', 'HEMOGLOBIN A1c', '%', null, 5.7, 5.5, -0.1, 1], ['SODIUM', 'COMPREHENSIVE METABOLIC PANEL', 'mmol/L', 135, 146, 140, 0, 0],
  ['POTASSIUM', 'COMPREHENSIVE METABOLIC PANEL', 'mmol/L', 3.5, 5.3, 4.4, 0, 1], ['CREATININE', 'COMPREHENSIVE METABOLIC PANEL', 'mg/dL', 0.6, 1.26, 1.08, 0.02, 2],
  ['EGFR', 'COMPREHENSIVE METABOLIC PANEL', 'mL/min/1.73m2', 60, null, 92, -1, 0], ['ALT', 'COMPREHENSIVE METABOLIC PANEL', 'U/L', 9, 46, 31, -3, 0],
  ['AST', 'COMPREHENSIVE METABOLIC PANEL', 'U/L', 10, 40, 27, -1, 0], ['ALBUMIN', 'COMPREHENSIVE METABOLIC PANEL', 'g/dL', 3.6, 5.1, 4.6, 0, 1],
  ['TSH', 'TSH', 'mIU/L', 0.4, 4.5, 1.9, 0.2, 2], ['FERRITIN', 'FERRITIN', 'ng/mL', 38, 380, 64, 18, 0],
  ['IRON, TOTAL', 'IRON, TIBC AND FERRITIN PANEL', 'mcg/dL', 50, 180, 88, 6, 0], ['HEMOGLOBIN', 'CBC', 'g/dL', 13.2, 17.1, 15.1, 0.1, 1],
  ['HEMATOCRIT', 'CBC', '%', 38.5, 50, 45.2, 0.3, 1], ['WHITE BLOOD CELL COUNT', 'CBC', 'Thousand/uL', 3.8, 10.8, 5.9, -0.2, 1],
  ['PLATELET COUNT', 'CBC', 'Thousand/uL', 140, 400, 241, 4, 0], ['VITAMIN D,25-OH,TOTAL,IA', 'VITAMIN D', 'ng/mL', 30, 100, 26, 9, 0],
  ['HS CRP', 'HS CRP', 'mg/L', null, 1, 1.4, -0.4, 1], ['TESTOSTERONE, TOTAL, MS', 'TESTOSTERONE', 'ng/dL', 250, 1100, 548, 30, 0],
]
const draws = [addDays(today, -330), addDays(today, -170), addDays(today, -24)]
draws.forEach((d, k) => {
  put({ source: 'labs', kind: 'draw', id: d, day: d, data: { lab: 'Quest Diagnostics (sample)', collectedAt: at(d, 7.5).iso, reportedAt: at(addDays(d, 2), 9).iso, status: 'FINAL', fasting: true } satisfies LabDraw })
  for (const [marker, panel, unit, low, high, base, step, dp] of MARKERS) {
    const v = round(base + step * k + between(-0.04, 0.04) * base, dp)
    const flag = high != null && v > high ? 'H' : low != null && v < low ? 'L' : null
    const range = low != null && high != null ? `${low}-${high}` : high != null ? `<${high}` : `>${low}`
    put({ source: 'labs', kind: 'result', id: `${d}|${marker}`, day: d, data: { marker, panel, value: v, text: String(v), unit, flag, range, low, high } satisfies LabResult })
  }
})
const scan = (d: string, k: number) => {
  const fat = 36.5 - k * 3.4, lean = 139 + k * 2.6, bmc = 7.4
  put({ source: 'dexa', kind: 'scan', id: d, day: d, data: {
    provider: 'Sample DEXA center', totalLb: round(fat + lean + bmc, 1), fatLb: round(fat, 1), leanLb: round(lean, 1), bodyFatPct: round(fat / (fat + lean + bmc) * 100, 1), bmcLb: bmc,
    regions: {
      Arms: { bodyFatPct: round(15 - k * 1.5, 1), totalLb: 22.4, fatLb: round(3.4 - k * 0.4, 1), leanLb: round(18.1 + k * 0.5, 1), bmcLb: 0.9 },
      Legs: { bodyFatPct: round(19 - k * 1.6, 1), totalLb: 61.2, fatLb: round(11.6 - k * 1, 1), leanLb: round(46.8 + k * 0.9, 1), bmcLb: 2.8 },
      Trunk: { bodyFatPct: round(21 - k * 2.2, 1), totalLb: 85.1, fatLb: round(18.4 - k * 1.9, 1), leanLb: round(63.9 + k * 1.1, 1), bmcLb: 2.8 },
    },
    vatLb: round(1.4 - k * 0.3, 1), rsmi: round(8.6 + k * 0.15, 2), rmrKcal: round(1780 + k * 30),
    bmd: { gcm2: 1.31, tScore: 1.2, zScore: 1.1, centile: 86 },
  } satisfies DexaScan })
}
scan(addDays(today, -250), 0); scan(addDays(today, -45), 1)
put({ source: 'vo2', kind: 'test', id: addDays(today, -60), day: addDays(today, -60), data: {
  provider: 'Sample performance lab', vo2max: 49.6, maxHr: 191, restingHr: 52,
  aerobicThreshold: { hr: 146, vo2: 33.1 }, anaerobicThreshold: { hr: 171, vo2: 43.8 },
  zones: [{ zone: 'Z1', lowHr: null, highHr: 129 }, { zone: 'Z2', lowHr: 130, highHr: 146 }, { zone: 'Z3', lowHr: 147, highHr: 158 }, { zone: 'Z4', lowHr: 159, highHr: 171 }, { zone: 'Z5', lowHr: 172, highHr: null }],
  recovery: { peak: 189, after1m: 158, after2m: 131 },
} satisfies Vo2Test })

// ---- Roadmap ----------------------------------------------------------------------------------------------------

const race = addDays(today, 200), tune = addDays(today, 38), half = addDays(today, 110)
const season = (d: string) => { const m = +d.slice(5, 7); return `${m <= 2 || m === 12 ? 'winter' : m <= 5 ? 'spring' : m <= 8 ? 'summer' : 'fall'} ${d.slice(0, 4)}` }
put({ source: 'plan', kind: 'roadmap', id: today, day: today, data: {
  title: 'Sample season', as_of_date: today,
  primary_goal: { event: 'Lakeside Half Triathlon (sample)', date: race, location: 'Sample City', objective: 'Finish strong, in control, with a negative-split run.', registered_on: addDays(today, -20), distances: { swim_km: 1.9, bike_km: 90, run_km: 21.1 } },
  milestones: [
    { name: 'Harbor 10K (sample)', date: tune, status: 'registered', target_time: '49:00' },
    { name: 'Open-water swim course', date_range: season(addDays(today, 70)), status: 'planned' },
    { name: 'River City Half Marathon (sample)', date: half, status: 'planned', target_time: '1:52:00' },
    { name: 'Lakeside Half Triathlon (sample)', date: race, status: 'goal' },
  ],
  current_training_schedule: {
    weekly_sessions: { strength: 2, running: 3, swimming: 1 }, note: 'Long run on Saturday, bike on Sunday once the base is in.',
    monday: ['Strength: upper body'], tuesday: ['Zone 2 run, 40 min'], wednesday: ['Swim: technique + endurance', 'Strength: lower body'],
    thursday: ['Tempo run'], friday: ['Strength: lower body'], saturday: ['Long run'], sunday: ['Bike, easy'],
  },
  running: { current_comfortable_distance_miles: 8, days: ['tuesday', 'thursday', 'saturday'], future_progression: ['10K', 'Half marathon'], next_event: 'Harbor 10K (sample)' },
  swimming: { coach_hired: false, current_frequency: 'once a week', current_focus: ['bilateral breathing', 'sighting'], training_phases: [
    { name: 'Technique', period: season(today), focus: 'Smooth, continuous 1,000 m' }, { name: 'Endurance', period: season(addDays(today, 100)), focus: 'Race distance in the pool' }] },
  cycling: { priority: 'Build to 3-hour rides by spring', bike_owned: true, bike_budget_usd_max: null, preferred_purchase: '', fitting_status: 'completed', equipment_status: { power_meter: 'researching', aero_bars: 'planned' }, gym_bikes: '' },
  deload: { date_range: `${addDays(today, 12)} to ${addDays(today, 18)}`, planned_weight_fraction_of_normal: 0.6, approach: 'Same lifts, 60% weight, half the sets.' },
  planning_principles: ['Build run volume no more than 10% a week', 'Two strength sessions all season', 'Easy days easy (Zone 2)'],
  recovery_priorities: ['8 hours in bed', 'Sauna after hard days', 'One full rest day'],
  unknown_or_unconfirmed: [], other_events: {},
} })

// ---- Calendar ------------------------------------------------------------------------------------------------------

const ev = (id: string, d: string, e: Omit<CalendarEvent, 'date' | 'updated'>) => put({ source: 'calendar', kind: 'event', id, day: d, data: { ...e, date: d, updated: `${today}T12:00:00.000Z` } satisfies CalendarEvent })
ev('sample-doc', addDays(today, 5), { title: 'Sports medicine check-up (sample)', time: '09:30', kind: 'doctor', location: 'Sample Clinic', note: 'Bring recent lab results' })
ev('sample-appt', addDays(today, 11), { title: 'Bike fitting (sample)', time: '16:00', kind: 'appointment', location: '', note: '' })

upsertRecords(rows)

// ---- the dashboard, exactly as the real app computes it ------------------------------------------------------------
const { dashboard } = await import('./dashboard/index.ts')
const out = dashboard(today) as Record<string, unknown>
process.stdout.write(JSON.stringify({ ...out, sample: true }))
