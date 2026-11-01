import { useEffect, useState } from 'react'
import { NOTES_MAX, coachNotes, saveCoachNotes } from '../coachPersona'
import { isSample } from '../sampleMode'

/** Settings card: standing instructions the athlete gives the coach (tone, focus, length, topics). They apply to
 *  whichever coach is active, in chat, voice and the morning brief, and sync across devices (im4-coachnotes). */
export function CoachInstructions() {
  const [saved, setSaved] = useState(coachNotes())
  const [text, setText] = useState(saved)
  const [msg, setMsg] = useState('')
  useEffect(() => {
    const on = () => { const t = coachNotes(); setSaved(t); setText(t) }
    window.addEventListener('halolabs:coach', on)
    return () => window.removeEventListener('halolabs:coach', on)
  }, [])
  const dirty = text.trim() !== saved
  const save = () => { saveCoachNotes(text); setMsg(isSample() ? 'Saved on this device only (sample data).' : 'Saved. The coach uses these from the next message.') }
  const clear = () => {
    if (!confirm('Remove all your coach instructions?')) return
    saveCoachNotes(''); setMsg('Removed.')
  }
  return (
    <section className="card">
      <header className="card-head"><h2>Coach instructions</h2></header>
      <p className="hint" style={{ marginBottom: 12 }}>
        Tell the coach how you want to be coached. These apply to every coach, in chat, voice and the morning brief.
        Facts about you (injuries, foods, schedule) are better told to the coach in chat: they go to Coach memory.
      </p>
      <textarea className="input" value={text} rows={6} maxLength={NOTES_MAX}
        onChange={e => { setText(e.target.value); setMsg('') }}
        placeholder={'Examples:\n• Keep answers under 100 words.\n• Always give paces in min/km.\n• Focus on my swim technique this block.\n• Don\'t bring up nutrition unless I ask.'} />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
        <button className="btn primary" disabled={!dirty} onClick={save}>Save</button>
        {dirty && <button className="btn" onClick={() => { setText(saved); setMsg('') }}>Cancel</button>}
        {saved && !dirty && <button className="btn danger" onClick={clear}>Remove</button>}
        <span className="hint">{msg || `${text.length} / ${NOTES_MAX}`}</span>
      </div>
    </section>
  )
}
