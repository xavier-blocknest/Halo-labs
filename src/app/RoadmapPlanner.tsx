// Roadmap planner: build or change the whole roadmap in the app (goal race, races and milestones, weekly schedule,
// notes for the coach), so nobody needs a file in Halo Labs' format. Loads /api/roadmap/doc (the newest roadmap with
// any in-app edits applied) and saves the whole document back; fields the planner doesn't show are kept as they are.
import { useEffect, useState } from 'react'
import { isSample, READ_ONLY } from '../sampleMode'
import './roadmap-editor.css'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Doc = Record<string, any>
type Ms = { key: number; name: string; date: string; when: string; status: string; target: string; race: boolean; registeredOn: string | null; rest: Doc }

const STATUS = [['upcoming', 'Upcoming'], ['registered', 'Registered'], ['planned', 'Planned'], ['started', 'Started'], ['in_progress', 'In progress'],
  ['completed', 'Done'], ['researching', 'Researching'], ['optional', 'Optional']] as const
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const ISO = /^\d{4}-\d{2}-\d{2}$/
const RACE = /5k|10k|race|ironman|70\.3|marathon|spartan/i // the server's guess when a milestone isn't marked
const KM_PER_MI = 1.609344, KM_PER_YD = 0.0009144
const lines = (s: string) => s.split('\n').map(x => x.trim()).filter(Boolean)
const num = (s: string) => { const n = Number.parseFloat(s); return Number.isFinite(n) && n > 0 ? n : null }
const round = (n: number, d = 1) => String(Math.round(n * 10 ** d) / 10 ** d)

const EMPTY: Doc = { title: 'My roadmap', primary_goal: { event: '', date: null, location: '', objective: '' }, milestones: [],
  current_training_schedule: {}, planning_principles: [], recovery_priorities: [] }

export function RoadmapPlanner({ today, onClose }: { today: string; onClose: () => void }) {
  const [base, setBase] = useState<Doc | null>(null)
  const [err, setErr] = useState<string | null>(isSample() ? READ_ONLY : null)
  const [busy, setBusy] = useState(false)
  const [goal, setGoal] = useState({ event: '', date: '', location: '', objective: '', registered: '', swim: '', bike: '', run: '' })
  const [ms, setMs] = useState<Ms[]>([])
  const [week, setWeek] = useState<Record<string, string>>({})
  const [weekNote, setWeekNote] = useState('')
  const [principles, setPrinciples] = useState('')
  const [recovery, setRecovery] = useState('')
  const [nextKey, setNextKey] = useState(1)

  useEffect(() => {
    if (isSample()) { load(EMPTY); return }
    fetch('/api/roadmap/doc').then(r => r.json()).then(r => load(r.doc ?? EMPTY)).catch(() => setErr("Couldn't load your roadmap. Try again."))
  }, [])

  function load(doc: Doc) {
    const g = doc.primary_goal ?? {}, dist = g.distances ?? {}
    setGoal({ event: g.event ?? '', date: ISO.test(g.date ?? '') ? g.date : '', location: g.location ?? '', objective: g.objective ?? '',
      registered: ISO.test(g.registered_on ?? '') ? g.registered_on : '',
      swim: dist.swim_km ? round(dist.swim_km / KM_PER_YD, 0) : '', bike: dist.bike_km ? round(dist.bike_km / KM_PER_MI) : '', run: dist.run_km ? round(dist.run_km / KM_PER_MI) : '' })
    // The goal race shows in the goal section only; it's written back into the milestones on save.
    const list = (doc.milestones ?? []).filter((m: Doc) => m.name !== g.event)
    setMs(list.map((m: Doc, i: number) => { const { name, date, date_range, status, target_time, registered_on, race, ...rest } = m
      return { key: i + 1, name: name ?? '', date: ISO.test(date ?? '') ? date : '', when: date_range ?? (date && !ISO.test(date) ? date : ''), status: status ?? 'planned',
        target: target_time ?? '', race: race ?? RACE.test(name ?? ''), registeredOn: registered_on ?? null, rest } }))
    setNextKey(list.length + 1)
    const sch = doc.current_training_schedule ?? {}
    setWeek(Object.fromEntries(DAYS.map(d => [d, (sch[d] ?? []).join('\n')])))
    setWeekNote(sch.note ?? '')
    setPrinciples((doc.planning_principles ?? []).join('\n'))
    setRecovery((doc.recovery_priorities ?? []).join('\n'))
    setBase(doc)
  }

  const setM = (key: number, patch: Partial<Ms>) => setMs(xs => xs.map(m => {
    if (m.key !== key) return m
    const n = { ...m, ...patch }
    if (patch.status === 'registered' && !n.registeredOn) n.registeredOn = today
    if (patch.status && patch.status !== 'registered') n.registeredOn = null
    return n
  }))
  const addM = () => { setMs(xs => [...xs, { key: nextKey, name: '', date: '', when: '', status: 'upcoming', target: '', race: true, registeredOn: null, rest: {} }]); setNextKey(k => k + 1) }

  const save = async () => {
    if (!base) return
    if (!goal.event.trim()) { setErr('Give your main goal a name, e.g. "Chicago Marathon".'); return }
    setBusy(true); setErr(null)
    const g0 = base.primary_goal ?? {}, oldGoal = (base.milestones ?? []).find((m: Doc) => m.name === g0.event)
    const distances = { ...(num(goal.swim) ? { swim_km: Math.round(num(goal.swim)! * KM_PER_YD * 100) / 100 } : {}),
      ...(num(goal.bike) ? { bike_km: Math.round(num(goal.bike)! * KM_PER_MI * 10) / 10 } : {}), ...(num(goal.run) ? { run_km: Math.round(num(goal.run)! * KM_PER_MI * 10) / 10 } : {}) }
    const milestones = ms.filter(m => m.name.trim() || m.date || m.when.trim()).map(m => ({ ...m.rest, name: m.name.trim(),
      ...(m.date ? { date: m.date } : m.when.trim() ? { date_range: m.when.trim() } : {}), status: m.status,
      race: m.race, ...(m.race && m.target.trim() ? { target_time: m.target.trim() } : {}), ...(m.registeredOn ? { registered_on: m.registeredOn } : {}) }))
    // The goal on the timeline: its date, else the file's "when" text for it (a cleared date takes it off).
    if (goal.date) milestones.push({ ...(oldGoal ?? {}), name: goal.event.trim(), date: goal.date, date_range: undefined, status: oldGoal?.status ?? 'goal' })
    else if (oldGoal?.date_range) milestones.push({ ...oldGoal, date: undefined, name: goal.event.trim() })
    const doc: Doc = { ...base,
      primary_goal: { ...g0, event: goal.event.trim(), date: goal.date || null, location: goal.location.trim(), objective: goal.objective.trim(), registered_on: goal.registered || null,
        distances: Object.keys(distances).length ? distances : undefined },
      milestones: milestones.map(m => JSON.parse(JSON.stringify(m))), // drops undefined fields
      current_training_schedule: { ...(base.current_training_schedule ?? {}), ...Object.fromEntries(DAYS.map(d => [d, lines(week[d] ?? '')])), note: weekNote.trim() },
      planning_principles: lines(principles), recovery_priorities: lines(recovery) }
    try {
      const r = await fetch('/api/roadmap/doc', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(doc) })
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `Server error ${r.status}`)
      window.dispatchEvent(new Event('halolabs:data'))
      onClose()
    } catch (x) { setErr((x as Error).message); setBusy(false) }
  }

  const G = (k: keyof typeof goal) => ({ value: goal[k], onChange: (ev: { target: { value: string } }) => setGoal({ ...goal, [k]: ev.target.value }) })
  return (
    <div className="rme-back" onClick={onClose}>
      <div className="rme" role="dialog" aria-label="Plan your roadmap" onClick={ev => ev.stopPropagation()}>
        <div className="rme-head">
          <div><div className="rme-title">Plan your roadmap</div>
            <div className="rme-sub">Your goal, the races and steps on the way, and a typical week. The coach plans around it. Everything is optional except the goal's name.</div></div>
          <button className="rme-x" onClick={onClose} aria-label="Close">×</button>
        </div>

        {!base && !err && <div className="rme-sub">Loading…</div>}
        {base && <>
          <section className="rmp-sec">
            <div className="rmp-h">Main goal</div>
            <div className="rmp-grid">
              <label className="rmp-f rmp-wide"><span>Race or goal</span><input className="rme-in" placeholder="e.g. Chicago Marathon, first Olympic triathlon" maxLength={120} {...G('event')} /></label>
              <label className="rmp-f"><span>Date</span><input className="rme-in" type="date" {...G('date')} /></label>
              <label className="rmp-f"><span>Where</span><input className="rme-in" placeholder="City, State" maxLength={120} {...G('location')} /></label>
              <label className="rmp-f"><span>Registered on</span><input className="rme-in" type="date" {...G('registered')} /></label>
              <label className="rmp-f rmp-wide"><span>What finishing well looks like</span><input className="rme-in" placeholder="e.g. Finish strong under 4 hours, no walking" maxLength={500} {...G('objective')} /></label>
            </div>
            <div className="rme-label">Race distances, for the progress bars (leave blank if they don't apply)</div>
            <div className="rmp-grid three">
              <label className="rmp-f"><span>Swim (yd)</span><input className="rme-in" inputMode="decimal" placeholder="—" {...G('swim')} /></label>
              <label className="rmp-f"><span>Bike (mi)</span><input className="rme-in" inputMode="decimal" placeholder="—" {...G('bike')} /></label>
              <label className="rmp-f"><span>Run (mi)</span><input className="rme-in" inputMode="decimal" placeholder="—" {...G('run')} /></label>
            </div>
          </section>

          <section className="rmp-sec">
            <div className="rmp-h">Races and milestones on the way</div>
            <div className="rme-sub">Tune-up races, training blocks, checkpoints. Use a date, or a "when" like "spring 2027" or "late March 2027".</div>
            <div className="rme-list">
              {ms.map(m => (
                <div key={m.key} className="rme-row rmp-row">
                  <input className="rme-in" placeholder="Name, e.g. Spring 10K" value={m.name} maxLength={120} aria-label="Name" onChange={ev => setM(m.key, { name: ev.target.value })} />
                  <div className="rme-fields">
                    <input className="rme-in" type="date" value={m.date} aria-label="Date" onChange={ev => setM(m.key, { date: ev.target.value, ...(ev.target.value ? { when: '' } : {}) })} />
                    {!m.date && <input className="rme-in rme-grow" placeholder="or when: spring 2027" value={m.when} maxLength={60} aria-label="When" onChange={ev => setM(m.key, { when: ev.target.value })} />}
                    <select className="rme-in" value={m.status} aria-label="Status" onChange={ev => setM(m.key, { status: ev.target.value })}>
                      {!STATUS.some(([k]) => k === m.status) && <option value={m.status}>{m.status}</option>}
                      {STATUS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                    <label className="rme-mini"><input type="checkbox" checked={m.race} onChange={ev => setM(m.key, { race: ev.target.checked })} /> Race</label>
                    {m.race && <input className="rme-in rme-time" placeholder="Goal time" value={m.target} maxLength={20} aria-label="Goal time" onChange={ev => setM(m.key, { target: ev.target.value })} />}
                  </div>
                  <div className="rme-actions"><button className="rme-link" onClick={() => setMs(xs => xs.filter(x => x.key !== m.key))}>Remove</button></div>
                </div>
              ))}
            </div>
            <div><button className="rme-btn" onClick={addM}>+ Add a race or milestone</button></div>
          </section>

          <section className="rmp-sec">
            <div className="rmp-h">A typical week</div>
            <div className="rme-sub">One session per line, e.g. "Easy run, 30 min" or "Rest". The Week page starts from this until you and the coach plan a week.</div>
            <div className="rmp-week">
              {DAYS.map(d => (
                <label key={d} className="rmp-f"><span>{d[0].toUpperCase() + d.slice(1)}</span>
                  <textarea className="rme-in" rows={2} value={week[d] ?? ''} onChange={ev => setWeek({ ...week, [d]: ev.target.value })} /></label>
              ))}
            </div>
            <label className="rmp-f"><span>Anything the coach should know about the week</span>
              <input className="rme-in" maxLength={300} placeholder="e.g. Long run moves to Sunday on work weekends" value={weekNote} onChange={ev => setWeekNote(ev.target.value)} /></label>
          </section>

          <section className="rmp-sec">
            <div className="rmp-h">Notes for the coach</div>
            <div className="rmp-grid">
              <label className="rmp-f"><span>Training principles (one per line)</span>
                <textarea className="rme-in" rows={4} placeholder={'Build mileage slowly\nStrength twice a week'} value={principles} onChange={ev => setPrinciples(ev.target.value)} /></label>
              <label className="rmp-f"><span>Recovery priorities (one per line)</span>
                <textarea className="rme-in" rows={4} placeholder={'Sleep 8 hours\nOne full rest day a week'} value={recovery} onChange={ev => setRecovery(ev.target.value)} /></label>
            </div>
          </section>
        </>}

        {err && <div className="rme-err">{err}</div>}
        <div className="rme-foot">
          <button className="rme-link" onClick={onClose}>Cancel</button>
          <button className="rme-btn rme-primary" disabled={busy || !base || isSample()} onClick={save}>{busy ? 'Saving…' : 'Save roadmap'}</button>
        </div>
      </div>
    </div>
  )
}
