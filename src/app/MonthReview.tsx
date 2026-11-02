// Month in review: a story of one month's highlights across every source (training, bests, lifting, recovery and sleep,
// body and fuel, tests and milestones), each against the month before. Data from GET /api/review (server/dashboard/
// review.ts); a card shows only when its source has something that month.
// It plays like a story: each card advances on its own (the bar on top fills), hold to pause, tap the card (left third
// back, the rest forward) or ←/→ to skip. Every card has its own colour mood; numbers count up and the card's contents arrive one after another.
// With "Reduce motion" on (iOS/macOS) nothing moves or auto-advances.
import React, { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react'
import './month-review.css'
import { isSample } from '../sampleMode'

/* eslint-disable @typescript-eslint/no-explicit-any */
type C = { now: number | null; prev: number | null; pct: number | null }
type R = any
type Card = { id: string; hue: number; hue2: number; el: ReactNode }

const CARD_MS = 7000
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const fmt = (n: number | null | undefined, d = 0) => (n == null ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: d }))
const monthName = (m: string) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1, 15)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })

/** A number that counts up from 0 when its card appears (ease-out, ~1 s). */
function Num({ v, d = 0, delay = 0 }: { v: number | null | undefined; d?: number; delay?: number }) {
  const [x, setX] = useState(() => (v == null || reduced() ? v ?? null : 0))
  useEffect(() => {
    if (v == null || reduced()) { setX(v ?? null); return }
    let raf = 0, t0 = 0
    const tick = (t: number) => { if (!t0) t0 = t + delay; const k = Math.max(0, Math.min(1, (t - t0) / 1000)); setX(v * (1 - (1 - k) ** 3)); if (k < 1) raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [v, delay])
  return <>{fmt(x, d)}</>
}

/** Children arrive one after another: each gets --i for its animation delay. */
const In = ({ i, children, className = '', style }: { i: number; children: ReactNode; className?: string; style?: CSSProperties }) =>
  <div className={'mr-in ' + className} style={{ ...style, ['--i' as string]: i }}>{children}</div>

/** ▲ 3% vs September (neutral, as in Strava's recap: more isn't always better). */
function Delta({ c, prev }: { c: C; prev: string }) {
  if (c.pct == null) return c.now != null && c.prev == null ? <span className="mr-delta new">new</span> : null
  return <span className={'mr-delta ' + (c.pct > 0 ? 'up' : c.pct < 0 ? 'down' : '')}>{c.pct > 0 ? '▲' : c.pct < 0 ? '▼' : '='} {Math.abs(c.pct)}%<small>vs {prev.slice(0, 3)}</small></span>
}

function Stat({ i, k, c, unit, d = 0, prev }: { i: number; k: string; c: C | undefined; unit?: string; d?: number; prev: string }) {
  if (!c || c.now == null) return null
  return (
    <In i={i} className="mr-stat">
      <div><div className="mr-k">{k}</div><div className="mr-v"><Num v={c.now} d={d} delay={i * 90} />{unit && <span>{unit}</span>}</div></div>
      <Delta c={c} prev={prev} />
    </In>)
}

/** Builds the cards for one month, in order, skipping any without data; `i` numbers each card's items for the stagger. */
function cards(r: R, replay: () => void): Card[] {
  const t = r.training, p = r.prevLabel, mon = r.label.split(' ')[0], out: Card[] = []
  out.push({ id: 'cover', hue: 210, hue2: 285, el: (<div className="mr-cover">
    <In i={0} className="mr-eyebrow">Your month in review</In>
    <In i={1} className="mr-title" style={{ ['--len' as string]: mon.length }}>{mon}</In>
    <In i={2} className="mr-year">{r.label.split(' ')[1]}{r.partial ? ' · so far' : ''}</In>
    {t && <In i={3} className="mr-coverline">{[`${t.days.now} active days`, `${fmt(t.hours.now, 1)} hours`, r.bests.length ? `${r.bests.length} personal best${r.bests.length === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ')}</In>}
    <In i={4} className="mr-hint">Tap to begin</In>
  </div>) })
  if (t) {
    const cal = t.calendar as { day: string; active: boolean; future: boolean }[], pad = (new Date(cal[0].day + 'T12:00:00Z').getUTCDay() + 6) % 7
    out.push({ id: 'days', hue: 205, hue2: 175, el: (<>
      <In i={0} className="mr-eyebrow">Active days</In>
      <In i={1} className="mr-big"><Num v={t.days.now} /><span>of {cal.length} days{t.days.now === cal.filter(c => !c.future).length && t.days.now > 0 ? ': every single one' : ''}</span></In>
      <In i={2}>
        <div className="mr-cal">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, k) => <b key={k}>{d}</b>)}
          {Array.from({ length: pad }, (_, k) => <i key={'p' + k} className="pad" />)}
          {cal.map((d, k) => <i key={d.day} className={d.future ? 'f' : d.active ? 'a' : ''} style={{ ['--d' as string]: k }} title={d.day} />)}</div>
      </In>
      {t.days.prev ? <In i={3} className="mr-line">{t.days.now >= t.days.prev ? 'Up' : 'Down'} from {t.days.prev} in {p}.</In> : null}
    </>) })
    out.push({ id: 'training', hue: 250, hue2: 210, el: (<>
      <In i={0} className="mr-eyebrow">Training</In>
      {t.topSport && <In i={1} className="mr-hero"><div className="mr-k">Top sport</div><div className="mr-word">{t.topSport.label}</div><div className="mr-k"><Num v={t.topSport.hours} d={1} delay={200} /> hours</div></In>}
      <Stat i={2} k="Sessions" c={t.sessions} prev={p} />
      <Stat i={3} k="Total time" c={t.hours} unit="hrs" d={1} prev={p} />
      <Stat i={4} k="Running" c={t.runMi} unit="mi" d={1} prev={p} />
      <Stat i={5} k="Swimming" c={t.swimYd} unit="yd" prev={p} />
      <Stat i={6} k="Cycling" c={t.rideMi} unit="mi" d={1} prev={p} />
      <Stat i={7} k="Walking" c={t.walkMi} unit="mi" d={1} prev={p} />
      <Stat i={8} k="Elevation" c={t.elevFt} unit="ft" prev={p} />
    </>) })
    const big = [t.longestRun && ['Longest run', t.longestRun], t.longestSwim && ['Longest swim', t.longestSwim], t.longestRide && ['Longest ride', t.longestRide]].filter(Boolean) as [string, any][]
    const maxN = Math.max(1, ...t.bySport.map((s: any) => s.n))
    if (big.length || t.hardest) out.push({ id: 'big', hue: 30, hue2: 350, el: (<>
      <In i={0} className="mr-eyebrow">Biggest sessions</In>
      {t.hardest && <In i={1} className="mr-hero"><div className="mr-k">Highest strain</div><div className="mr-word"><Num v={t.hardest.strain} d={1} delay={150} /></div><div className="mr-k">{t.hardest.name} · {t.hardest.dayL}</div></In>}
      {big.map(([k, x], j) => <In key={k} i={2 + j} className="mr-row stack"><div className="mr-k">{k}</div><div className="mr-v sm">{x.v}</div><div className="mr-sub">{x.name} · {x.dayL}</div></In>)}
      <In i={2 + big.length} className="mr-bars-h">{t.bySport.filter((s: any) => s.n).map((s: any, j: number) => (
        <div key={s.sport}><span>{s.label}</span><i style={{ ['--w' as string]: `${(s.n / maxN) * 100}%`, ['--d' as string]: j }} /><b>{s.n}</b></div>))}</In>
    </>) })
  }
  if (r.bests.length) out.push({ id: 'bests', hue: 85, hue2: 55, el: (<>
    <In i={0} className="mr-eyebrow">Personal bests</In>
    <In i={1} className="mr-big gold"><Num v={r.bests.length} /><span>{r.bests.length === 1 ? 'new best that still stands' : 'new bests that still stand'}</span></In>
    <div className="mr-list">{r.bests.slice(0, 7).map((b: any, j: number) => <In key={b.k} i={2 + j}><span>{b.k}</span><b>{b.v}</b><small>{b.dayL}</small></In>)}</div>
    {r.bests.length > 7 && <In i={9} className="mr-line">and {r.bests.length - 7} more.</In>}
  </>) })
  if (r.lifting) out.push({ id: 'lifting', hue: 330, hue2: 290, el: (<>
    <In i={0} className="mr-eyebrow">Lifting</In>
    {r.lifting.lb.now != null && <In i={1} className="mr-hero"><div className="mr-k">Weight lifted</div><div className="mr-valrow"><div className="mr-word"><Num v={r.lifting.lb.now} delay={150} /><span> lb</span></div><Delta c={r.lifting.lb} prev={p} /></div></In>}
    <Stat i={2} k="Sets" c={r.lifting.sets} prev={p} />
    <Stat i={3} k="Reps" c={r.lifting.reps} prev={p} />
    {r.lifting.top.length > 0 && <div className="mr-list">{r.lifting.top.map((x: any, j: number) => <In key={x.name} i={4 + j}><span>{x.name}</span><b>{fmt(x.lb)} lb</b></In>)}</div>}
  </>) })
  const rc = r.recovery
  if (rc) {
    const days = rc.green + rc.yellow + rc.red
    out.push({ id: 'recovery', hue: 160, hue2: 195, el: (<>
      <In i={0} className="mr-eyebrow">Recovery and sleep</In>
      {rc.recovery.now != null && <In i={1} className="mr-ringrow">
        <svg className="mr-ring" viewBox="0 0 120 120" aria-hidden><circle cx="60" cy="60" r="52" /><circle cx="60" cy="60" r="52" className="v" style={{ ['--p' as string]: rc.recovery.now / 100 }} /></svg>
        <div><div className="mr-k">Average recovery</div><div className="mr-valrow"><div className="mr-word"><Num v={rc.recovery.now} delay={150} /><span>%</span></div><Delta c={rc.recovery} prev={p} /></div></div>
      </In>}
      {days > 0 && <In i={2} className="mr-rec">
        {rc.green > 0 && <i className="g" style={{ ['--f' as string]: rc.green / days }}>{rc.green} green</i>}
        {rc.yellow > 0 && <i className="y" style={{ ['--f' as string]: rc.yellow / days }}>{rc.yellow} yellow</i>}
        {rc.red > 0 && <i className="r" style={{ ['--f' as string]: rc.red / days }}>{rc.red} red</i>}
      </In>}
      <Stat i={3} k="HRV" c={rc.hrv} unit="ms" d={1} prev={p} />
      <Stat i={4} k="Resting heart rate" c={rc.rhr} unit="bpm" d={1} prev={p} />
      <Stat i={5} k="Sleep a night" c={rc.sleepH} unit="hrs" d={1} prev={p} />
      <Stat i={6} k="Sleep performance" c={rc.sleepPerf} unit="%" prev={p} />
      {rc.bestDay && <In i={7} className="mr-line">Best recovery: <b>{rc.bestDay.v}%</b> on {rc.bestDay.dayL}.</In>}
    </>) })
    if (rc.work.length) out.push({ id: 'work', hue: 185, hue2: 230, el: (<>
      <In i={0} className="mr-eyebrow">Recovery work</In>
      <In i={1} className="mr-big"><Num v={rc.work.reduce((a: number, w: any) => a + w.n, 0)} /><span>sessions · {fmt(rc.work.reduce((a: number, w: any) => a + w.min, 0))} minutes</span></In>
      <div className="mr-list">{rc.work.map((w: any, j: number) => <In key={w.name} i={2 + j}><span>{w.name}</span><b>{w.n}×</b><small>{w.min} min · {w.prevN} in {p}</small></In>)}</div>
      <Stat i={2 + rc.work.length} k="Average day strain" c={rc.strain} d={1} prev={p} />
    </>) })
  }
  const b = r.body
  if (b) out.push({ id: 'body', hue: 60, hue2: 25, el: (<>
    <In i={0} className="mr-eyebrow">Body and fuel</In>
    {b.weight && <In i={1} className="mr-hero"><div className="mr-k">{b.weight.trend ? 'Weight (trend)' : 'Weight'}</div>
      <div className="mr-valrow"><div className="mr-word"><Num v={b.weight.to} d={1} delay={150} /><span> lb</span></div>
      {b.weight.change != null && <span className={'mr-delta ' + (b.weight.change > 0 ? 'up' : b.weight.change < 0 ? 'down' : '')}>{b.weight.change > 0 ? '▲' : b.weight.change < 0 ? '▼' : '='} {fmt(Math.abs(b.weight.change), 1)} lb<small>over the month</small></span>}</div></In>}
    {b.dexa.map((d: any, j: number) => <In key={d.dayL} i={2 + j} className="mr-row stack"><div className="mr-k">DEXA scan · {d.dayL}</div><div className="mr-v sm">{fmt(d.bodyFatPct, 1)}<span>% body fat</span></div><div className="mr-sub">{fmt(d.leanLb, 1)} lb lean · {fmt(d.totalLb, 1)} lb total</div></In>)}
    <Stat i={3} k="Days logged (MacroFactor)" c={b.daysLogged} prev={p} />
    <Stat i={4} k="Calories a day" c={b.kcal} unit="kcal" prev={p} />
    <Stat i={5} k="Protein a day" c={b.protein} unit="g" prev={p} />
    <Stat i={6} k="Saturated fat a day" c={b.satFat} unit="g" d={1} prev={p} />
  </>) })
  if (r.tests || r.milestones.length || r.journal) out.push({ id: 'more', hue: 270, hue2: 210, el: (<>
    <In i={0} className="mr-eyebrow">Also in {mon}</In>
    {r.tests?.labs.map((l: any, j: number) => <In key={l.dayL} i={1 + j} className="mr-hero"><div className="mr-k">Labs · {l.lab} · {l.dayL}</div>
      <div className="mr-word"><Num v={l.n} /><span> results</span></div><div className="mr-k">{l.flagged.length} out of range</div></In>)}
    {r.tests?.vo2.map((v: any, j: number) => <In key={v.dayL} i={2 + j} className="mr-row stack"><div className="mr-k">VO₂ test · {v.dayL}</div><div className="mr-v sm">{fmt(v.vo2max, 1)}<span>ml/kg/min</span></div></In>)}
    {r.milestones.length > 0 && <div className="mr-list">{r.milestones.map((m: any, j: number) => <In key={m.name} i={3 + j} className={m.status === 'completed' ? 'done' : ''}><span>{m.name}</span><b>{m.status === 'completed' ? '✓ Done' : m.status.replace(/_/g, ' ')}</b><small>{m.dayL}</small></In>)}</div>}
    {r.journal > 0 && <In i={8} className="mr-line">{r.journal} journal {r.journal === 1 ? 'entry' : 'entries'}.</In>}
  </>) })
  if (t) out.push({ id: 'wrap', hue: 210, hue2: 320, el: (<div className="mr-cover">
    <In i={0} className="mr-eyebrow">That's a wrap</In>
    <In i={1} className="mr-title sm" style={{ ['--len' as string]: mon.length }}>{mon}</In>
    <div className="mr-grid">
      <In i={2}><b><Num v={t.days.now} /></b><span>active days</span></In>
      <In i={3}><b><Num v={t.hours.now} d={1} /></b><span>hours</span></In>
      <In i={4}><b><Num v={t.sessions.now} /></b><span>sessions</span></In>
      {r.bests.length > 0 && <In i={5}><b><Num v={r.bests.length} /></b><span>personal bests</span></In>}
      {r.lifting?.lb.now != null && <In i={6}><b><Num v={Math.round(r.lifting.lb.now / 1000)} />k</b><span>lb lifted</span></In>}
      {rc?.recovery.now != null && <In i={7}><b><Num v={rc.recovery.now} />%</b><span>avg recovery</span></In>}
    </div>
    <In i={8}><button className="mr-replay" onClick={e => { e.stopPropagation(); replay() }}>↻ Replay</button></In>
  </div>) })
  return out
}

export function MonthReview({ month, onClose }: { month: string; onClose: () => void }) {
  const [m, setM] = useState(month)
  const [data, setData] = useState<{ review: R; months: string[] } | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [i, setI] = useState(0)
  const [dir, setDir] = useState(1)
  const [paused, setPaused] = useState(false)
  const [run, setRun] = useState(0) // bumps on replay so the cards play again
  const held = useRef<number | null>(null)
  useEffect(() => {
    setData(null); setErr(null); setI(0)
    fetch(`/api/review?month=${m}`).then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error ?? `Server error ${r.status}`); setData(j) }).catch(e => setErr((e as Error).message))
  }, [m])
  const list = data ? cards(data.review, () => { setDir(-1); setI(0); setRun(x => x + 1) }) : []
  const n = list.length, cur = list[Math.min(i, Math.max(0, n - 1))]
  const go = (d: number) => { setDir(d); setI(k => Math.max(0, Math.min(n - 1, k + d))) }
  const still = reduced()
  // Auto-advance: the active bar fills over CARD_MS (CSS), and its animationend moves on; nothing runs with reduced motion.
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'ArrowRight' || e.key === ' ') go(1); else if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'Escape') onClose() }
    const vis = () => setPaused(document.hidden)
    window.addEventListener('keydown', key); document.addEventListener('visibilitychange', vis)
    return () => { window.removeEventListener('keydown', key); document.removeEventListener('visibilitychange', vis) }
  })
  // Tap the card: left third goes back, the rest forward (as in Strava's recap); hold to pause. Buttons and the month
  // picker keep their own clicks.
  const own = (e: { target: EventTarget }) => !!(e.target as HTMLElement).closest('button, select, a')
  const down = (e: React.PointerEvent) => { if (own(e)) return; held.current = window.setTimeout(() => setPaused(true), 180) }
  const up = (e: React.PointerEvent) => {
    if (own(e)) return
    const wasHeld = paused; if (held.current) clearTimeout(held.current); held.current = null; setPaused(false)
    if (wasHeld || n < 2) return
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    go(e.clientX - r.left < r.width / 3 ? -1 : 1)
  }
  const cancel = () => { if (held.current) clearTimeout(held.current); held.current = null; setPaused(false) }
  return (
    <div className="mr-back" onClick={onClose}>
      <div className={'mr' + (paused ? ' paused' : '') + (still ? ' still' : '')} role="dialog" aria-label="Month in review" onClick={e => e.stopPropagation()}
        style={{ ['--h1' as string]: cur?.hue ?? 210, ['--h2' as string]: cur?.hue2 ?? 285 }}>
        <div className="mr-glow" aria-hidden><i /><i /><i /></div>
        <div className="mr-bars">{list.map((c, k) => (
          <i key={c.id + run} onClick={() => { setDir(k > i ? 1 : -1); setI(k) }}>
            <b className={k < i ? 'full' : k === i ? 'run' : ''} onAnimationEnd={() => { if (k === i && i < n - 1) go(1) }}
              style={{ animationDuration: `${CARD_MS}ms`, animationPlayState: paused ? 'paused' : 'running' }} />
          </i>))}</div>
        <div className="mr-head">
          <select className="mr-month" value={m} onChange={e => setM(e.target.value)} aria-label="Month">
            {(data?.months ?? [m]).map(x => <option key={x} value={x}>{monthName(x)}</option>)}
          </select>
          <button className="mr-x" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div key={`${m}-${i}-${run}`} className={'mr-card ' + (dir > 0 ? 'fwd' : 'back')} onPointerDown={down} onPointerUp={up} onPointerCancel={cancel} onPointerLeave={cancel}>
          {err ? <p className="mr-line">{err}</p> : !data ? <div className="mr-loading"><i /><i /><i /></div> : !n ? <p className="mr-line">No data for {monthName(m)}.</p> : cur.el}
        </div>
        {n > 1 && <>
          <div className="mr-foot">{paused ? 'Paused' : i < n - 1 ? 'Hold to pause · tap to skip' : ''}</div>
        </>}
      </div>
    </div>)
}

/** Overview card for the first week of a month: last month's review is ready. */
export function MonthReviewCard({ today }: { today: string }) {
  const [open, setOpen] = useState(false)
  const [r, setR] = useState<R | null>(null)
  const day = Number(today.slice(8)), last = new Date(Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 2, 1)).toISOString().slice(0, 7)
  const show = day <= 7 && !isSample() // sample data has no real months to review
  useEffect(() => { if (show) fetch(`/api/review?month=${last}`).then(x => x.json()).then(j => setR(j.review ?? null)).catch(() => {}) }, [show, last])
  if (!show) return null
  const t = r?.training
  return (
    <>
      <button className="mr-cardlink" onClick={() => setOpen(true)}>
        <span className="mr-cardglow" aria-hidden />
        <span className="mr-eyebrow">Your month in review</span>
        <b>{monthName(last).split(' ')[0]} in review</b>
        <span>{t ? [`${t.days.now} active days`, `${fmt(t.hours.now, 1)} hrs`, r.bests.length ? `${r.bests.length} personal best${r.bests.length === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ') : 'Your highlights from last month'}</span>
        <em>Play ▶</em>
      </button>
      {open && <MonthReview month={last} onClose={() => setOpen(false)} />}
    </>)
}

/** Week page: open the review any time (last full month; the picker reaches every month with data, this one too). */
export function MonthReviewLink({ today }: { today: string }) {
  const [open, setOpen] = useState(false)
  if (isSample()) return null // sample data has no real months to review
  const last = new Date(Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 2, 1)).toISOString().slice(0, 7)
  return (
    <>
      <button className="mr-cardlink" onClick={() => setOpen(true)}>
        <span className="mr-cardglow" aria-hidden />
        <span className="mr-eyebrow">Month in review</span>
        <b>{monthName(last).split(' ')[0]} in review</b>
        <span>Training, bests, lifting, recovery, sleep, body and fuel, tests, against the month before. Pick any month inside.</span>
        <em>Play ▶</em>
      </button>
      {open && <MonthReview month={last} onClose={() => setOpen(false)} />}
    </>)
}

/** Opens the review from the monthly notification: the app is opened at /?review=YYYY-MM, or (already open) the
 *  service worker posts {open: url}. The query is removed once it's read, so a reload doesn't reopen it. */
export function MonthReviewDeepLink() {
  const [m, setM] = useState<string | null>(null)
  useEffect(() => {
    const take = (href: string) => {
      const x = new URL(href, location.origin).searchParams.get('review')
      if (x && /^\d{4}-(0[1-9]|1[0-2])$/.test(x)) setM(x)
    }
    take(location.href)
    if (new URLSearchParams(location.search).has('review')) history.replaceState(null, '', location.pathname + location.hash)
    const msg = (e: MessageEvent) => { if (typeof e.data?.open === 'string') take(e.data.open) }
    navigator.serviceWorker?.addEventListener('message', msg)
    return () => navigator.serviceWorker?.removeEventListener('message', msg)
  }, [])
  return m ? <MonthReview month={m} onClose={() => setM(null)} /> : null
}
