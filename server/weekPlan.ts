// Dated week plans (plan/week, id = the Monday): what's planned on each day of one week, plus the week's targets and
// notes. Written by the coach (the save_week_plan tool, once the athlete agrees) or edited on the Week page. Where a
// week has no plan, pages fall back to the roadmap's weekly template.
import { readRecords, upsertRecords } from './db.ts'
import { addDays, weekStart } from './dashboard/time.ts'

export const SPORTS = ['strength', 'run', 'swim', 'ride', 'walk', 'mobility', 'rest', 'other'] as const
export type Sport = (typeof SPORTS)[number]
export type PlanSession = { sport: Sport; title: string; detail: string }
export type WeekPlan = { start: string; days: Record<string, PlanSession[]>; targets: string[]; notes: string[]; updated: string; by: 'coach' | 'you' }

const DAY = /^\d{4}-\d{2}-\d{2}$/
const isDay = (s: unknown): s is string => typeof s === 'string' && DAY.test(s) && !Number.isNaN(Date.parse(s))

export const weekPlan = (start: string) => readRecords<WeekPlan>('plan', 'week').find(r => r.id === start)?.data ?? null

/** This week's and next week's plans (null where none was saved), plus saved weeks further ahead (`later`). */
export function weekPlans(today: string) {
  const thisStart = weekStart(today), nextStart = addDays(thisStart, 7)
  const later = readRecords<WeekPlan>('plan', 'week').filter(r => r.id > nextStart).map(r => r.data).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 8)
  return { thisStart, nextStart, this: weekPlan(thisStart), next: weekPlan(nextStart), later }
}

type Input = { week_start?: unknown; start?: unknown; days?: unknown; targets?: unknown; notes?: unknown }

/** Validate and store a whole week, replacing what was there. Days outside the week are rejected, not moved. */
export function saveWeekPlan(input: Input, by: WeekPlan['by']): WeekPlan {
  const start = input.week_start ?? input.start
  if (!isDay(start) || weekStart(start) !== start) throw new Error('week_start must be the Monday of the week, as YYYY-MM-DD.')
  const inWeek = new Set(Array.from({ length: 7 }, (_, i) => addDays(start, i)))
  const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
  const days: WeekPlan['days'] = {}
  // Accepts the coach's list form ([{date, sessions}]) and the page's map form ({date: sessions}).
  const entries: [unknown, unknown][] = Array.isArray(input.days)
    ? input.days.map(d => [(d as { date?: unknown }).date, (d as { sessions?: unknown }).sessions])
    : Object.entries((input.days ?? {}) as Record<string, unknown>)
  for (const [date, sessions] of entries) {
    if (!isDay(date) || !inWeek.has(date)) throw new Error(`${String(date)} is not a day of the week starting ${start}.`)
    if (!Array.isArray(sessions) || sessions.length > 12) throw new Error(`Sessions for ${date} must be a list (at most 12).`)
    days[date] = sessions.map(s => {
      const x = s as Record<string, unknown>
      if (!SPORTS.includes(x.sport as Sport)) throw new Error(`Unknown sport "${String(x.sport)}" on ${date}.`)
      const title = text(x.title, 120)
      if (!title) throw new Error(`Every session needs a title (${date}).`)
      return { sport: x.sport as Sport, title, detail: text(x.detail, 600) }
    })
  }
  const list = (v: unknown, n: number) => (Array.isArray(v) ? v.map(x => text(x, 300)).filter(Boolean).slice(0, n) : [])
  // The coach replaces whole weeks; an empty one is almost certainly a slip (it wiped a week once on Oct 30).
  if (by === 'coach' && !Object.values(days).some(d => d.length)) throw new Error('That would leave the whole week empty. Send every day with its sessions; to clear a week, ask the athlete first and he can do it on the Week page.')
  const plan: WeekPlan = { start, days, targets: list(input.targets, 12), notes: list(input.notes, 12), updated: new Date().toISOString(), by }
  upsertRecords([{ source: 'plan', kind: 'week', id: start, day: start, data: plan }])
  return plan
}

/** The coach's tool. Strict schema: every field required (empty strings/lists where there's nothing). */
export const SAVE_WEEK_PLAN_TOOL = {
  name: 'save_week_plan',
  description: 'Save the training plan for one week (Monday to Sunday) to the athlete\'s Week page, replacing whatever was planned for that week. ' +
    'Use it only when the athlete has agreed to a plan or asked you to change one; say in your reply that you saved it. ' +
    'Send the whole week every time, including days you are not changing (copy them from the current plan in your context): days left out end up with nothing planned. ' +
    'One session per thing he will do. Put rest days in as sport "rest". Keep titles short ("Chest, shoulders, triceps", "Zone 2 run", "Official 5K") and put pace, duration, intensity and conditions in detail.',
  strict: true,
  input_schema: {
    type: 'object', additionalProperties: false, required: ['week_start', 'days', 'targets', 'notes'],
    properties: {
      week_start: { type: 'string', description: 'Monday of the week, YYYY-MM-DD' },
      days: { type: 'array', description: 'Each day of the week that has something planned', items: {
        type: 'object', additionalProperties: false, required: ['date', 'sessions'],
        properties: {
          date: { type: 'string', description: 'YYYY-MM-DD, within the week' },
          sessions: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['sport', 'title', 'detail'], properties: {
            sport: { type: 'string', enum: [...SPORTS] }, title: { type: 'string' }, detail: { type: 'string', description: 'Specifics; "" if none' },
          } } },
        },
      } },
      targets: { type: 'array', items: { type: 'string' }, description: 'The week\'s targets (session counts, nutrition), one per line' },
      notes: { type: 'array', items: { type: 'string' }, description: 'Anything else for the week (open questions, what to bring the coach)' },
    },
  },
} as const
