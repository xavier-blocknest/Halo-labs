import { useCallback, useEffect, useState } from 'react'
import { FoldCard, FoldGroup } from './Fold'

type Note = { id: string; text: string; kind: string; created: string; updated: string; source: 'auto' | 'user' }
type Memory = { notes: Note[]; history: { turns: number; first: string | null; last: string | null; embedded: number }; embeddings: boolean | null; kinds: string[] }

const LABEL: Record<string, string> = { injury: 'Injuries & pain', preference: 'Preferences', decision: 'Decisions', goal: 'Goals', 'follow-up': 'Follow up', fact: 'Other' }
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—')

/** Settings card: what the Coach remembers (notes, editable) and the stored conversation history. */
export function CoachMemory() {
  const [m, setM] = useState<Memory | null>(null)
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null)
  const [draft, setDraft] = useState({ text: '', kind: 'fact' })
  const load = useCallback(() => { fetch('/api/memory').then(r => r.json()).then(setM).catch(() => {}) }, [])
  useEffect(load, [load])

  const call = async (url: string, method: string, body?: unknown, ok?: string) => {
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
    const d = await r.json().catch(() => ({}))
    setMsg(r.ok ? (ok ? { text: ok } : null) : { text: d.error ?? 'Something went wrong.', bad: true }); load()
    return r.ok
  }
  const edit = (n: Note) => { const t = prompt('Edit this note', n.text); if (t !== null && t.trim() && t !== n.text) call(`/api/memory/notes/${n.id}`, 'PUT', { text: t, kind: n.kind }, 'Note updated.') }
  const del = (n: Note) => { if (confirm(`Forget this?\n\n"${n.text}"`)) call(`/api/memory/notes/${n.id}`, 'DELETE', undefined, 'Forgotten.') }
  const add = async () => { if (await call('/api/memory/notes', 'POST', draft, 'Saved.')) setDraft({ text: '', kind: draft.kind }) }
  const wipe = () => { if (confirm('Delete the whole conversation history? Notes stay unless you delete them too.')) call('/api/memory/history', 'DELETE', undefined, 'Conversation history deleted.') }

  if (!m) return null
  const groups = m.kinds.map(k => [k, m.notes.filter(n => n.kind === k)] as const).filter(([, ns]) => ns.length)
  return (
    <FoldCard title="Coach memory" meta={`${m.notes.length} ${m.notes.length === 1 ? 'note' : 'notes'}`}>
      <p className="hint" style={{ marginBottom: 12 }}>
        Your coach keeps these notes from your conversations and uses them in every answer, along with the past exchanges most
        relevant to your question. Say "remember…" or "forget…" in chat or voice, or edit them here. Notes are stored encrypted on your Mac; the relevant ones go to Claude with each question.
      </p>
      {groups.length === 0 && <p className="hint">No notes yet. They appear after your next conversation.</p>}
      {groups.map(([k, ns]) => (
        <FoldGroup key={k} label={LABEL[k] ?? k} count={ns.length}>
          <ul className="sources">
            {ns.map(n => (
              <li key={n.id}>
                <span className="dot ok" aria-hidden />
                <div className="source-main">
                  <div className="source-name" style={{ fontWeight: 400 }}>{n.text}</div>
                  <div className="source-meta">{n.source === 'user' ? 'Added by you' : 'Noted by the coach'} · {day(n.updated)}</div>
                </div>
                <div className="source-actions" style={{ flexDirection: 'row', gap: 6 }}>
                  <button className="btn" onClick={() => edit(n)}>Edit</button>
                  <button className="btn" onClick={() => del(n)}>Forget</button>
                </div>
              </li>
            ))}
          </ul>
        </FoldGroup>
      ))}
      <div className="source-actions" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, justifyContent: 'flex-start' }}>
        <input className="btn" style={{ flex: '1 1 240px', textAlign: 'left', background: 'transparent' }} placeholder="Add a note, e.g. I don't eat pork" maxLength={300}
          value={draft.text} onChange={e => setDraft({ ...draft, text: e.target.value })} onKeyDown={e => e.key === 'Enter' && draft.text.trim() && add()} />
        <select className="btn" style={{ background: 'transparent' }} value={draft.kind} onChange={e => setDraft({ ...draft, kind: e.target.value })}>
          {m.kinds.map(k => <option key={k} value={k}>{LABEL[k] ?? k}</option>)}
        </select>
        <button className="btn" disabled={!draft.text.trim()} onClick={add}>Add</button>
      </div>
      <div className="source-actions" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 16, justifyContent: 'space-between' }}>
        <span className="hint">
          {m.history.turns ? `${m.history.turns} exchanges remembered since ${day(m.history.first)}` : 'No conversation history yet'}
          {m.embeddings === false ? ' · recall is paused: the embedding model (OLLAMA_URL) isn\'t reachable' : ''}
        </span>
        {m.history.turns > 0 && <button className="btn" onClick={wipe}>Delete conversation history</button>}
      </div>
      {msg && <p className={`banner ${msg.bad ? 'alert' : 'good'}`} style={{ marginTop: 12 }}>{msg.text}</p>}
    </FoldCard>
  )
}
