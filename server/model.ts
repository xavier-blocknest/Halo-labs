// The canonical record shapes. Every importer (file uploads) and every connector (WHOOP/Strava APIs)
// writes exactly these, so the app reads one format per kind no matter where the data came from.
// Record identity is the real-world event (a cycle's start time, a Strava activity id, a draw date +
// marker), so the same event arriving from a CSV and from the API lands on the same row and merges.
//
// Units: times are ISO 8601 UTC ("2026-10-27T04:38:24Z"); `day` is the athlete's local calendar day;
// durations in minutes unless named *S (seconds); distance in metres; weight in lb; energy in kcal.

/** The athlete's time zone (HALO_TZ in .env, written by ./halo setup from the Mac's own setting). */
export const TZ = process.env.HALO_TZ || Intl.DateTimeFormat().resolvedOptions().timeZone

/** whoop/cycle, id = start. Belongs to the day you wake up. */
export type WhoopCycle = {
  start: string; end: string | null; tz: string
  recovery: number | null; rhr: number | null; hrv: number | null; skinTempC: number | null; spo2: number | null
  strain: number | null; kcal: number | null; maxHr: number | null; avgHr: number | null
  rescores?: { at: string; from: number }[] // earlier recovery scores WHOOP replaced (API sync only)
}

/** whoop/sleep (or whoop/nap), id = onset. Belongs to the day you wake up. */
export type WhoopSleep = {
  onset: string; wake: string; tz: string; cycleStart: string | null
  performance: number | null; respRate: number | null
  asleepMin: number | null; inBedMin: number | null; lightMin: number | null; deepMin: number | null; remMin: number | null; awakeMin: number | null
  needMin: number | null; debtMin: number | null; efficiency: number | null; consistency: number | null
}

/** whoop/workout, id = start. */
export type WhoopWorkout = {
  start: string; end: string; tz: string; name: string; durationMin: number | null
  strain: number | null; kcal: number | null; maxHr: number | null; avgHr: number | null
  zonePct: (number | null)[] /* zones 1–5, % of workout */; distanceM: number | null
}

/** whoop/journal, id = cycle start + question. */
export type WhoopJournal = { cycleStart: string; question: string; yes: boolean | null; notes: string | null }

/** whoop/body, id = 'current'. */
export type WhoopBody = { heightM: number | null; weightKg: number | null; maxHr: number | null }

/** strava/activity, id = Strava activity id. */
export type StravaActivity = {
  start: string; name: string; type: string; description: string | null
  elapsedS: number | null; movingS: number | null; distanceM: number | null; elevGainM: number | null
  avgHr: number | null; maxHr: number | null; avgSpeed: number | null; maxSpeed: number | null
  calories: number | null; relativeEffort: number | null; gear: string | null; commute: boolean | null; device: string | null
  // Runs only, from the activity detail (API): Strava's best efforts (fastest 1K, mile, 5K… inside the run). [] once
  // fetched with none; undefined until the detail is fetched (bulk-export history, backfilled by the connector).
  bestEfforts?: { name: string; distanceM: number; elapsedS: number }[]
}

/** strava/gear, id = gear id. */
export type StravaGear = { name: string; kind: 'bike' | 'shoe'; distanceM: number; retired: boolean | null }

/** fitnessai/workout, id = FitnessAI workout id. */
export type LiftWorkout = {
  start: string; end: string | null; durationS: number | null; kcal: number | null
  sets: number | null; reps: number | null; volumeLb: number | null
  exercises: { name: string; sets: number; reps: number[]; weightLb: number[]; muscles: { group: string; name: string; pct: number }[] }[]
}

/** fitnessai/set, id = FitnessAI set id. */
export type LiftSet = { workout: string; exercise: string; loggedAt: string; reps: number; weightLb: number; durationS: number; distanceM: number }

/** runna/run, id = Runna id. */
export type RunnaRun = {
  start: string; name: string; type: string; description: string | null; workoutId: string | null; planWeek: number | null
  distanceM: number | null; movingS: number | null; elapsedS: number | null; elevGainM: number | null
  feedback: string | null; stravaIds: number[]; mileSplits: { m: number; s: number }[]
}

/** macrofactor/day, id = day. Nutrition, scale and expenditure for one day; any field may be missing. */
export type NutritionDay = {
  kcal: number | null; proteinG: number | null; carbsG: number | null; fatG: number | null
  satFatG: number | null; fiberG: number | null; cholesterolMg: number | null; sodiumMg: number | null
  micros: Record<string, number> | null
  weightLb: number | null; bodyFatPct: number | null; trendLb: number | null; expenditure: number | null; steps: number | null
}

/** macrofactor/foods, id = day. Every food logged that day (MacroFactor's food-log CSV); a re-export replaces the day. */
export type FoodEntry = {
  t: string; name: string; qty: number | null; unit: string | null
  kcal: number | null; proteinG: number | null; carbsG: number | null; fatG: number | null; satFatG: number | null
  fiberG: number | null; cholesterolMg: number | null; sodiumMg: number | null; sugarsAddedG: number | null; alcoholG: number | null
}
export type FoodDay = { entries: FoodEntry[] }

/** macrofactor/target, id = effective day + weekday. */
export type NutritionTarget = { effective: string; weekday: string; kcal: number | null; proteinG: number | null; carbsG: number | null; fatG: number | null }

/** macrofactor/measurements, id = day. */
export type BodyMeasurements = Record<string, number>

/** labs/draw, id = collection day. */
export type LabDraw = { lab: string; collectedAt: string | null; reportedAt: string | null; status: string | null; fasting: boolean | null }

/** labs/result, id = collection day + marker. */
export type LabResult = {
  marker: string; panel: string | null; value: number | null; text: string; unit: string | null
  flag: 'H' | 'L' | null; range: string | null; low: number | null; high: number | null
}

/** dexa/scan, id = scan day. */
export type DexaScan = {
  provider: string; totalLb: number | null; fatLb: number | null; leanLb: number | null; bodyFatPct: number | null; bmcLb: number | null
  regions: Record<string, { bodyFatPct: number | null; totalLb: number | null; fatLb: number | null; leanLb: number | null; bmcLb: number | null }>
  vatLb: number | null; rsmi: number | null; rmrKcal: number | null
  bmd: { gcm2: number | null; tScore: number | null; zScore: number | null; centile: number | null } | null
}

/** vo2/test, id = test day. */
export type Vo2Test = {
  provider: string | null; vo2max: number | null; maxHr: number | null; restingHr: number | null
  aerobicThreshold: { hr: number | null; vo2: number | null } | null
  anaerobicThreshold: { hr: number | null; vo2: number | null } | null
  zones: { zone: string; lowHr: number | null; highHr: number | null }[]
  recovery: { peak: number | null; after1m: number | null; after2m: number | null } | null
}

/** Local calendar day of a UTC instant in the athlete's time zone. */
export function dayOf(isoUtc: string, tz = TZ): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(isoUtc))
}

/** "2026-10-26 22:38:24" + "UTC-06:00" (or "-06:00") -> "2026-10-27T04:38:24Z" */
export function localToUtc(local: string, offset: string): string {
  const m = /([+-])(\d{2}):?(\d{2})/.exec(offset)
  const mins = m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0
  const t = Date.parse(local.replace(' ', 'T') + 'Z') - mins * 60_000
  return isoSec(new Date(t).toISOString())
}

/** Drop milliseconds so the same instant from a CSV and from an API gives the same id. */
export const isoSec = (iso: string) => new Date(Math.floor(Date.parse(iso) / 1000) * 1000).toISOString().replace('.000Z', 'Z')

/** Normalize an offset to "+HH:MM" / "-HH:MM". */
export function normOffset(o: string): string {
  const m = /([+-])(\d{1,2}):?(\d{2})?/.exec(o)
  return m ? `${m[1]}${m[2].padStart(2, '0')}:${m[3] ?? '00'}` : '+00:00'
}

export const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

/** journal/entry, id = random. The athlete's own writing, or a letter/document he pasted in. `doc` is set once the
 *  text has been formatted (title, sender, tags, TL;DR, sections); the sections hold the original wording. */
export type JournalBlock = { type: 'h' | 'p' | 'sig'; t: string; lead?: string }
export type JournalEntry = {
  date: string; time?: string | null; title: string; body: string; note?: string; updated: string
  doc?: { from: string; tags: string[]; tldr: { k: string; v: string }[]; blocks: JournalBlock[] } | null
}

/** calendar/event, id = random. An event the athlete adds on the Calendar page (appointment, doctor consultation, …).
 *  `time` is local "HH:MM" or null for all-day. */
export type CalendarEvent = {
  title: string; date: string; time: string | null; kind: 'appointment' | 'doctor' | 'race' | 'event' | 'other'
  location: string; note: string; updated: string
}
