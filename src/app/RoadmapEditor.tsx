// Roadmap editor: change dates, statuses and goal times, mark races registered, add or hide milestones.
// Saved as plan/roadmap-edits on top of the uploaded roadmap file, so uploading a new file keeps these edits.
import { useMemo, useState } from 'react'
import './roadmap-editor.css'

type Edit = { date?: string; date_range?: string; status?: string; target_time?: string | null; registered_on?: string | null; hidden?: boolean }
type Edits = { edits: Record<string, Edit>; added: ({ name: string } & Edit)[] }
type Milestone = { name: string; status: string; date: string | null; dateRange: string | null; targetTime: string | null; registeredOn: string | null; big: boolean; edited: boolean; added: boolean }
type Plan = { milestones: Milestone[]; edits: Edits; hiddenNames: string[]; goal: { event: string } }

const STATUS = [['upcoming', 'Upcoming'], ['registered', 'Registered'], ['planned', 'Planned'], ['started', 'Started'], ['in_progress', 'In progress'],
  ['completed', 'Done'], ['researching', 'Researching'], ['optional', 'Optional'], ['goal', 'Goal']] as const
const isRace = (name: string) => /5k|10k|race|ironman|70\.3|marathon|spartan|triathlon|sprint/i.test(name)

export function RoadmapEditor({ plan, today, onClose }: { plan: Plan; today: string; onClose: () => void }) {
  const [e, setE] = useState<Edits>(() => structuredClone(plan.edits))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [draft, setDraft] = useState({ name: '', date: '', status: 'upcoming' })

  // What each row shows: the milestone as saved, with this session's changes on top.
  const rows = useMemo(() => plan.milestones.filter(m => !m.added).map(m => {
    const x = { ...m, ...pick(e.edits[m.name]) }
    return { ...x, edited: !!e.edits[m.name] && Object.keys(e.edits[m.name]).some(k => k !== 'hidden'), hidden: !!e.edits[m.name]?.hidden }
  }), [plan.milestones, e.edits])
  const hiddenFile = [...new Set([...plan.hiddenNames, ...Object.entries(e.edits).filter(([, v]) => v.hidden).map(([k]) => k)])]

  const setFile = (name: string, patch: Edit) => setE(s => ({ ...s, edits: { ...s.edits, [name]: { ...s.edits[name], ...withReg(patch, s.edits[name]?.registered_on) } } }))
  const revert = (name: string) => setE(s => { const edits = { ...s.edits }; const h = edits[name]?.hidden; delete edits[name]; if (h) edits[name] = { hidden: true }; return { ...s, edits } })
  const hide = (name: string, hidden: boolean) => setE(s => ({ ...s, edits: { ...s.edits, [name]: { ...s.edits[name], hidden } } }))
  const setAdded = (i: number, patch: Edit) => setE(s => ({ ...s, added: s.added.map((a, j) => (j === i ? { ...a, ...withReg(patch, a.registered_on) } : a)) }))
  const remove = (i: number) => setE(s => ({ ...s, added: s.added.filter((_, j) => j !== i) }))
  const add = () => {
    const name = draft.name.trim()
    if (!name || !draft.date) { setErr('Give the new race a name and a date.'); return }
    if (rows.some(r => r.name === name) || e.added.some(a => a.name === name)) { setErr(`"${name}" is already on the roadmap.`); return }
    setE(s => ({ ...s, added: [...s.added, { name, date: draft.date, ...withReg({ status: draft.status }, null) }] }))
    setDraft({ name: '', date: '', status: 'upcoming' }); setErr(null)
  }
  function withReg(patch: Edit, current: string | null | undefined): Edit {
    if (patch.status === 'registered' && !current) return { ...patch, registered_on: today }
    if (patch.status && patch.status !== 'registered' && current) return { ...patch, registered_on: null }
    return patch
  }

  const save = async () => {
    setBusy(true); setErr(null)
    const clean: Edits = { edits: Object.fromEntries(Object.entries(e.edits).filter(([, v]) => Object.keys(v).length)), added: e.added }
    try {
      const r = await fetch('/api/roadmap/edits', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(clean) })
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `Server error ${r.status}`)
      window.dispatchEvent(new Event('halolabs:data'))
      onClose()
    } catch (x) { setErr((x as Error).message); setBusy(false) }
  }

  return (
    <div className="rme-back" onClick={onClose}>
      <div className="rme" role="dialog" aria-label="Edit roadmap" onClick={ev => ev.stopPropagation()}>
        <div className="rme-head">
          <div><div className="rme-title">Edit roadmap</div>
            <div className="rme-sub">Changes are kept on top of your roadmap file, so uploading a new version doesn't undo them.</div></div>
          <button className="rme-x" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="rme-list">
          {rows.filter(r => !r.hidden).map(r => (
            <Row key={r.name} name={r.name} badge={r.edited ? 'Edited' : ''} date={r.date} range={r.dateRange} status={r.status} target={r.targetTime} reg={r.registeredOn}
              race={r.big || isRace(r.name) || r.name === plan.goal.event} onChange={p => setFile(r.name, p)}
              actions={<>{r.edited && <button className="rme-link" onClick={() => revert(r.name)}>Undo changes</button>}
                {r.name !== plan.goal.event && <button className="rme-link" onClick={() => hide(r.name, true)}>Hide</button>}</>} />
          ))}
          {e.added.map((a, i) => (
            <Row key={'a' + i} name={a.name} badge="Added" date={a.date ?? null} range={a.date_range ?? null} status={a.status ?? 'upcoming'} target={a.target_time ?? null}
              reg={a.registered_on ?? null} race onChange={p => setAdded(i, p)} actions={<button className="rme-link" onClick={() => remove(i)}>Remove</button>} />
          ))}
        </div>

        <div className="rme-add">
          <div className="rme-label">Add a race or milestone</div>
          <div className="rme-addrow">
            <input className="rme-in rme-grow" placeholder="Name, e.g. Spring 10K" value={draft.name} maxLength={120} onChange={ev => setDraft({ ...draft, name: ev.target.value })} />
            <input className="rme-in" type="date" value={draft.date} onChange={ev => setDraft({ ...draft, date: ev.target.value })} />
            <select className="rme-in" value={draft.status} onChange={ev => setDraft({ ...draft, status: ev.target.value })}>
              {STATUS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <button className="rme-btn" onClick={add}>Add</button>
          </div>
        </div>

        {hiddenFile.length > 0 && (
          <div className="rme-hidden"><span className="rme-label">Hidden</span>
            {hiddenFile.map(n => <button key={n} className="rme-chip" onClick={() => hide(n, false)}>{n} · show</button>)}</div>
        )}

        {err && <div className="rme-err">{err}</div>}
        <div className="rme-foot">
          <button className="rme-link" onClick={onClose}>Cancel</button>
          <button className="rme-btn rme-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}

function Row(p: { name: string; badge: string; date: string | null; range: string | null; status: string; target: string | null; reg: string | null; race: boolean
  onChange: (patch: Edit) => void; actions: React.ReactNode }) {
  const known = STATUS.some(([k]) => k === p.status)
  return (
    <div className="rme-row">
      <div className="rme-name">{p.name}{p.badge && <span className="rme-badge">{p.badge}</span>}</div>
      <div className="rme-fields">
        {p.date && !/^\d{4}-\d{2}-\d{2}$/.test(p.date)
          ? <span className="rme-fixed">{p.date}</span>
          : p.date || !p.range
          ? <input className="rme-in" type="date" value={p.date ?? ''} aria-label="Date" onChange={ev => ev.target.value && p.onChange({ date: ev.target.value })} />
          : <input className="rme-in rme-grow" value={p.range} maxLength={60} aria-label="When" onChange={ev => p.onChange({ date_range: ev.target.value })} />}
        <select className="rme-in" value={p.status} aria-label="Status" onChange={ev => p.onChange({ status: ev.target.value })}>
          {!known && <option value={p.status}>{p.status}</option>}
          {STATUS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        {p.status === 'registered' && <label className="rme-mini">on <input className="rme-in" type="date" value={p.reg ?? ''} onChange={ev => ev.target.value && p.onChange({ registered_on: ev.target.value })} /></label>}
        {p.race && <input className="rme-in rme-time" placeholder="Goal time" value={p.target ?? ''} maxLength={20} aria-label="Goal time" onChange={ev => p.onChange({ target_time: ev.target.value || null })} />}
      </div>
      <div className="rme-actions">{p.actions}</div>
    </div>
  )
}

/** Edit fields in the milestone's camelCase shape, for display. */
function pick(x: Edit | undefined) {
  if (!x) return {}
  const o: Record<string, unknown> = {}
  if (x.date !== undefined) o.date = x.date
  if (x.date_range !== undefined) o.dateRange = x.date_range
  if (x.status !== undefined) o.status = x.status
  if (x.target_time !== undefined) o.targetTime = x.target_time
  if (x.registered_on !== undefined) o.registeredOn = x.registered_on
  return o
}
