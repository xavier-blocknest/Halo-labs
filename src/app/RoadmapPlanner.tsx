// Roadmap planner: build or change the whole roadmap in the app (goal race, races and milestones, weekly schedule,
// notes for the coach), so nobody needs a file in Halo Labs' format. Loads /api/roadmap/doc (the newest roadmap with
// any in-app edits applied) and saves the whole document back; fields the planner doesn't show are kept as they are.
import { useEffect, useState } from 'react'
import { isSample, READ_ONLY } from '../sampleMode'
import './roadmap-editor.css'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Doc = Record<string, any>
type Kind = 'race' | 'target' | 'step'
type Tgt = { metric: string; of: string; value: string }
type Ms = { key: number; name: string; date: string; when: string; status: string; target: string; kind: Kind; tgt: Tgt; registeredOn: string | null; rest: Doc }
type Metric = { id: string; label: string; unit: string; time: boolean; of: 'exercise' | 'marker' | null; up: boolean | null; hint: string }
type Choices = { metrics: Metric[]; current: Record<string, { valueL: string; day: string; source: string } | null>; exercises: string[]; markers: string[] }

const STATUS = [['upcoming', 'Upcoming'], ['registered', 'Registered'], ['planned', 'Planned'], ['started', 'Started'], ['in_progress', 'In progress'],
  ['completed', 'Done'], ['researching', 'Researching'], ['optional', 'Optional']] as const
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const ISO = /^\d{4}-\d{2}-\d{2}$/
const RACE = /5k|10k|race|ironman|70\.3|marathon|spartan/i // the server's guess when a milestone isn't marked
const KM_PER_MI = 1.609344, KM_PER_YD = 0.0009144
const lines = (s: string) => s.split('\n').map(x => x.trim()).filter(Boolean)
const num = (s: string) => { const n = Number.parseFloat(s); return Number.isFinite(n) && n > 0 ? n : null }
const round = (n: number, d = 1) => String(Math.round(n * 10 ** d) / 10 ** d)
const clock = (s: number) => { const r = Math.round(s), h = Math.floor(r / 3600), m = Math.floor((r % 3600) / 60), x = r % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}` }
const NO_TGT: Tgt = { metric: 'vo2max', of: '', value: '' }
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

const EMPTY: Doc = { title: 'My roadmap', primary_goal: { event: '', date: null, location: '', objective: '' }, milestones: [],
  current_training_schedule: {}, planning_principles: [], recovery_priorities: [] }

/** What a target measures: the metric, the exercise or lab marker when it needs one, and the target value. */
function TargetFields({ t, set, choices, compact }: { t: Tgt; set: (t: Tgt) => void; choices: Choices | null; compact?: boolean }) {
  const m = choices?.metrics.find(x => x.id === t.metric)
  const list = m?.of === 'exercise' ? choices?.exercises : m?.of === 'marker' ? choices?.markers : null
  const id = `rmp-of-${m?.of ?? 'x'}`
  return (<>
    <select className="rme-in" value={t.metric} aria-label="What to measure" onChange={ev => set({ ...t, metric: ev.target.value, of: '' })}>
      {(choices?.metrics ?? [{ id: t.metric, label: t.metric }]).map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
    </select>
    {m?.of && <>
      <input className="rme-in" list={id} placeholder={m.of === 'exercise' ? 'Exercise, e.g. Bench Press' : 'Lab marker, e.g. LDL'} value={t.of} maxLength={80}
        aria-label={m.of === 'exercise' ? 'Exercise' : 'Lab marker'} onChange={ev => set({ ...t, of: ev.target.value })} />
      <datalist id={id}>{(list ?? []).map(n => <option key={n} value={n} />)}</datalist>
    </>}
    <input className={'rme-in' + (compact ? ' rme-time' : '')} inputMode={m?.time ? 'text' : 'decimal'} value={t.value} maxLength={12} aria-label="Target value"
      placeholder={m?.time ? 'Target, e.g. 24:30' : `Target${m?.unit ? ' (' + m.unit + ')' : ''}`} onChange={ev => set({ ...t, value: ev.target.value })} />
  </>)
}

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
  // Main goal as a measurable target ("VO₂ max 50 by June"): what to measure, and his current value when no data has one.
  const [kind, setKind] = useState<'race' | 'target'>('race')
  const [tgt, setTgt] = useState<Tgt>(NO_TGT)
  const [now, setNow] = useState('')
  const [choices, setChoices] = useState<Choices | null>(null)

  useEffect(() => {
    if (isSample()) { load(EMPTY); return }
    fetch('/api/roadmap/doc').then(r => r.json()).then(r => load(r.doc ?? EMPTY)).catch(() => setErr("Couldn't load your roadmap. Try again."))
    fetch('/api/targets').then(r => r.json()).then(setChoices).catch(() => { /* targets still save; the current value just isn't shown */ })
  }, [])

  const metric = (id: string) => choices?.metrics.find(m => m.id === id)
  const tgtIn = (t: Doc | undefined): Tgt => !t?.metric ? NO_TGT
    : { metric: t.metric, of: t.of ?? '', value: typeof t.value === 'number' ? (['run_5k', 'run_10k', 'run_half'].includes(t.metric) ? clock(t.value) : String(t.value)) : '' }
  const tgtOut = (t: Tgt) => ({ metric: t.metric, ...(metric(t.metric)?.of ? { of: t.of.trim() } : {}), value: t.value.trim() })
  /** His current value for a target: from the data or an earlier entry; null when there is none yet (then we ask). */
  const curOf = (t: Tgt) => {
    const m = metric(t.metric)
    if (!choices || !m) return undefined
    if (!m.of) return choices.current[t.metric] ?? null
    const has = (m.of === 'exercise' ? choices.exercises : choices.markers).some(n => same(n, t.of))
    return has ? { valueL: '', day: '', source: m.of === 'exercise' ? 'FitnessAI' : 'your lab results' } : null
  }

  function load(doc: Doc) {
    const g = doc.primary_goal ?? {}, dist = g.distances ?? {}
    setKind(g.kind === 'target' ? 'target' : 'race'); setTgt(tgtIn(g.target)); setNow('')
    setGoal({ event: g.event ?? '', date: ISO.test(g.date ?? '') ? g.date : '', location: g.location ?? '', objective: g.objective ?? '',
      registered: ISO.test(g.registered_on ?? '') ? g.registered_on : '',
      swim: dist.swim_km ? round(dist.swim_km / KM_PER_YD, 0) : '', bike: dist.bike_km ? round(dist.bike_km / KM_PER_MI) : '', run: dist.run_km ? round(dist.run_km / KM_PER_MI) : '' })
    // The goal race shows in the goal section only; it's written back into the milestones on save.
    const list = (doc.milestones ?? []).filter((m: Doc) => m.name !== g.event)
    setMs(list.map((m: Doc, i: number) => { const { name, date, date_range, status, target_time, registered_on, race, target, ...rest } = m
      return { key: i + 1, name: name ?? '', date: ISO.test(date ?? '') ? date : '', when: date_range ?? (date && !ISO.test(date) ? date : ''), status: status ?? 'planned',
        target: target_time ?? '', kind: target?.metric ? 'target' : (race ?? RACE.test(name ?? '')) ? 'race' : 'step', tgt: tgtIn(target), registeredOn: registered_on ?? null, rest } }))
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
  const addM = () => { setMs(xs => [...xs, { key: nextKey, name: '', date: '', when: '', status: 'upcoming', target: '', kind: 'race', tgt: { ...tgt, value: '' }, registeredOn: null, rest: {} }]); setNextKey(k => k + 1) }

  const save = async () => {
    if (!base) return
    const isT = kind === 'target', m0 = metric(tgt.metric)
    const event = goal.event.trim() || (isT && m0 && tgt.value.trim() ? `${m0.of && tgt.of.trim() ? tgt.of.trim() : m0.label} ${tgt.value.trim()}` : '')
    if (!event) { setErr(isT ? 'Set the target value.' : 'Give your main goal a name, e.g. "Chicago Marathon".'); return }
    if (isT) {
      if (!tgt.value.trim()) { setErr('Set the target value.'); return }
      if (!goal.date) { setErr('Pick the date to reach the target by.'); return }
      if (m0?.of && !tgt.of.trim()) { setErr(`Say which ${m0.of === 'exercise' ? 'exercise' : 'lab marker'}.`); return }
      if (curOf(tgt) === null && !now.trim()) { setErr(`Enter your current ${m0?.of ? tgt.of.trim() || m0.label : m0?.label ?? 'value'}, so progress can be measured.`); return }
    }
    setBusy(true); setErr(null)
    const badM = ms.find(m => m.kind === 'target' && (m.name.trim() || m.date || m.when.trim()) && (!m.tgt.value.trim() || (metric(m.tgt.metric)?.of && !m.tgt.of.trim())))
    if (badM) { setErr(`"${badM.name || 'A checkpoint'}": set what it measures and the target value.`); setBusy(false); return }
    if (isT && now.trim()) {
      const r = await fetch('/api/targets/reading', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ metric: tgt.metric, of: tgt.of, value: now.trim() }) }).catch(() => null)
      if (!r?.ok) { setErr((await r?.json().catch(() => ({})))?.error ?? "Couldn't save your current value."); setBusy(false); return }
    }
    const g0 = base.primary_goal ?? {}, oldGoal = (base.milestones ?? []).find((m: Doc) => m.name === g0.event)
    const distances = { ...(num(goal.swim) ? { swim_km: Math.round(num(goal.swim)! * KM_PER_YD * 100) / 100 } : {}),
      ...(num(goal.bike) ? { bike_km: Math.round(num(goal.bike)! * KM_PER_MI * 10) / 10 } : {}), ...(num(goal.run) ? { run_km: Math.round(num(goal.run)! * KM_PER_MI * 10) / 10 } : {}) }
    const milestones = ms.filter(m => m.name.trim() || m.date || m.when.trim()).map(m => ({ ...m.rest, name: m.name.trim(),
      ...(m.date ? { date: m.date } : m.when.trim() ? { date_range: m.when.trim() } : {}), status: m.status,
      race: m.kind === 'race', ...(m.kind === 'race' && m.target.trim() ? { target_time: m.target.trim() } : {}), ...(m.kind === 'target' ? { target: tgtOut(m.tgt) } : {}),
      ...(m.registeredOn ? { registered_on: m.registeredOn } : {}) }))
    // The goal on the timeline: its date, else the file's "when" text for it (a cleared date takes it off).
    if (goal.date) milestones.push({ ...(oldGoal ?? {}), name: event, date: goal.date, date_range: undefined, status: oldGoal?.status ?? 'goal', target: undefined })
    else if (oldGoal?.date_range) milestones.push({ ...oldGoal, date: undefined, name: event, target: undefined })
    // Progress counts from where he stood when the target was set: kept while it measures the same thing.
    const keepStart = isT && g0.target?.start && g0.target.metric === tgt.metric && same(g0.target.of ?? '', tgt.of)
    const doc: Doc = { ...base,
      primary_goal: isT
        ? { ...g0, kind: 'target', event, date: goal.date, objective: goal.objective.trim(), target: { ...tgtOut(tgt), ...(keepStart ? { start: g0.target.start } : {}) },
            location: undefined, registered_on: undefined, distances: undefined }
        : { ...g0, kind: 'race', target: undefined, event, date: goal.date || null, location: goal.location.trim(), objective: goal.objective.trim(), registered_on: goal.registered || null,
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
            <div className="rmp-kind" role="radiogroup" aria-label="Kind of goal">
              {([['race', 'A race or event'], ['target', 'A target to reach']] as const).map(([k, l]) => (
                <button key={k} role="radio" aria-checked={kind === k} className={'rme-btn' + (kind === k ? ' rme-primary' : '')} onClick={() => { setKind(k); setErr(null) }}>{l}</button>))}
            </div>
            {kind === 'target' ? (() => { const m = metric(tgt.metric), cur = curOf(tgt), what = m?.of ? tgt.of.trim() || (m.of === 'exercise' ? 'lift' : 'lab value') : m?.label ?? 'value'
              return (<>
                <div className="rme-sub">A number to reach by a date, e.g. VO₂ max 50 by June, a 5K under 25:00, or LDL under 100. Progress fills in from your data.</div>
                <div className="rme-fields rmp-tgt"><TargetFields t={tgt} set={t => { setTgt(t); setNow('') }} choices={choices} /></div>
                <div className="rmp-grid">
                  <label className="rmp-f"><span>Reach it by</span><input className="rme-in" type="date" {...G('date')} /></label>
                  <label className="rmp-f"><span>Name (optional)</span><input className="rme-in" placeholder={m ? `e.g. ${m.label} ${tgt.value || '50'}` : ''} maxLength={120} {...G('event')} /></label>
                  {cur === null && <label className="rmp-f rmp-wide"><span>Your current {what}</span>
                    <input className="rme-in" inputMode={m?.time ? 'text' : 'decimal'} maxLength={12} placeholder={m?.time ? 'e.g. 26:10' : m?.unit ? m.unit : ''} value={now} onChange={ev => setNow(ev.target.value)} />
                    <small className="rme-sub">{m?.id === 'vo2max'
                      ? "No lab VO₂ test uploaded yet. Enter your latest VO₂ max (from a test, your watch or your coach) so progress can be measured. Upload a lab test any time: newer tests take over."
                      : `Nothing in your data has this yet (it comes from ${m?.hint ?? 'your data'}). Enter where you are now so progress can be measured.`}</small></label>}
                  {cur && <div className="rmp-f rmp-wide"><span>Now</span>
                    <div className="rme-sub">{cur.valueL ? `${cur.valueL} · ${cur.source}${cur.day ? ', ' + cur.day : ''}` : `From ${cur.source}`}</div>
                    <input className="rme-in" inputMode={m?.time ? 'text' : 'decimal'} maxLength={12} placeholder="Newer value? Enter it here (optional)" value={now} onChange={ev => setNow(ev.target.value)} /></div>}
                  <label className="rmp-f rmp-wide"><span>Why it matters (optional)</span><input className="rme-in" placeholder="e.g. Build the engine for next year's half marathon" maxLength={500} {...G('objective')} /></label>
                </div>
                {m?.id === 'vo2max' && <div className="rme-sub">VO₂ max only changes when a new test or value comes in. Add a retest checkpoint every 8–12 weeks below; in between, the coach watches the signs that move with it (Zone 2 pace at the same heart rate, resting heart rate, HRV).</div>}
              </>) })() : <>
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
            </>}
          </section>

          <section className="rmp-sec">
            <div className="rmp-h">Races and milestones on the way</div>
            <div className="rme-sub">Tune-up races, training blocks, and target checkpoints (e.g. VO₂ max 47 by March). Use a date, or a "when" like "spring 2027" or "late March 2027".</div>
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
                    <select className="rme-in" value={m.kind} aria-label="Kind" onChange={ev => setM(m.key, { kind: ev.target.value as Kind })}>
                      <option value="race">Race</option><option value="target">Target</option><option value="step">Step</option>
                    </select>
                    {m.kind === 'race' && <input className="rme-in rme-time" placeholder="Goal time" value={m.target} maxLength={20} aria-label="Goal time" onChange={ev => setM(m.key, { target: ev.target.value })} />}
                    {m.kind === 'target' && <TargetFields t={m.tgt} set={t => setM(m.key, { tgt: t })} choices={choices} compact />}
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
