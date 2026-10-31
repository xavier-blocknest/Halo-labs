import { useCallback, useEffect, useState } from 'react'
import { addPasskey } from './LockScreen'

type Passkey = { id: string; name: string; created: string; lastUsed: string | null; current: boolean }

const when = (utc: string | null) => (utc ? new Date(utc.replace(' ', 'T') + 'Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'never')

/** Settings card: the passkeys that can unlock Halo Labs, add one for this device, sign out. */
const IDLE = [[5, '5 minutes'], [15, '15 minutes'], [60, '1 hour'], [480, '8 hours'], [1440, '1 day']] as const

export function Passkeys() {
  const [keys, setKeys] = useState<Passkey[]>([])
  const [idle, setIdle] = useState<number | null>(null)
  useEffect(() => { fetch('/auth/status').then(r => r.json()).then(s => setIdle(s.idleMinutes)).catch(() => {}) }, [])

  async function changeIdle(minutes: number) {
    const res = await fetch('/api/auth/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idleMinutes: minutes }) })
    if (res.ok) { setIdle(minutes); setMsg({ text: 'Auto-lock updated.' }); window.dispatchEvent(new Event('halolabs:auth')) }
    else setMsg({ text: 'Could not change auto-lock.', bad: true })
  }
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null)
  const load = useCallback(() => { fetch('/api/passkeys').then(r => r.json()).then(setKeys).catch(() => {}) }, [])
  useEffect(load, [load])

  async function add() {
    const name = prompt('Name this passkey (for example "iPhone" or "Work laptop")', '')
    if (name === null) return
    try { await addPasskey(name); setMsg({ text: 'Passkey added.' }); load() }
    catch (e) { setMsg({ text: (e as Error).name === 'InvalidStateError' ? 'This device already has a Halo Labs passkey.' : (e as Error).message, bad: true }) }
  }

  async function remove(k: Passkey) {
    if (!confirm(`Remove "${k.name}"? It will no longer unlock Halo Labs.`)) return
    const res = await fetch(`/api/passkeys/${encodeURIComponent(k.id)}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    setMsg(res.ok ? { text: 'Passkey removed.' } : { text: data.error ?? 'Could not remove it.', bad: true })
    if (res.ok && k.current) location.reload()
    load()
  }

  async function signOut() {
    await fetch('/auth/logout', { method: 'POST' })
    location.reload()
  }

  return (
    <section className="card">
      <header className="card-head">
        <h2>Passkeys</h2>
        <button className="link" onClick={signOut}>Lock now</button>
      </header>
      <div className="source-actions" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, justifyContent: 'flex-start' }}>
        <span className="hint" style={{ fontSize: 13, color: 'var(--t2)' }}>Lock after</span>
        <select className="btn" value={idle ?? ''} onChange={e => changeIdle(Number(e.target.value))} style={{ background: 'transparent' }}>
          {IDLE.map(([m, label]) => <option key={m} value={m}>{label}</option>)}
        </select>
        <span className="hint">of inactivity · always after 30 days</span>
      </div>
      <ul className="sources">
        {keys.map(k => (
          <li key={k.id}>
            <span className="dot ok" aria-hidden />
            <div className="source-main">
              <div className="source-name">{k.name}{k.current && <span className="status ok">This session</span>}</div>
              <div className="source-meta">Added {when(k.created)} · last used {when(k.lastUsed)}</div>
            </div>
            <div className="source-actions">
              <button className="btn" onClick={() => remove(k)}>Remove</button>
            </div>
          </li>
        ))}
      </ul>
      <div className="source-actions" style={{ marginTop: 14, alignItems: 'flex-start' }}>
        <button className="btn" onClick={add}>Add a passkey on this device</button>
        <span className="hint">Passkeys in iCloud Keychain or Google Password Manager also work on your other devices.</span>
      </div>
      {msg && <p className={`banner ${msg.bad ? 'alert' : 'good'}`} style={{ marginTop: 12 }}>{msg.text}</p>}
    </section>
  )
}
