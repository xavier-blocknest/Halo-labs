// Journal page, ported from Claude Design ("Journal.dc.html"): entries grouped by month with search on the left, the
// open entry on the right. Plain entries are edited in place and saved as you type; "Format as document" turns a
// pasted letter into the formatted view (sender, tags, TL;DR, sections in the original wording) via /api/journal.
// Everything comes from the encrypted journal records (D.journal); nothing on this page is sample content.
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'

const T1 = 'oklch(0.96 0.005 250)', T2 = 'oklch(0.74 0.015 255)', T3 = 'oklch(0.58 0.015 255)', A = 'oklch(0.82 0.13 210)'
const SERIF = "'IBM Plex Serif',Georgia,serif", GROTESK = "'Space Grotesk',system-ui,sans-serif"
const CSS = `
.jr-in::placeholder,.jr-ta::placeholder{color:oklch(0.5 0.015 255)}
.jr-new:hover{background:oklch(0.82 0.13 210 / 0.1)}
.jr-item:hover{background:oklch(1 0 0 / 0.04)}
.jr-btn:hover{color:${T1};border-color:oklch(1 0 0 / 0.16)}
@keyframes jIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
@media (max-width: 760px){ .jr-wrap[data-view="list"] .jr-main{display:none!important} .jr-wrap[data-view="entry"] .jr-aside{display:none!important} .jr-aside{max-width:none!important;border-right:0!important} }
@media (min-width: 761px){ .jr-back{display:none!important} }
`

type Block = { type: 'h' | 'p' | 'sig'; t: string; lead?: string }
type Workout = {
  id: string; day: string; start: string; sport: string; name?: string; time?: string; min?: number
  mi?: number | null; yd?: number | null; strain?: number | null; avgHr?: number | null; missing?: true
}
type Entry = {
  id: string; date: string; time?: string | null; title: string; body: string; note?: string; updated: string
  workouts?: Workout[]
  doc?: { from: string; tags: string[]; tldr: { k: string; v: string }[]; blocks: Block[] } | null
}

const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', ...o })
const newId = () => 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
const SPORT: Record<string, string> = { run: 'Run', ride: 'Ride', swim: 'Swim', walk: 'Walk', strength: 'Lift', other: 'Workout' }
const workoutLine = (w: Workout) => w.missing ? 'No longer in your data'
  : [w.time, w.mi != null ? `${w.mi} mi` : w.yd != null ? `${w.yd.toLocaleString()} yd` : null, w.min ? `${w.min} min` : null, w.strain != null ? `strain ${w.strain}` : null, w.avgHr ? `${w.avgHr} bpm avg` : null].filter(Boolean).join(' · ')
const preview = (e: Entry) => (e.doc ? (e.doc.blocks.find(b => b.type === 'p' && b.t.length > 120) ?? e.doc.blocks.find(b => b.type === 'p'))?.t ?? '' : e.body) || 'No text yet'

async function api(path: string, method: string, body?: unknown) {
  const r = await fetch(path, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error ?? `Server error ${r.status}`)
  return j
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function JournalPage({ D }: { D: any }) {
  const [entries, setEntries] = useState<Entry[]>(() => D.journal ?? [])
  const [sel, setSel] = useState<string | null>(() => (D.journal ?? [])[0]?.id ?? null)
  const [view, setView] = useState<'list' | 'entry'>('list')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'' | 'saving' | 'saved' | 'formatting'>('')
  const [err, setErr] = useState<string | null>(null)
  const [picker, setPicker] = useState<{ for: string; list: Workout[] | null } | null>(null)
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const pending = useRef(new Map<string, Partial<Entry>>())
  const refresh = useRef<ReturnType<typeof setTimeout> | null>(null)

  // The coach reads the journal from the dashboard data: reload it a little after edits settle.
  const touch = () => { if (refresh.current) clearTimeout(refresh.current); refresh.current = setTimeout(() => window.dispatchEvent(new Event('halolabs:data')), 3000) }
  const flush = async (id: string) => {
    const patch = pending.current.get(id); pending.current.delete(id); timers.current.delete(id)
    if (!patch) return
    try { await api(`/api/journal/${id}`, 'PUT', patch); setStatus('saved'); touch() } catch (e) { setErr((e as Error).message); setStatus('') }
  }
  useEffect(() => () => { for (const id of [...pending.current.keys()]) void flush(id) }, []) // save on leaving the page

  const edit = (id: string, patch: Partial<Entry>) => {
    setEntries(list => list.map(e => (e.id === id ? { ...e, ...patch } : e)))
    pending.current.set(id, { ...pending.current.get(id), ...patch }); setStatus('saving'); setErr(null)
    clearTimeout(timers.current.get(id)); timers.current.set(id, setTimeout(() => void flush(id), 700))
  }
  const create = async () => {
    const id = newId(), e: Entry = { id, date: D.today, title: '', body: '', note: '', updated: new Date().toISOString() }
    setEntries(list => [e, ...list]); setSel(id); setQ(''); setView('entry'); setErr(null)
    try { await api(`/api/journal/${id}`, 'PUT', { date: e.date, title: '', body: '' }); touch() } catch (x) { setErr((x as Error).message) }
  }
  const remove = async (id: string) => {
    if (!window.confirm('Delete this entry?')) return
    clearTimeout(timers.current.get(id)); pending.current.delete(id)
    try { await api(`/api/journal/${id}`, 'DELETE'); setEntries(list => list.filter(e => e.id !== id)); setSel(null); setView('list'); touch() } catch (x) { setErr((x as Error).message) }
  }
  const format = async (id: string) => {
    await flush(id); setStatus('formatting'); setErr(null)
    try { const { entry } = await api(`/api/journal/${id}/format`, 'POST'); setEntries(list => list.map(e => (e.id === id ? entry : e))); setStatus('saved'); touch() }
    catch (x) { setErr((x as Error).message); setStatus('') }
  }

  // Linking saves right away (not debounced): the server checks each workout and returns the entry with them resolved.
  const setWorkouts = async (id: string, ids: string[]) => {
    await flush(id); setErr(null)
    try { const { entry } = await api(`/api/journal/${id}`, 'PUT', { workouts: ids }); setEntries(list => list.map(e => (e.id === id ? { ...e, workouts: entry.workouts } : e))); setStatus('saved'); touch() }
    catch (x) { setErr((x as Error).message) }
  }
  const openPicker = async (e: Entry) => {
    if (picker?.for === e.id) return setPicker(null)
    setPicker({ for: e.id, list: null })
    try { const { workouts } = await api(`/api/journal/workouts?day=${e.date}`, 'GET'); setPicker(p => (p?.for === e.id ? { for: e.id, list: workouts } : p)) }
    catch (x) { setErr((x as Error).message); setPicker(null) }
  }

  const list = useMemo(() => {
    const s = q.trim().toLowerCase(), textOf = (e: Entry) => (e.doc ? e.doc.blocks.map(b => b.t).join(' ') + ' ' + e.doc.from : e.body) + ' ' + (e.workouts ?? []).map(w => w.name ?? '').join(' ')
    return [...entries].sort((a, b) => (b.date + (b.time ?? '')).localeCompare(a.date + (a.time ?? '')))
      .filter(e => !s || `${e.title} ${textOf(e)} ${e.note ?? ''}`.toLowerCase().includes(s))
  }, [entries, q])
  const groups = useMemo(() => {
    const out: { label: string; items: Entry[] }[] = []
    for (const e of list) { const label = fmt(e.date, { month: 'long', year: 'numeric' }); const g = out.find(x => x.label === label); if (g) g.items.push(e); else out.push({ label, items: [e] }) }
    return out
  }, [list])
  const cur = entries.find(e => e.id === sel) ?? null
  const dateLabel = (e: Entry) => fmt(e.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) + (e.time ? ` · ${e.time}` : '')
  const btn = { cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', padding: '4px 10px', borderRadius: '7px', border: '1px solid oklch(1 0 0 / 0.08)', background: 'transparent', color: T3 } as const

  return (
    <div className="jr-wrap" data-screen-label="journal" data-view={view} style={{ minHeight: 'calc(100vh - 170px)', display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', borderRadius: '18px', overflow: 'hidden', border: '1px solid oklch(1 0 0 / 0.07)', background: 'oklch(0.145 0.016 262)' }}>
      <style>{CSS}</style>
      <aside className="jr-aside" style={{ flex: '1 1 280px', maxWidth: '340px', minWidth: 0, borderRight: '1px solid oklch(1 0 0 / 0.06)', background: 'oklch(0.16 0.017 262)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '22px 20px 14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: GROTESK, fontSize: '20px', letterSpacing: '-0.02em', color: T1 }}>Journal</span>
            <button className="jr-new" onClick={create} aria-label="New entry" style={{ cursor: 'pointer', width: '32px', height: '32px', borderRadius: '9px', border: '1px solid oklch(1 0 0 / 0.1)', background: 'transparent', color: A, fontSize: '18px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
          </div>
          <input className="jr-in" value={q} onChange={e => setQ(e.target.value)} placeholder="Search entries" style={{ fontFamily: 'inherit', fontSize: '13px', color: T1, background: 'oklch(1 0 0 / 0.04)', border: '1px solid oklch(1 0 0 / 0.07)', borderRadius: '9px', padding: '8px 11px', outline: 'none' }} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 20px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {groups.map(g => (
            <Fragment key={g.label}>
              <span style={{ fontSize: '11.5px', color: T3, padding: '14px 10px 6px' }}>{g.label}</span>
              {g.items.map(e => {
                const on = e.id === sel
                return (
                  <button key={e.id} className="jr-item" onClick={() => { setSel(e.id); setView('entry'); setErr(null); setStatus('') }} style={{ cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px', padding: '11px 12px', borderRadius: '10px', border: 0, background: on ? 'oklch(0.82 0.13 210 / 0.1)' : 'transparent', transition: 'background .15s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'baseline', width: '100%' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 500, color: on ? T1 : 'oklch(0.88 0.008 250)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title || 'Untitled'}</span>
                      <span style={{ flex: 'none', fontSize: '11.5px', color: T3 }}>{fmt(e.date, { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <span style={{ fontSize: '12.5px', lineHeight: 1.45, color: 'oklch(0.66 0.015 255)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{preview(e)}</span>
                    <span style={{ fontSize: '11px', color: e.doc ? A : T3 }}>{e.doc ? e.doc.from : 'You'}{e.workouts?.length ? <span style={{ color: T3 }}> · {e.workouts.length === 1 ? e.workouts[0].name ?? '1 workout' : `${e.workouts.length} workouts`}</span> : null}</span>
                  </button>
                )
              })}
            </Fragment>
          ))}
          {!list.length ? <span style={{ fontSize: '12.5px', color: T3, padding: '16px 10px' }}>{entries.length ? 'No entries match.' : 'No entries yet. Press + to write one, or paste what your doctor sent.'}</span> : null}
        </div>
      </aside>

      <main className="jr-main" style={{ flex: '3 1 520px', minWidth: 0, display: 'flex', justifyContent: 'center', padding: 'clamp(28px,6vw,80px) clamp(20px,5vw,64px) 120px' }}>
        {cur ? (
          <article key={cur.id} style={{ width: '100%', maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '10px', animation: 'jIn .25s ease-out' }}>
            <button className="jr-back" onClick={() => setView('list')} style={{ ...btn, alignSelf: 'flex-start', marginBottom: '8px', color: A, borderColor: 'oklch(0.82 0.13 210 / 0.3)' }}>‹ Journal</button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '12.5px', color: T3 }}>
              <span>{dateLabel(cur)}</span>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ color: T3 }}>{status === 'saving' ? 'Saving…' : status === 'formatting' ? 'Formatting with Claude…' : status === 'saved' ? 'Saved' : ''}</span>
                {!cur.doc && cur.body.trim().length >= 80 ? <button className="jr-btn" disabled={status === 'formatting'} onClick={() => format(cur.id)} style={{ ...btn, color: A, borderColor: 'oklch(0.82 0.13 210 / 0.3)' }}>Format as document</button> : null}
                <button className="jr-btn" onClick={() => remove(cur.id)} style={btn}>Delete</button>
              </div>
            </div>
            {err ? <span style={{ fontSize: '12.5px', color: 'oklch(0.7 0.18 25)' }}>{err}</span> : null}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              {(cur.workouts ?? []).map(w => (
                <span key={w.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', maxWidth: '100%', padding: '6px 6px 6px 11px', borderRadius: '10px', background: 'oklch(0.82 0.13 210 / 0.07)', border: '1px solid oklch(0.82 0.13 210 / 0.22)', fontSize: '12.5px' }}>
                  <span style={{ color: A, fontWeight: 500 }}>{SPORT[w.sport] ?? 'Workout'}</span>
                  <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: w.missing ? T3 : T1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.name ?? fmt(w.day, { month: 'short', day: 'numeric' })}{w.day !== cur.date && !w.missing ? <span style={{ color: T3 }}> · {fmt(w.day, { month: 'short', day: 'numeric' })}</span> : null}</span>
                    <span style={{ color: T3, fontSize: '11.5px' }}>{workoutLine(w)}</span>
                  </span>
                  <button className="jr-btn" aria-label="Unlink workout" title="Unlink" onClick={() => setWorkouts(cur.id, (cur.workouts ?? []).filter(x => x.id !== w.id).map(x => x.id))} style={{ ...btn, border: 0, padding: '2px 7px', fontSize: '15px', lineHeight: 1 }}>×</button>
                </span>
              ))}
              <button className="jr-btn" onClick={() => openPicker(cur)} style={{ ...btn, color: A, borderColor: 'oklch(0.82 0.13 210 / 0.3)' }}>{picker?.for === cur.id ? 'Done' : cur.workouts?.length ? '+ Link another workout' : '+ Link workout'}</button>
            </div>
            {picker?.for === cur.id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '8px', borderRadius: '12px', border: '1px solid oklch(1 0 0 / 0.08)', background: 'oklch(0.17 0.017 262)', maxHeight: '320px', overflowY: 'auto' }}>
                {picker.list === null ? <span style={{ fontSize: '12.5px', color: T3, padding: '8px' }}>Loading workouts…</span>
                  : !picker.list.length ? <span style={{ fontSize: '12.5px', color: T3, padding: '8px' }}>No workouts in the week around {fmt(cur.date, { month: 'short', day: 'numeric' })}.</span>
                  : picker.list.map(w => {
                    const ids = (cur.workouts ?? []).map(x => x.id), on = ids.includes(w.id)
                    return (
                      <button key={w.id} className="jr-item" onClick={() => setWorkouts(cur.id, on ? ids.filter(x => x !== w.id) : [...ids, w.id])} style={{ cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'flex', gap: '10px', alignItems: 'center', padding: '9px 10px', borderRadius: '9px', border: 0, background: on ? 'oklch(0.82 0.13 210 / 0.1)' : 'transparent' }}>
                        <span style={{ flex: 'none', width: '16px', color: A }}>{on ? '✓' : ''}</span>
                        <span style={{ flex: 'none', width: '84px', whiteSpace: 'nowrap', fontSize: '11.5px', color: w.day === cur.date ? T1 : T3 }}>{fmt(w.day, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '13px', color: T1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><span style={{ color: A }}>{SPORT[w.sport] ?? 'Workout'}</span> · {w.name}</span>
                          <span style={{ fontSize: '11.5px', color: T3 }}>{workoutLine(w)}</span>
                        </span>
                      </button>
                    )
                  })}
              </div>
            ) : null}

            {!cur.doc ? (
              <>
                <input className="jr-in" value={cur.title} onChange={e => edit(cur.id, { title: e.target.value })} placeholder="Title" style={{ fontFamily: SERIF, fontSize: 'clamp(28px,3.4vw,36px)', fontWeight: 500, letterSpacing: '-0.015em', lineHeight: 1.2, color: T1, background: 'transparent', border: 0, outline: 'none', padding: 0, margin: '4px 0 6px' }} />
                <textarea className="jr-ta" value={cur.body} onChange={e => edit(cur.id, { body: e.target.value })} placeholder="Write, or paste what your doctor sent…" style={{ fontFamily: SERIF, fontSize: '18px', lineHeight: 1.75, color: 'oklch(0.86 0.01 250)', background: 'transparent', border: 0, outline: 'none', padding: 0, resize: 'none', minHeight: '60vh', fieldSizing: 'content' } as React.CSSProperties} />
              </>
            ) : (
              <>
                <h1 style={{ margin: '4px 0 2px', fontFamily: SERIF, fontSize: 'clamp(28px,3.4vw,36px)', fontWeight: 500, letterSpacing: '-0.015em', lineHeight: 1.2, color: T1, textWrap: 'balance' }}>{cur.title || 'Untitled'}</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', padding: '6px 0 22px', borderBottom: '1px solid oklch(1 0 0 / 0.07)', marginBottom: '18px' }}>
                  {cur.doc.from ? <span style={{ fontSize: '13px', color: T2 }}>From <span style={{ color: T1 }}>{cur.doc.from}</span></span> : null}
                  {cur.doc.tags.map(t => <span key={t} style={{ fontSize: '11.5px', padding: '3px 9px', borderRadius: '999px', background: 'oklch(0.82 0.13 210 / 0.1)', color: A }}>{t}</span>)}
                </div>
                {cur.doc.tldr.length ? (
                  <section style={{ margin: '0 0 30px', padding: '20px 22px', borderRadius: '14px', background: 'oklch(0.82 0.13 210 / 0.06)', border: '1px solid oklch(0.82 0.13 210 / 0.22)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <span style={{ fontFamily: GROTESK, fontSize: '12px', fontWeight: 500, letterSpacing: '0.08em', color: A }}>TL;DR</span>
                    {cur.doc.tldr.map((t, i) => (
                      <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'baseline' }}>
                        <span style={{ flex: 'none', width: '5px', height: '5px', borderRadius: '50%', background: A, transform: 'translateY(-3px)' }} />
                        <span style={{ fontFamily: SERIF, fontSize: '16.5px', lineHeight: 1.6, color: 'oklch(0.9 0.008 250)', textWrap: 'pretty' }}><span style={{ fontWeight: 500, color: T1 }}>{t.k}</span> {t.v}</span>
                      </div>
                    ))}
                  </section>
                ) : null}
                {cur.doc.blocks.map((b, i) => (b.type === 'h'
                  ? <h2 key={i} style={{ margin: '36px 0 10px', fontFamily: SERIF, fontSize: 'clamp(22px,2.4vw,26px)', fontWeight: 500, letterSpacing: '-0.01em', lineHeight: 1.3, color: T1, textWrap: 'balance' }}>{b.t}</h2>
                  : b.type === 'sig'
                    ? <p key={i} style={{ margin: '18px 0 0', fontFamily: SERIF, fontSize: '15px', lineHeight: 1.7, color: 'oklch(0.66 0.015 255)', whiteSpace: 'pre-line' }}>{b.t}</p>
                    : <p key={i} style={{ margin: '0 0 14px', fontFamily: SERIF, fontSize: '18px', lineHeight: 1.75, color: 'oklch(0.86 0.01 250)', textWrap: 'pretty' }}>{b.lead ? <span style={{ fontWeight: 500, color: T1 }}>{b.lead} </span> : null}{b.t}</p>))}
                <div style={{ marginTop: '34px', paddingTop: '18px', borderTop: '1px solid oklch(1 0 0 / 0.07)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ fontSize: '12px', color: T3 }}>Your notes on this</span>
                  <textarea className="jr-ta" value={cur.note ?? ''} onChange={e => edit(cur.id, { note: e.target.value })} placeholder="Add a thought, a question for the follow-up, how it's going…" style={{ fontFamily: SERIF, fontSize: '16px', lineHeight: 1.7, fontStyle: 'italic', color: 'oklch(0.86 0.01 250)', background: 'transparent', border: 0, outline: 'none', padding: 0, resize: 'none', minHeight: '80px', fieldSizing: 'content' } as React.CSSProperties} />
                </div>
              </>
            )}
          </article>
        ) : (
          <div style={{ alignSelf: 'center', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', color: T3, fontSize: '14px' }}>
            <span>{entries.length ? 'Pick an entry on the left.' : 'Your journal is empty.'}</span>
            <button className="jr-btn" onClick={create} style={{ ...btn, color: A, borderColor: 'oklch(0.82 0.13 210 / 0.3)', fontSize: '13px', padding: '7px 14px' }}>New entry</button>
          </div>
        )}
      </main>
    </div>
  )
}
