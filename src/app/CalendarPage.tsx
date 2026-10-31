// Calendar page and the Overview "Next 2 weeks" card. Items come from D.calendar (server/calendar.ts): events the
// athlete adds here (appointments, doctor consultations, …) plus dated roadmap milestones and the protocol retest,
// which are read-only here. Every date, title and countdown is from that data; nothing on this page is sample content.
import { Fragment, useEffect, useMemo, useState } from 'react'

const T1 = 'oklch(0.96 0.005 250)', T2 = 'oklch(0.74 0.015 255)', T3 = 'oklch(0.58 0.015 255)', A = 'oklch(0.82 0.13 210)'
const G = 'oklch(0.78 0.15 160)', W = 'oklch(0.82 0.14 80)', V = 'oklch(0.76 0.12 300)', LINE = 'oklch(1 0 0 / 0.07)'
const GROTESK = "'Space Grotesk',system-ui,sans-serif", PLEX = "'IBM Plex Sans',system-ui,sans-serif"
const CARD = { borderRadius: '18px', background: 'oklch(0.185 0.018 262 / 0.9)', border: `1px solid ${LINE}`, boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.04)', padding: '22px', minWidth: 0 } as const
const TITLE = { fontSize: '14px', fontWeight: 500, fontFamily: GROTESK, letterSpacing: '-0.005em', color: T1 } as const
const CSS = `
.cal-btn{font-family:${PLEX};font-size:12px;color:${T2};background:transparent;border:1px solid ${LINE};border-radius:9px;padding:6px 11px;cursor:pointer}
.cal-btn:hover{color:${T1};border-color:oklch(1 0 0 / 0.16)}
.cal-btn.pri{color:oklch(0.15 0.02 262);background:${A};border-color:${A};font-weight:500}
.cal-btn.pri:hover{filter:brightness(1.08)}
.cal-cell{cursor:pointer;transition:background .15s}
.cal-cell:hover{background:oklch(1 0 0 / 0.035)}
.cal-row{cursor:pointer;border-radius:10px}
.cal-row:hover{background:oklch(1 0 0 / 0.03)}
.cal-in{font-family:${PLEX};font-size:14px;color:${T1};background:oklch(0.145 0.016 262);border:1px solid ${LINE};border-radius:10px;padding:9px 11px;width:100%;box-sizing:border-box;color-scheme:dark}
.cal-in:focus{outline:none;border-color:oklch(0.82 0.13 210 / 0.5)}
.cal-in::placeholder{color:oklch(0.5 0.015 255)}
@media (max-width: 760px){ .cal-pill{display:none!important} .cal-dots{display:flex!important} .cal-cell{min-height:46px!important;padding:5px!important} }
`

export type CalItem = {
  id: string; title: string; date: string; dateL: string; time: string | null; kind: string
  location: string; note: string; daysTo: number; source: 'you' | 'roadmap' | 'protocol'
}
type Draft = { id: string | null; title: string; date: string; time: string; kind: string; location: string; note: string }

const KINDS: { k: string; label: string; c: string }[] = [
  { k: 'appointment', label: 'Appointment', c: G }, { k: 'doctor', label: 'Doctor', c: W }, { k: 'race', label: 'Race', c: A },
  { k: 'event', label: 'Event', c: T2 }, { k: 'other', label: 'Other', c: T2 },
]
const kindOf = (k: string) => KINDS.find(x => x.k === k) ?? (k === 'lab' ? { k, label: 'Labs', c: V } : k === 'milestone' ? { k, label: 'Milestone', c: T2 } : { k, label: 'Event', c: T2 })

const noon = (d: string) => Date.parse(`${d}T12:00:00Z`)
const addDays = (d: string, n: number) => new Date(noon(d) + n * 86_400_000).toISOString().slice(0, 10)
const diff = (a: string, b: string) => Math.round((noon(a) - noon(b)) / 86_400_000)
const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Date(noon(d)).toLocaleDateString('en-US', { timeZone: 'UTC', ...o })
const medium = (d: string) => fmt(d, { month: 'short', day: 'numeric', year: 'numeric' })
const clock = (t: string | null) => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}` }
/** "Today", "Tomorrow", "in 5 days", "3 days ago" */
export const until = (n: number) => (n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n > 0 ? `in ${n} days` : n === -1 ? 'Yesterday' : `${-n} days ago`)
const newId = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

async function api(path: string, method: string, body?: unknown) {
  const r = await fetch(path, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error ?? `Server error ${r.status}`)
  return j
}

function Chip({ kind }: { kind: string }) {
  const k = kindOf(kind)
  return <span style={{ fontSize: '11px', color: k.c, border: `1px solid color-mix(in oklch, ${k.c} 35%, transparent)`, borderRadius: '999px', padding: '1px 8px', whiteSpace: 'nowrap' }}>{k.label}</span>
}

/** Overview card: the next 14 days (today included). */
export function UpcomingCard({ items, onOpen }: { items: CalItem[]; onOpen: () => void }) {
  const next = items.filter(i => i.daysTo >= 0 && i.daysTo <= 14)
  return (
    <section style={{ ...CARD, display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <div style={TITLE}>Next 2 weeks</div>
        <button onClick={onOpen} style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 0, fontFamily: PLEX, fontSize: '12px', color: A }}>Calendar →</button>
      </div>
      {next.length ? (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {next.map(i => (
            <div key={i.id} style={{ display: 'grid', gridTemplateColumns: '52px minmax(0,1fr) auto', gap: '12px', alignItems: 'center', padding: '9px 0', borderTop: `1px solid ${LINE}` }}>
              <div style={{ lineHeight: 1.15 }}>
                <div style={{ fontSize: '11px', color: T3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{fmt(i.date, { weekday: 'short' })}</div>
                <div style={{ fontSize: '13px', color: T2, fontVariantNumeric: 'tabular-nums' }}>{fmt(i.date, { month: 'short', day: 'numeric' })}</div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '14px', color: T1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.title}</div>
                <div style={{ fontSize: '12px', color: kindOf(i.kind).c, marginTop: '2px' }}>{kindOf(i.kind).label}{i.time ? <span style={{ color: T3 }}> · {clock(i.time)}</span> : null}</div>
              </div>
              <span style={{ fontSize: '12px', color: i.daysTo <= 1 ? A : T2, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{until(i.daysTo)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: '13px', color: T3, borderTop: `1px solid ${LINE}`, paddingTop: '12px' }}>
          Nothing in the next 2 weeks.{' '}
          <button onClick={onOpen} style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 0, fontFamily: PLEX, fontSize: '13px', color: A }}>Add an event</button>
        </div>
      )}
      {next.length ? null : (() => { const later = items.find(i => i.daysTo > 14); return later ? <div style={{ fontSize: '12px', color: T3 }}>Next: {later.title}, {until(later.daysTo)}</div> : null })()}
    </section>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CalendarPage({ D }: { D: any }) {
  const today: string = D.today
  const [items, setItems] = useState<CalItem[]>(() => D.calendar ?? [])
  useEffect(() => setItems(D.calendar ?? []), [D.calendar])
  const [month, setMonth] = useState(() => today.slice(0, 7))
  const [day, setDay] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [showPast, setShowPast] = useState(false)

  const upcoming = items.filter(i => i.daysTo >= 0)
  const past = items.filter(i => i.daysTo < 0).reverse()
  const byDay = useMemo(() => { const m = new Map<string, CalItem[]>(); for (const i of items) m.set(i.date, [...(m.get(i.date) ?? []), i]); return m }, [items])

  // Month grid, Monday first, whole weeks.
  const first = `${month}-01`, lead = (new Date(noon(first)).getUTCDay() + 6) % 7
  const daysIn = new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0)).getUTCDate()
  const cells = Array.from({ length: Math.ceil((lead + daysIn) / 7) * 7 }, (_, i) => addDays(first, i - lead))
  const shift = (n: number) => { const d = new Date(noon(first)); d.setUTCMonth(d.getUTCMonth() + n); setMonth(d.toISOString().slice(0, 7)); setDay(null) }

  const open = (i: CalItem | null, date?: string) => {
    setErr(null)
    setDraft(i ? { id: i.id, title: i.title, date: i.date, time: i.time ?? '', kind: i.kind, location: i.location, note: i.note }
      : { id: null, title: '', date: date ?? (day && day >= today ? day : today), time: '', kind: 'appointment', location: '', note: '' })
  }
  const reload = () => window.dispatchEvent(new Event('fitlabs:data'))
  const save = async () => {
    if (!draft) return
    if (!draft.title.trim()) return setErr('Give the event a title.')
    setBusy(true); setErr(null)
    try {
      const id = draft.id ?? newId()
      const { event } = await api(`/api/calendar/${id}`, 'PUT', { title: draft.title, date: draft.date, time: draft.time || null, kind: draft.kind, location: draft.location, note: draft.note })
      const it: CalItem = { ...event, dateL: medium(event.date), daysTo: diff(event.date, today), source: 'you' }
      setItems(list => [...list.filter(x => x.id !== id), it].sort((a, b) => (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? '')) || a.title.localeCompare(b.title)))
      setDraft(null); setMonth(event.date.slice(0, 7)); setDay(event.date); reload()
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  const remove = async () => {
    if (!draft?.id || !confirm(`Delete "${draft.title}"?`)) return
    setBusy(true)
    try { await api(`/api/calendar/${draft.id}`, 'DELETE'); setItems(list => list.filter(x => x.id !== draft.id)); setDraft(null); reload() }
    catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  const Row = ({ i }: { i: CalItem }) => {
    const mine = i.source === 'you'
    return (
      <div className={mine ? 'cal-row' : undefined} onClick={mine ? () => open(i) : undefined} title={mine ? 'Edit' : i.source === 'roadmap' ? 'From your roadmap (edit it on Roadmap)' : 'From your nutrition protocol'}
        style={{ display: 'grid', gridTemplateColumns: '64px minmax(0,1fr) auto', gap: '14px', alignItems: 'center', padding: '11px 6px', borderTop: `1px solid ${LINE}` }}>
        <div style={{ lineHeight: 1.15 }}>
          <div style={{ fontSize: '11px', color: T3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{fmt(i.date, { weekday: 'short' })}</div>
          <div style={{ fontSize: '15px', color: T1, fontFamily: GROTESK, fontVariantNumeric: 'tabular-nums' }}>{fmt(i.date, { month: 'short', day: 'numeric' })}</div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '15px', color: T1 }}>{i.title}</span><Chip kind={i.kind} />
          </div>
          {i.time || i.location || i.note || !mine ? (
            <div style={{ fontSize: '12px', color: T2, marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {[clock(i.time), i.location, i.note, mine ? '' : i.source === 'roadmap' ? 'From your roadmap' : 'From your protocol'].filter(Boolean).join(' · ')}
            </div>
          ) : null}
        </div>
        <span style={{ fontSize: '13px', color: i.daysTo >= 0 && i.daysTo <= 1 ? A : T2, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{until(i.daysTo)}</span>
      </div>
    )
  }

  const groups = useMemo(() => { const g: [string, CalItem[]][] = []; for (const i of upcoming) { const k = fmt(i.date, { month: 'long', year: 'numeric' }); const last = g.at(-1); if (last && last[0] === k) last[1].push(i); else g.push([k, [i]]) } return g }, [upcoming])
  const dayItems = day ? byDay.get(day) ?? [] : []
  const set = (k: keyof Draft) => (e: { target: { value: string } }) => setDraft(d => (d ? { ...d, [k]: e.target.value } : d))

  return (
    <div data-screen-label="calendar" style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: PLEX }}>
      <style>{CSS}</style>

      {/* Countdowns: the next few items, days left in big numbers. */}
      <section style={{ ...CARD, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={TITLE}>Coming up</div>
          <button className="cal-btn pri" onClick={() => open(null)}>+ Add event</button>
        </div>
        {upcoming.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,150px),1fr))', gap: '10px' }}>
            {upcoming.slice(0, 4).map(i => (
              <div key={i.id} onClick={i.source === 'you' ? () => open(i) : undefined} className={i.source === 'you' ? 'cal-row' : undefined}
                style={{ border: `1px solid ${LINE}`, borderRadius: '14px', padding: '14px 16px', background: 'oklch(0.165 0.017 262)', display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontFamily: GROTESK, fontSize: i.daysTo <= 1 ? '24px' : '34px', fontWeight: 500, color: i.daysTo <= 1 ? A : T1, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {i.daysTo <= 1 ? until(i.daysTo) : i.daysTo}
                  </span>
                  {i.daysTo > 1 ? <span style={{ fontSize: '12px', color: T3 }}>days left</span> : null}
                </div>
                <div style={{ fontSize: '14px', color: T1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', color: T2 }}>{fmt(i.date, { weekday: 'short', month: 'short', day: 'numeric' })}{i.time ? ` · ${clock(i.time)}` : ''}</span><Chip kind={i.kind} />
                </div>
              </div>
            ))}
          </div>
        ) : <div style={{ fontSize: '13px', color: T3 }}>Nothing coming up. Add an appointment, a doctor consultation or anything else you want to count down to.</div>}
      </section>

      {draft ? (
        <section style={{ ...CARD, display: 'flex', flexDirection: 'column', gap: '14px', borderColor: 'oklch(0.82 0.13 210 / 0.28)' }}>
          <div style={TITLE}>{draft.id ? 'Edit event' : 'New event'}</div>
          <input className="cal-in" placeholder="Title (e.g. Cardiology follow-up)" value={draft.title} onChange={set('title')} autoFocus maxLength={200}
            onKeyDown={e => { if (e.key === 'Enter') void save() }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,150px),1fr))', gap: '10px' }}>
            <label style={{ fontSize: '12px', color: T3, display: 'flex', flexDirection: 'column', gap: '5px' }}>Date<input className="cal-in" type="date" value={draft.date} onChange={set('date')} /></label>
            <label style={{ fontSize: '12px', color: T3, display: 'flex', flexDirection: 'column', gap: '5px' }}>Time (optional)<input className="cal-in" type="time" value={draft.time} onChange={set('time')} /></label>
            <label style={{ fontSize: '12px', color: T3, display: 'flex', flexDirection: 'column', gap: '5px' }}>Type
              <select className="cal-in" value={draft.kind} onChange={set('kind')}>{KINDS.map(k => <option key={k.k} value={k.k}>{k.label}</option>)}</select>
            </label>
          </div>
          <input className="cal-in" placeholder="Location (optional)" value={draft.location} onChange={set('location')} maxLength={200} />
          <textarea className="cal-in" placeholder="Notes (optional): what to bring, questions to ask…" value={draft.note} onChange={set('note')} rows={3} maxLength={4000} style={{ resize: 'vertical' }} />
          {err ? <div style={{ fontSize: '13px', color: 'oklch(0.7 0.18 25)' }}>{err}</div> : null}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="cal-btn pri" disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save'}</button>
            <button className="cal-btn" disabled={busy} onClick={() => setDraft(null)}>Cancel</button>
            {draft.id ? <button className="cal-btn" disabled={busy} onClick={() => void remove()} style={{ marginLeft: 'auto', color: 'oklch(0.7 0.18 25)' }}>Delete</button> : null}
          </div>
        </section>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: '16px', alignItems: 'start' }}>
        {/* Month grid */}
        <section style={{ ...CARD, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <div style={TITLE}>{fmt(first, { month: 'long', year: 'numeric' })}</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="cal-btn" onClick={() => shift(-1)} aria-label="Previous month">‹</button>
              {month !== today.slice(0, 7) ? <button className="cal-btn" onClick={() => { setMonth(today.slice(0, 7)); setDay(null) }}>Today</button> : null}
              <button className="cal-btn" onClick={() => shift(1)} aria-label="Next month">›</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: '4px' }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <div key={d} style={{ fontSize: '11px', color: T3, textAlign: 'center', padding: '2px 0 6px', letterSpacing: '0.04em' }}>{d}</div>)}
            {cells.map(d => {
              const inMonth = d.startsWith(month), evs = byDay.get(d) ?? [], isToday = d === today, sel = d === day
              return (
                <div key={d} className="cal-cell" onClick={() => setDay(sel ? null : d)}
                  style={{ minHeight: '74px', borderRadius: '10px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0, opacity: inMonth ? 1 : 0.35,
                    border: `1px solid ${sel ? 'oklch(0.82 0.13 210 / 0.5)' : 'oklch(1 0 0 / 0.04)'}`, background: sel ? 'oklch(0.82 0.13 210 / 0.08)' : undefined }}>
                  <span style={{ fontSize: '12px', fontVariantNumeric: 'tabular-nums', alignSelf: 'flex-start', color: isToday ? 'oklch(0.15 0.02 262)' : d < today ? T3 : T2,
                    background: isToday ? A : 'transparent', borderRadius: '999px', padding: isToday ? '0 6px' : 0, fontWeight: isToday ? 600 : 400 }}>{+d.slice(8)}</span>
                  {evs.slice(0, 2).map(e => (
                    <span key={e.id} className="cal-pill" style={{ fontSize: '10.5px', color: kindOf(e.kind).c, background: `color-mix(in oklch, ${kindOf(e.kind).c} 12%, transparent)`, borderRadius: '5px', padding: '1px 5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</span>
                  ))}
                  {evs.length > 2 ? <span className="cal-pill" style={{ fontSize: '10.5px', color: T3 }}>+{evs.length - 2} more</span> : null}
                  {evs.length ? <span className="cal-dots" style={{ display: 'none', gap: '3px', flexWrap: 'wrap' }}>{evs.slice(0, 4).map(e => <span key={e.id} style={{ width: '6px', height: '6px', borderRadius: '50%', background: kindOf(e.kind).c }} />)}</span> : null}
                </div>
              )
            })}
          </div>
          {day ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', paddingBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: T1 }}>{fmt(day, { weekday: 'long', month: 'long', day: 'numeric' })} <span style={{ color: T3 }}>· {until(diff(day, today))}</span></span>
                <button className="cal-btn" onClick={() => open(null, day)}>+ Add</button>
              </div>
              {dayItems.length ? dayItems.map(i => <Row key={i.id} i={i} />) : <div style={{ fontSize: '13px', color: T3, borderTop: `1px solid ${LINE}`, paddingTop: '10px' }}>Nothing on this day.</div>}
            </div>
          ) : null}
        </section>

        {/* Everything upcoming, by month */}
        <section style={{ ...CARD, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ ...TITLE, paddingBottom: '6px' }}>All upcoming <span style={{ color: T3, fontWeight: 400 }}>· {upcoming.length}</span></div>
          {groups.length ? groups.map(([m, list]) => (
            <Fragment key={m}>
              <div style={{ fontSize: '11px', color: T3, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '12px 6px 4px' }}>{m}</div>
              {list.map(i => <Row key={i.id} i={i} />)}
            </Fragment>
          )) : <div style={{ fontSize: '13px', color: T3 }}>No upcoming events.</div>}
          {past.length ? (
            <>
              <button className="cal-btn" style={{ alignSelf: 'flex-start', marginTop: '12px' }} onClick={() => setShowPast(s => !s)}>{showPast ? 'Hide past events' : `Past events (${past.length})`}</button>
              {showPast ? past.map(i => <div key={i.id} style={{ opacity: 0.7 }}><Row i={i} /></div>) : null}
            </>
          ) : null}
        </section>
      </div>
    </div>
  )
}
