// Calendar: events the athlete adds himself (appointments, doctor consultations, …), stored encrypted as
// calendar/event records, merged with dates the app already knows from his own documents: roadmap milestones with an
// exact date (races, …) and the nutrition protocol's retest. Those two are shown read-only here; they're edited where
// they come from (Roadmap editor, protocol upload). Nothing on the page is sample content.
import { deleteRecord, readRecords, upsertRecords } from './db.ts'
import type { CalendarEvent } from './model.ts'
import { diffDays, medium } from './dashboard/time.ts'

export const EVENT_ID = /^[a-z0-9-]{4,40}$/
export const EVENT_KINDS = ['appointment', 'doctor', 'race', 'event', 'other'] as const
const DAY = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
/** How far back the page keeps past events. */
const PAST_DAYS = 90

export function calendarEvents() {
  return readRecords<CalendarEvent>('calendar', 'event').map(r => ({ id: r.id, ...r.data }))
}

/** Create or update an event from the Calendar page. */
export function saveEvent(id: string, input: Partial<CalendarEvent>) {
  const prev = calendarEvents().find(e => e.id === id)
  const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined)
  const date = typeof input.date === 'string' && DAY.test(input.date) ? input.date : prev?.date
  if (!date) throw new Error('An event needs a date.')
  const title = text(input.title, 200) ?? prev?.title ?? ''
  if (!title) throw new Error('An event needs a title.')
  const time = input.time === null || input.time === '' ? null : typeof input.time === 'string' && TIME.test(input.time) ? input.time : prev?.time ?? null
  const kind = EVENT_KINDS.includes(input.kind as CalendarEvent['kind']) ? input.kind! : prev?.kind ?? 'event'
  const ev: CalendarEvent = {
    title, date, time, kind, location: text(input.location, 200) ?? prev?.location ?? '', note: text(input.note, 4000) ?? prev?.note ?? '',
    updated: new Date().toISOString(),
  }
  // Write the record whole so a cleared field (time → null) doesn't get merged back from the old row.
  if (prev) deleteRecord('calendar', 'event', id)
  upsertRecords([{ source: 'calendar', kind: 'event', id, day: date, data: ev }])
  return { id, ...ev }
}

export const deleteEvent = (id: string) => deleteRecord('calendar', 'event', id)

type Milestone = { name: string; status: string; start: string | null; end: string | null; big: boolean }
export type CalItem = {
  id: string; title: string; date: string; dateL: string; time: string | null; kind: CalendarEvent['kind'] | 'milestone' | 'lab'
  location: string; note: string; daysTo: number; source: 'you' | 'roadmap' | 'protocol'
}

/** Every dated item from PAST_DAYS ago onward, soonest first, with days left from `today`. */
export function calendarSummary(today: string, plan: { milestones: Milestone[] } | null, protocol: { title: string; retest: string | null } | null) {
  const items: CalItem[] = calendarEvents().map(e => ({
    id: e.id, title: e.title, date: e.date, dateL: medium(e.date), time: e.time ?? null, kind: e.kind, location: e.location ?? '', note: e.note ?? '',
    daysTo: diffDays(e.date, today), source: 'you' as const,
  }))
  for (const m of plan?.milestones ?? []) {
    if (!m.start || m.start !== m.end || m.status === 'completed') continue
    items.push({ id: `roadmap:${m.name}`, title: m.name, date: m.start, dateL: medium(m.start), time: null, kind: m.big ? 'race' : 'milestone', location: '', note: '',
      daysTo: diffDays(m.start, today), source: 'roadmap' })
  }
  if (protocol?.retest && DAY.test(protocol.retest)) items.push({ id: 'protocol:retest', title: 'Protocol retest', date: protocol.retest, dateL: medium(protocol.retest), time: null,
    kind: 'lab', location: '', note: protocol.title, daysTo: diffDays(protocol.retest, today), source: 'protocol' })
  return items.filter(i => i.daysTo >= -PAST_DAYS).sort((a, b) => (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? '')) || a.title.localeCompare(b.title))
}
