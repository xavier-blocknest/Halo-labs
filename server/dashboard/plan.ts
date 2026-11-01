// The athlete's roadmap (plan/roadmap, newest as_of_date), interpreted for the pages: dates in plain language
// ("late October–November 2026", "winter 2026–27") become date ranges so they can be placed on a timeline.
import { readRecords } from '../db.ts'
import { isMetric, targetStatus } from '../targets.ts'
import { addDays, diffDays, medium, weekday } from './time.ts'

type Doc = Record<string, any>

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
const SEASONS: Record<string, [number, number]> = { winter: [12, 2], spring: [3, 5], summer: [6, 8], fall: [9, 11], autumn: [9, 11] }
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate()
const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

/** "2026-11-07" | "2026-10" | "late October–November 2026" | "winter 2026–27" | "spring–summer 2027" -> [start, end] */
export function parseWhen(s: string | null | undefined): { start: string; end: string } | null {
  if (!s) return null
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (m) return { start: s, end: s }
  m = /^(\d{4})-(\d{2})$/.exec(s)
  if (m) return { start: `${s}-01`, end: iso(+m[1], +m[2], lastDay(+m[1], +m[2])) }
  const text = s.toLowerCase().replace(/(\d{4})[–-](\d{2})\b/g, (_, a, b) => `${a}–${a.slice(0, 2)}${b}`)
  const years = [...text.matchAll(/\b(20\d{2})\b/g)].map(x => +x[1])
  const tokens = [...text.matchAll(/\b(early|mid|late)?\s*(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec|winter|spring|summer|fall|autumn)\b/g)]
  if (!tokens.length || !years.length) return null
  const toRange = (word: string) => {
    const season = SEASONS[word]
    if (season) return season
    const i = MONTHS.findIndex(n => n.startsWith(word.slice(0, 3)))
    return [i + 1, i + 1] as [number, number]
  }
  const first = tokens[0], last = tokens[tokens.length - 1]
  const [m0] = toRange(first[2]), [, m1] = toRange(last[2])
  let y0 = years[0], y1 = years[years.length - 1]
  if (first[2] === 'winter' && years.length === 2 && tokens.length === 1) { y0 = years[0]; y1 = years[1] } // winter 2026–27
  else if (m0 > m1 && y0 === y1) y0 = y1 - 1 // "December 2026–February 2027" handled by years; "Nov–Feb 2027" spans the turn
  const d0 = first[1] === 'late' ? 16 : first[1] === 'mid' ? 10 : 1
  const d1 = last[1] === 'early' ? 15 : last[1] === 'mid' ? 20 : lastDay(y1, m1)
  return { start: iso(y0, m0, d0), end: iso(y1, m1, d1) }
}

// In-app roadmap edits (plan/roadmap-edits, id 'current'), applied on top of the newest uploaded roadmap so a new
// upload doesn't wipe them. Keyed by milestone name; `added` milestones are new races or steps.
export type MilestoneEdit = { date?: string; date_range?: string; status?: string; target_time?: string | null; registered_on?: string | null; hidden?: boolean }
// `answers` settles the roadmap's open questions (unknown_or_unconfirmed), keyed by the question's text.
// `hard75` replaces the file's sustainable_75_hard rules with the athlete's own list and dates the challenge.
export type Hard75 = { rules: string[]; start: string; days: number }
export type RoadmapEdits = { edits: Record<string, MilestoneEdit>; added: ({ name: string } & MilestoneEdit)[]; answers?: Record<string, string>; hard75?: Hard75 | null }
export const STATUSES = ['completed', 'started', 'in_progress', 'upcoming', 'registered', 'planned', 'researching', 'goal', 'optional']

export function roadmapEdits(): RoadmapEdits {
  const e = readRecords<RoadmapEdits>('plan', 'roadmap-edits').at(-1)?.data
  return { edits: e?.edits ?? {}, added: e?.added ?? [], answers: e?.answers ?? {}, hard75: e?.hard75 ?? null }
}

/** The uploaded roadmap with the in-app edits applied. Added milestones go in date order. */
function withEdits(doc: Doc, e: RoadmapEdits) {
  const d = { ...doc }, edits = { ...e.edits }
  for (const a of e.added) if ((doc.milestones ?? []).some((m: Doc) => m.name === a.name)) edits[a.name] = { ...a, ...edits[a.name] } // the file has it now
  const list: Doc[] = (doc.milestones ?? []).map((m: Doc) => (edits[m.name] ? { ...m, ...edits[m.name], _edited: true } : m))
  for (const a of e.added) {
    if (list.some(m => m.name === a.name)) continue
    const at = parseWhen(a.date ?? a.date_range)?.start ?? '9999'
    const i = list.findIndex(m => (parseWhen(m.date ?? m.date_range)?.start ?? '') > at)
    list.splice(i < 0 ? list.length : i, 0, { ...a, _added: true })
  }
  d.milestones = list.filter(m => !m.hidden)
  const ge = edits[doc.primary_goal?.event]
  if (ge) d.primary_goal = { ...doc.primary_goal, ...(ge.date ? { date: ge.date } : {}), ...(ge.registered_on !== undefined ? { registered_on: ge.registered_on } : {}) }
  return d
}

/** The roadmap as the planner edits it: the newest roadmap (uploaded or saved by the planner) with the in-app edits applied. */
export function roadmapDoc(): { doc: Doc; day: string | null } | null {
  const rec = readRecords<Doc>('plan', 'roadmap').at(-1)
  if (!rec) return null
  const d = withEdits(rec.data, roadmapEdits())
  d.milestones = d.milestones.map(({ _edited, _added, hidden, ...m }: Doc) => m)
  return { doc: d, day: rec.day }
}

export const SCHEDULE_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
export const plannedSport = (item: string) => (/\brun/i.test(item) ? 'run' : /swim/i.test(item) ? 'swim' : /ride|bike|cycl/i.test(item) ? 'ride' : /rest/i.test(item) ? 'rest' : 'strength')

export function planSummary(today: string, longest: { swim?: { v: number; day: string } | null; ride?: { v: number; day: string } | null; run?: { v: number; day: string } | null } | null) {
  const rec = readRecords<Doc>('plan', 'roadmap').at(-1)
  if (!rec) return null
  const edits = roadmapEdits(), d = withEdits(rec.data, edits), g = d.primary_goal ?? {}, h75 = edits.hard75
  const raceDay = /^\d{4}-\d{2}-\d{2}$/.test(g.date ?? '') ? g.date : null
  // A main goal is a race (the default) or a measurable target: kind 'target' with { metric, of, value, start }.
  const target = g.kind === 'target' && isMetric(g.target?.metric) && typeof g.target.value === 'number' ? targetStatus(g.target, raceDay, today) : null
  const milestones = (d.milestones ?? []).map((x: Doc) => {
    const when = parseWhen(x.date ?? x.date_range)
    // A race: marked in the planner (race: true/false), else guessed from the name.
    const big = !!(x.date && /^\d{4}-\d{2}-\d{2}$/.test(x.date) && (x.status === 'goal' || (x.race ?? /5k|10k|race|ironman|70\.3|marathon|spartan/i.test(x.name))))
    return { name: x.name as string, status: x.status as string, when: x.date_range ?? (when ? (when.start === when.end ? medium(when.start) : x.date) : x.date ?? ''), start: when?.start ?? null, end: when?.end ?? null, big,
      daysTo: when && when.start === when.end ? diffDays(when.start, today) : null, targetTime: x.target_time ?? null,
      date: x.date ?? null, dateRange: x.date_range ?? null, registeredOn: x.registered_on ?? null, edited: !!x._edited, added: !!x._added,
      // A checkpoint can be a measurable target ("VO₂ max 47 by March") instead of a race or a step.
      target: isMetric(x.target?.metric) && typeof x.target.value === 'number' ? targetStatus(x.target, when?.end ?? null, today) : null }
  })
  const dl = /(\d{4}-\d{2}-\d{2})\s*(?:to|–|-)\s*(\d{4}-\d{2}-\d{2})/.exec(d.deload?.date_range ?? '')
  const deload = dl ? { start: dl[1], end: dl[2], active: today >= dl[1] && today <= dl[2], fraction: d.deload?.planned_weight_fraction_of_normal ?? null, approach: d.deload?.approach ?? '' } : null
  const schedule = Object.fromEntries(SCHEDULE_DAYS.map(k => [k, (d.current_training_schedule?.[k] ?? []) as string[]]))
  const MI: Record<string, number> = { '5k': 3.1, '10k': 6.2, '10 miles': 10, '12 miles': 12, 'half marathon': 13.1 }
  const ladder = !d.running ? [] : ['5K', ...(d.running.future_progression ?? [])].map((k: string) => ({ k, mi: MI[k.toLowerCase()] ?? Number.parseFloat(k) }))
  const phases = (d.swimming?.training_phases ?? []).map((p: Doc) => ({ ...p, ...(parseWhen(p.period) ?? {}) }))
  const legs = g.distances ? [
    { k: 'Swim', goalKm: g.distances.swim_km, goal: Math.round(g.distances.swim_km * 1093.6), unit: 'yd', done: longest?.swim?.v ?? 0, day: longest?.swim?.day ?? null },
    { k: 'Bike', goalKm: g.distances.bike_km, goal: Math.round(g.distances.bike_km / 1.609344 * 10) / 10, unit: 'mi', done: longest?.ride?.v ?? 0, day: longest?.ride?.day ?? null },
    { k: 'Run', goalKm: g.distances.run_km, goal: Math.round(g.distances.run_km / 1.609344 * 10) / 10, unit: 'mi', done: longest?.run?.v ?? 0, day: longest?.run?.day ?? null },
  ] : []
  return {
    asOf: rec.day, title: d.title ?? 'Roadmap', edits, hiddenNames: Object.entries(edits.edits).filter(([, v]) => v.hidden).map(([k]) => k),
    goal: { kind: target ? 'target' : 'race', target, event: g.event, registered: /^\d{4}-\d{2}-\d{2}$/.test(g.registered_on ?? '') ? g.registered_on : null, date: raceDay, dateLabel: raceDay ? medium(raceDay) : g.date, location: g.location, objective: g.objective, daysTo: raceDay ? diffDays(raceDay, today) : null, weeksTo: raceDay ? Math.ceil(diffDays(raceDay, today) / 7) : null },
    legs, milestones, deload, schedule, weeklySessions: d.current_training_schedule?.weekly_sessions ?? null, scheduleNote: d.current_training_schedule?.note ?? '',
    todayPlan: schedule[SCHEDULE_DAYS[weekday(today)]] ?? [],
    running: { comfortableMi: d.running?.current_comfortable_distance_miles ?? null, days: d.running?.days ?? [], ladder, nextEvent: d.running?.next_event ?? null },
    swimming: { coach: !!d.swimming?.coach_hired, when: d.swimming?.current_frequency ?? '', focus: d.swimming?.current_focus ?? [], phases, current: phases.find((p: Doc) => p.start && today >= p.start && today <= p.end) ?? null },
    cycling: { priority: d.cycling?.priority ?? '', bikeOwned: !!d.cycling?.bike_owned, budget: d.cycling?.bike_budget_usd_max ?? null, preferred: d.cycling?.preferred_purchase ?? '', fitting: d.cycling?.fitting_status ?? '',
      equipment: Object.entries(d.cycling?.equipment_status ?? {}).map(([k, v]) => ({ k: k.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()), v: String(v) })), interim: d.cycling?.gym_bikes ?? '' },
    hard75: h75 ? { ...h75, end: addDays(h75.start, h75.days - 1), day: Math.min(h75.days, diffDays(today, h75.start) + 1),
      status: today < h75.start ? 'upcoming' : diffDays(today, h75.start) >= h75.days ? 'completed' : 'in_progress' } : null,
    rules: h75 ? [
      ...h75.rules.map(k => ({ k, v: '' })),
      { k: 'Started', v: medium(h75.start) }, { k: 'Ends', v: `${medium(addDays(h75.start, h75.days - 1))} · day ${h75.days}` },
    ] : d.sustainable_75_hard ? [
      { k: `Move at least ${d.sustainable_75_hard.daily_movement_minutes_min} minutes a day`, v: d.sustainable_75_hard.streak_resets_on_missed_day ? 'Streak resets on a miss' : '' },
      ...(d.sustainable_75_hard.recovery_movement_can_count ? [{ k: 'Recovery movement counts', v: 'Walks, mobility' }] : []),
      { k: d.sustainable_75_hard.diet_rule, v: '' },
      ...(d.sustainable_75_hard.soda_allowance ? [{ k: 'Soda allowance', v: `${d.sustainable_75_hard.soda_allowance.max_fl_oz} fl oz per ${d.sustainable_75_hard.soda_allowance.period_days} days` }] : []),
      { k: 'End date', v: d.sustainable_75_hard.fixed_end_date ?? 'None' },
    ] : [],
    principles: d.planning_principles ?? [], recovery: d.recovery_priorities ?? [], unknowns: (d.unknown_or_unconfirmed ?? []).filter((u: string) => !edits.answers?.[u]),
    answered: (d.unknown_or_unconfirmed ?? []).filter((u: string) => edits.answers?.[u]).map((u: string) => ({ q: u, a: edits.answers![u] })),
    otherEvents: Object.entries(d.other_events ?? {}).map(([k, v]) => ({ k: k.replace(/_/g, ' '), v: String(v) })),
    windowStart: today < (milestones[0]?.start ?? today) ? today : (addDays(today, -30)),
    nextRace: milestones.filter((m: { big: boolean; daysTo: number | null }) => m.big && m.daysTo != null && m.daysTo >= 0).sort((a: { daysTo: number }, b: { daysTo: number }) => a.daysTo - b.daysTo)[0] ?? null,
  }
}
