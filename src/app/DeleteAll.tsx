import { useState } from 'react'

/** Settings card: Delete all data (POST /api/wipe). Clears the database and this browser's saved state, then reloads
 *  into the setup guide. Passkeys, API keys and settings stay unless their boxes are ticked; with passkeys gone, the
 *  new setup code is shown here first, since the lock screen asks for it. */
export function DeleteAll() {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [keys, setKeys] = useState(false)
  const [passkeys, setPasskeys] = useState(false)
  const [code, setCode] = useState<string | null>(null)
  const wipe = async () => {
    setBusy(true); setErr(null)
    try {
      const r = await fetch('/api/wipe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: typed.trim(), keys, passkeys }) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error ?? `Server error ${r.status}`)
      try { localStorage.clear(); sessionStorage.clear() } catch { /* private mode */ }
      // This tab's lock screen fills the code in (sessionStorage: this tab only, gone when it closes).
      if (d.setupCode) { try { sessionStorage.setItem('halo-setup-code', d.setupCode) } catch { /* private mode */ } setCode(d.setupCode); return }
      location.replace('/')
    } catch (x) { setErr((x as Error).message); setBusy(false) }
  }
  return (
    <section className="card danger-zone">
      <header className="card-head"><h2>Delete all data</h2></header>
      <p className="hint" style={{ marginBottom: 12 }}>
        Start over with a clean slate: deletes every workout, recovery and sleep record, labs, scans, food, journal,
        roadmap, week plans, the coach's memory and chat, your WHOOP and Strava connections, and every uploaded file.
        Off-site backups aren't touched. This can't be undone.
      </p>
      {code ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p className="banner good">Everything is deleted. Your new setup code is <b style={{ fontFamily: "'Space Grotesk',monospace", letterSpacing: '0.08em' }}>{code}</b></p>
          <p className="hint">Write it down: the lock screen asks for it to create a new passkey. You can also get it in Terminal with <code>./halo setup-code</code>.</p>
          <div><button className="btn primary" onClick={() => location.replace('/')}>Continue</button></div>
        </div>
      ) : !open
        ? <button className="btn danger" onClick={() => setOpen(true)}>Delete all data…</button>
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label className="wipe-opt"><input type="checkbox" checked={keys} onChange={e => setKeys(e.target.checked)} disabled={busy} />
              <span>Also delete API keys and settings <span className="hint">(Claude, ElevenLabs, WHOOP, Strava, Backblaze, and your name). Otherwise they stay.</span></span></label>
            <label className="wipe-opt"><input type="checkbox" checked={passkeys} onChange={e => setPasskeys(e.target.checked)} disabled={busy} />
              <span>Also delete passkeys <span className="hint">(and iPhone upload links). Signs you out everywhere; you'll get a new setup code. Otherwise they stay.</span></span></label>
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
