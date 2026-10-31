// Roadmap page: the athlete's season plan (plan/roadmap) against what the data shows. Everything comes from D.plan
// and D.training; nothing here is hard-coded.
import { useState } from 'react'
import { RoadmapPlanner } from './RoadmapPlanner'
import './roadmap.css'

/* eslint-disable @typescript-eslint/no-explicit-any */
type D = any

const STATUS: Record<string, [string, string]> = {
  completed: ['Done', 'good'], started: ['Started', 'accent'], in_progress: ['In progress', 'accent'], upcoming: ['Upcoming', 'warn'],
  planned: ['Planned', 'muted'], researching: ['Researching', 'muted'], goal: ['Goal', 'accent'], registered: ['Registered', 'good'],
}
const status = (s: string) => STATUS[s] ?? [s.replace(/_/g, ' '), 'muted']
const fmt = (day: string, o: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) => new Date(day + 'T12:00:00Z').toLocaleDateString('en-US', { timeZone: 'UTC', ...o })
const ms = (day: string) => Date.parse(day + 'T12:00:00Z')

function Card({ title, meta, children, wide }: { title: string; meta?: React.ReactNode; children: React.ReactNode; wide?: boolean }) {
  return (
    <section className={`rm-card${wide ? ' wide' : ''}`}>
      <header><h3>{title}</h3>{meta && <span className="rm-meta">{meta}</span>}</header>
      {children}
    </section>
  )
}

function Timeline({ p, today }: { p: D; today: string }) {
  const dated = p.milestones.filter((m: D) => m.start)
  const first = dated.reduce((a: string, m: D) => (m.start < a ? m.start : a), today)
  const start = first.slice(0, 7) + '-01', end = p.goal.date ?? dated.at(-1)?.end ?? today
  const t0 = ms(start), span = ms(end) - t0 || 1
  const x = (day: string) => `${Math.max(0, Math.min(100, ((ms(day) - t0) / span) * 100)).toFixed(2)}%`
  const w = (a: string, b: string) => `${Math.max(0.8, ((ms(b) - ms(a)) / span) * 100).toFixed(2)}%`
  const months: string[] = []
  for (let d = new Date(t0); d.getTime() <= ms(end); d.setUTCMonth(d.getUTCMonth() + 1)) months.push(d.toISOString().slice(0, 10))
  const ranges = dated.filter((m: D) => m.start !== m.end), points = dated.filter((m: D) => m.start === m.end)
  return (
    <div className="rm-tl">
      <div className="rm-tl-months">{months.map(m => <span key={m} style={{ left: x(m) }}>{fmt(m, { month: 'short' })}</span>)}</div>
      <div className="rm-tl-lane"><span className="rm-tl-k">Milestones</span>
        <div className="rm-tl-track">
          {points.map((m: D) => <span key={m.name} className={`rm-pin ${status(m.status)[1]}${m.big ? ' big' : ''}`} style={{ left: x(m.start) }} title={`${m.name} · ${m.when}`} />)}
        </div>
      </div>
      {ranges.map((m: D) => (
        <div key={m.name} className="rm-tl-lane"><span className="rm-tl-k" title={m.name}>{m.name}</span>
          <div className="rm-tl-track"><span className={`rm-bar ${status(m.status)[1]}`} style={{ left: x(m.start), width: w(m.start, m.end) }} title={`${m.name} · ${m.when}`} /></div>
        </div>
      ))}
      {p.swimming.phases.length > 0 && (
        <div className="rm-tl-lane"><span className="rm-tl-k">Swim phases</span>
          <div className="rm-tl-track">{p.swimming.phases.filter((s: D) => s.start).map((s: D) => (
            <span key={s.period} className={`rm-bar ${p.swimming.current?.period === s.period ? 'accent' : 'muted'}`} style={{ left: x(s.start), width: w(s.start, s.end) }} title={`${s.period} · ${s.focus}`}><em>{s.focus}</em></span>))}</div>
        </div>
      )}
      <div className="rm-tl-today" style={{ left: `calc(132px + (100% - 132px) * ${(((ms(today) - t0) / span) * 100).toFixed(2)} / 100)` }}><span>Today</span></div>
    </div>
  )
}

export function RoadmapPage({ D }: { D: D }) {
  const p = D.plan, t = D.training
  const [planning, setPlanning] = useState(false)
  if (!p) return (
    <div className="rm"><section className="rm-card wide">
      <p className="rm-empty">No roadmap yet. Plan your goal race, the races on the way and a typical week, and the coach plans around it.</p>
      <p><button className="rme-btn rme-primary" onClick={() => setPlanning(true)}>Build your roadmap</button></p>
      <p className="rm-note">Already have a roadmap file in Halo Labs' format? Upload it in Settings → Upload data instead.</p>
      {planning && <RoadmapPlanner today={D.today} onClose={() => setPlanning(false)} />}
    </section></div>)
  const g = p.goal, longestRun = t?.longest?.run?.v ?? 0
  const SPORT: Record<string, string> = { run: 'Run', swim: 'Swim', ride: 'Ride', strength: 'Lift', walk: 'Walk', other: 'Activity' }
  return (
    <div className="rm">
      <section className="rm-card wide rm-goal">
        <div className="rm-goal-main">
          <span className="rm-eyebrow">Primary goal</span>
          <h2>{g.event}</h2>
          <p className="rm-sub">{g.dateLabel}{g.location ? ` · ${g.location}` : ''}</p>
          <p className="rm-text">{g.objective}</p>
        </div>
        {g.daysTo != null && <div className="rm-count"><b>{g.daysTo}</b><span>days</span><small>{g.weeksTo} weeks</small></div>}
        <div className="rm-legs">
          {p.legs.map((l: D) => { const pct = Math.min(100, Math.round((l.done / (l.goal || 1)) * 100))
            return (
              <div key={l.k} className="rm-leg">
                <div className="rm-leg-top"><span>{l.k}</span><span><b>{l.done.toLocaleString()}</b> / {l.goal.toLocaleString()} {l.unit}</span></div>
                <div className="rm-progress"><div style={{ width: `${Math.max(2, pct)}%` }} /></div>
                <small>{l.day ? `Longest · ${fmt(l.day, { month: 'short', day: 'numeric', year: 'numeric' })}` : 'No sessions yet'} · {pct}%</small>
              </div>)
          })}
        </div>
      </section>

      <Card title="Season plan" meta={`${fmt(p.milestones.find((m: D) => m.start)?.start ?? D.today, { month: 'short', year: 'numeric' })} → ${g.date ? fmt(g.date, { month: 'short', year: 'numeric' }) : ''} · from your roadmap`} wide>
        <Timeline p={p} today={D.today} />
      </Card>

      <div className="rm-grid">
        <Card title="This week" meta={p.deload?.active ? `Deload · ${fmt(p.deload.start)} – ${fmt(p.deload.end)} · ${Math.round(p.deload.fraction * 100)}% weights` : p.scheduleNote}>
          <ul className="rm-week">
            {(t?.weekDays ?? []).map((d: D, i: number) => {
              const plan = p.schedule[['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][i]] ?? []
              return (
                <li key={d.day} className={d.today ? 'today' : ''}>
                  <span className="rm-dow">{d.d}</span>
                  <span className="rm-plan">{plan.map((x: string) => <em key={x}>{x}</em>)}</span>
                  <span className="rm-did">{d.today && !d.items.length ? 'Today' : d.items.map((it: D) => SPORT[it.sport] ?? it.sport).join(' · ') || (d.future ? '' : '—')}</span>
                </li>)
            })}
          </ul>
        </Card>
        <Card title="Sustainable 75 Hard" meta={t ? `Streak ${t.streak} days` : ''}>
          <ul className="rm-kv">{p.rules.map((r: D) => <li key={r.k}><span>{r.k}</span><span>{r.v}</span></li>)}</ul>
        </Card>
      </div>

      <div className="rm-grid">
        <Card title="Milestones" meta={`${p.milestones.filter((m: D) => m.status === 'completed').length} of ${p.milestones.length} done`}>
          <ul className="rm-ms">
            {p.milestones.map((m: D) => { const [label, tone] = status(m.status)
              return (
                <li key={m.name} className={m.big ? 'big' : ''}>
                  <span className={`rm-dot ${tone}`} />
                  <div><b>{m.name}</b><small>{m.when}{m.daysTo != null && m.daysTo > 0 ? ` · in ${m.daysTo} days` : ''}</small></div>
                  <span className={`rm-chip ${tone}`}>{label}</span>
                </li>)
            })}
          </ul>
        </Card>
        <div className="rm-stack">
          <Card title="Run ladder" meta={p.running.comfortableMi ? `Comfortable now: ${p.running.comfortableMi} mi` : ''}>
            <ul className="rm-ladder">
              {p.running.ladder.map((l: D) => { const pct = Math.min(100, (longestRun / l.mi) * 100)
                return <li key={l.k}><span>{l.k}</span><div className="rm-progress"><div className={pct >= 100 ? 'done' : ''} style={{ width: `${Math.max(2, pct)}%` }} /></div><span>{l.mi} mi</span></li> })}
            </ul>
            <p className="rm-note">Bars show your longest run ({longestRun} mi) against each distance.</p>
          </Card>
          <Card title="Bike setup" meta={p.cycling.priority}>
            <ul className="rm-kv">
              <li><span>Professional fitting</span><span className="rm-chip muted">{p.cycling.fitting}</span></li>
              {p.cycling.equipment.map((e: D) => <li key={e.k}><span>{e.k}</span><span className="rm-chip muted">{e.v}</span></li>)}
            </ul>
            <p className="rm-note">{p.cycling.preferred}{p.cycling.budget ? ` · up to $${p.cycling.budget.toLocaleString()}` : ''}. {p.cycling.interim}</p>
          </Card>
        </div>
      </div>

      <div className="rm-grid three">
        <Card title="Swimming" meta={p.swimming.coach ? `With coach · ${p.swimming.when}` : p.swimming.when}>
          {p.swimming.current && <p className="rm-text"><b>Now:</b> {p.swimming.current.focus} ({p.swimming.current.period})</p>}
          <ul className="rm-list">{p.swimming.focus.map((f: string) => <li key={f}>{f}</li>)}</ul>
        </Card>
        <Card title="Principles">
          <ul className="rm-list">{p.principles.map((u: string) => <li key={u}>{u}</li>)}</ul>
          {p.otherEvents.length > 0 && <ul className="rm-kv" style={{ marginTop: 12 }}>{p.otherEvents.map((e: D) => <li key={e.k}><span>{e.k}</span><span>{e.v}</span></li>)}</ul>}
        </Card>
      </div>
    </div>
  )
}
