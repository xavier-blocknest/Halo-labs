// Calendar helpers in the athlete's time zone. Days are "YYYY-MM-DD" strings; arithmetic is done at noon UTC
// so DST never shifts a day.
import { TZ } from '../model.ts'

const noon = (day: string) => Date.parse(`${day}T12:00:00Z`)
export const addDays = (day: string, n: number) => new Date(noon(day) + n * 86_400_000).toISOString().slice(0, 10)
export const diffDays = (a: string, b: string) => Math.round((noon(a) - noon(b)) / 86_400_000)
export const weekday = (day: string) => (new Date(noon(day)).getUTCDay() + 6) % 7 // Monday = 0
export const weekStart = (day: string) => addDays(day, -weekday(day))

export function today(tz = TZ) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

/** Local hour (0–23) of a UTC instant. */
export function localHour(isoUtc: string, tz = TZ) {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(new Date(isoUtc)))
}

/** "6:42 am" for a UTC instant. */
export function localTime(isoUtc: string, tz = TZ) {
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(new Date(isoUtc)).replace(' AM', ' am').replace(' PM', ' pm')
}

const fmt = (day: string, opts: Intl.DateTimeFormatOptions) => new Date(noon(day)).toLocaleDateString('en-US', { timeZone: 'UTC', ...opts })
/** "Oct 27" */
export const short = (day: string) => fmt(day, { month: 'short', day: 'numeric' })
/** "Oct 27, 2026" */
export const medium = (day: string) => fmt(day, { month: 'short', day: 'numeric', year: 'numeric' })
/** "Wednesday, October 28" */
export const long = (day: string) => fmt(day, { weekday: 'long', month: 'long', day: 'numeric' })
/** "Wed" */
export const dow = (day: string) => fmt(day, { weekday: 'short' })
/** "Oct" */
export const monthName = (day: string) => fmt(day, { month: 'short' })
