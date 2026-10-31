import { useEffect, useState } from 'react'
import { activeCoach, coaches, customCoach, saveCustomCoach, setCoach } from '../coachPersona'

/** Settings card: which coach personality answers in chat, voice and the morning brief (synced across devices),
 *  plus an editor for the athlete's own coach. */
export function CoachPicker() {
  const [id, setId] = useState(activeCoach().id)
  const [, bump] = useState(0)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [persona, setPersona] = useState('')
  useEffect(() => {
    const on = () => { setId(activeCoach().id); bump(n => n + 1) }
    window.addEventListener('halolabs:coach', on)
    return () => window.removeEventListener('halolabs:coach', on)
  }, [])
  const edit = () => { const c = customCoach(); setName(c?.name ?? ''); setPersona(c?.persona ?? ''); setEditing(true) }
  const save = () => { saveCustomCoach({ name: name.trim() || 'My coach', persona }); setCoach('custom'); setEditing(false) }
  const remove = () => {
    if (!confirm('Delete your own coach?')) return
    saveCustomCoach(null); if (id === 'custom') setCoach('coach'); setEditing(false)
  }
  return (
    <section className="card">
      <header className="card-head"><h2>Coach</h2></header>
      <p className="hint" style={{ marginBottom: 12 }}>
        Who answers in chat, voice and the morning brief. All of them use the same data, rules and memory; only the personality changes.
      </p>
      <ul className="sources">
        {coaches().map(c => (
          <li key={c.id}>
            <span className={'dot ' + (c.id === id ? 'ok' : 'off')} aria-hidden />
            <div className="source-main">
              <div className="source-name">{c.name}</div>
              <div className="source-meta">{c.blurb}</div>
            </div>
            <div className="source-actions">
              {c.id === 'custom' && <button className="btn" onClick={edit}>Edit</button>}
              {c.id === id
                ? <span className="hint">Active</span>
                : <button className="btn" onClick={() => setCoach(c.id)}>Use {c.name}</button>}
            </div>
          </li>
        ))}
      </ul>
      {!editing && !customCoach() && <button className="btn" style={{ marginTop: 12 }} onClick={edit}>Write your own coach</button>}
      {editing && (
        <div className="coach-edit" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Coach name (shown in chat)" maxLength={40} />
          <textarea className="input" value={persona} onChange={e => setPersona(e.target.value)} rows={10}
            placeholder={'Describe the coach in your own words: who they are, how they talk, what they push you on, what they never do.\n\nExample: "You are a calm, encouraging coach. Keep answers short. Always explain the why behind a workout. Never swear."'} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn primary" disabled={!persona.trim()} onClick={save}>Save and use</button>
            <button className="btn" onClick={() => setEditing(false)}>Cancel</button>
            {customCoach() && <button className="btn danger" onClick={remove}>Delete</button>}
          </div>
        </div>
      )}
    </section>
  )
}
