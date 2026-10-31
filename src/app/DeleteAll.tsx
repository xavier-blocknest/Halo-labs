import { useState } from 'react'

/** Settings card: Delete all data (POST /api/wipe). Clears the database and this browser's saved state, then reloads
 *  into the setup guide. Passkeys, API keys and settings stay, so he can get straight back in. */
export function DeleteAll() {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const wipe = async () => {
    setBusy(true); setErr(null)
    try {
      const r = await fetch('/api/wipe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: typed.trim() }) })
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `Server error ${r.status}`)
      try { localStorage.clear(); sessionStorage.clear() } catch { /* private mode */ }
      location.replace('/')
    } catch (x) { setErr((x as Error).message); setBusy(false) }
  }
  return (
    <section className="card">
      <header className="card-head"><h2>Delete all data</h2></header>
      <p className="hint" style={{ marginBottom: 12 }}>
        Start over with a clean slate: deletes every workout, recovery and sleep record, labs, scans, food, journal,
        roadmap, week plans, the coach's memory and chat, your WHOOP and Strava connections, and every uploaded file.
        Your passkeys, API keys and settings stay. Off-site backups aren't touched. This can't be undone.
      </p>
      {!open
        ? <button className="btn danger" onClick={() => setOpen(true)}>Delete all data…</button>
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label className="hint" htmlFor="wipe-confirm">Type <b>DELETE</b> to confirm.</label>
            <input id="wipe-confirm" className="input" value={typed} onChange={e => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" placeholder="DELETE" />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn danger" disabled={busy || typed.trim() !== 'DELETE'} onClick={wipe}>{busy ? 'Deleting…' : 'Delete everything'}</button>
              <button className="btn" disabled={busy} onClick={() => { setOpen(false); setTyped(''); setErr(null) }}>Cancel</button>
            </div>
            {err && <p className="banner alert">{err}</p>}
          </div>
        )}
    </section>
  )
}
