// Sustainable 75 Hard restart: the coach's restart_75_hard tool. Day 1 moves to the given day (usually today); the
// rules and length set on the Roadmap stay. Stored in plan/roadmap-edits (hard75), like the Roadmap's own edits.
import { upsertRecords } from './db.ts'
import { roadmapEdits } from './dashboard/plan.ts'
import { addDays, today } from './dashboard/time.ts'

const ISO = /^\d{4}-\d{2}-\d{2}$/
const fail = (msg: string) => new Error(msg)

/** Restart the challenge: day 1 on `start` (YYYY-MM-DD or "today"), at most two weeks back, never in the future. */
export function restart75Hard(input: { start?: unknown }): { start: string; end: string; days: number } {
  const cur = roadmapEdits()
  if (!cur.hard75) throw fail('There is no 75 Hard challenge set up on the roadmap to restart.')
  const raw = typeof input.start === 'string' ? input.start.trim() : '', day = !raw || /^today$/i.test(raw) ? today() : raw
  if (!ISO.test(day) || Number.isNaN(Date.parse(day))) throw fail(`"${raw}" isn't a day. Use YYYY-MM-DD or "today".`)
  if (day > today()) throw fail("The restart day can't be in the future.")
  if (day < addDays(today(), -14)) throw fail('That restart day is more than two weeks ago; check the date with him.')
  upsertRecords([{ source: 'plan', kind: 'roadmap-edits', id: 'current', day: null, data: { ...cur, hard75: { ...cur.hard75, start: day } } }])
  return { start: day, end: addDays(day, cur.hard75.days - 1), days: cur.hard75.days }
}

export const RESTART_75_HARD_TOOL = {
  name: 'restart_75_hard',
  description: 'Restart the athlete\'s Sustainable 75 Hard challenge: day 1 becomes the given day (usually today), keeping the rules and length. ' +
    'Use it only when he tells you he missed a day or broke a rule and is starting over, or asks you to reset it. Never on your own initiative. ' +
    'Say in your reply that it\'s reset, the new day count and the new end date.',
  strict: true,
  input_schema: {
    type: 'object', additionalProperties: false, required: ['start'],
    properties: { start: { type: 'string', description: 'Day 1 of the restarted challenge: "today" or a recent day as YYYY-MM-DD' } },
  },
} as const
