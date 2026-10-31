import { useCallback, useEffect, useState } from 'react'

type Last = { at: string; ok: boolean; name?: string; bytes?: number; seconds?: number; error?: string; stored?: number; storedBytes?: number; lastOk?: string }
type Status = { configured: boolean; running: boolean; last: Last | null }

const when = (iso?: string) => (iso ? new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'never')
const mb = (b?: number) => (b == null ? '—' : `${(b / 1e6).toFixed(1)} MB`)

/** Settings card: optional nightly encrypted backups to Backblaze B2 (server/backup.ts). */
export function Backups() {
  const [s, setS] = useState<Status | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null)
  const load = useCallback(() => { fetch('/api/backups').then(r => r.json()).then(setS).catch(() => {}) }, [])
  useEffect(load, [load])

  async function now() {
    setBusy(true); setMsg(null)
    const r = await fetch('/api/backups/run', { method: 'POST' }), d = await r.json().catch(() => ({}))
    setMsg(r.ok ? { text: `Backed up: ${mb(d.bytes)} in ${d.seconds}s.` } : { text: d.error ?? 'Backup failed.', bad: true })
    setBusy(false); load()
  }

  if (!s) return null
  const L = s.last, stale = !L?.lastOk || Date.now() - Date.parse(L.lastOk) > 36 * 3600_000
  return (
    <section className="card">
      <header className="card-head"><h2>Backups</h2></header>
      {!s.configured ? <p className="hint">Off-site backups are off. Your data folder is already covered by Time Machine if you use it; for an off-site copy, add a Backblaze B2 key under APIs.</p> : (<>
        <ul className="sources">
          <li>
            <span className={`dot ${L?.ok && !stale ? 'ok' : 'stale'}`} aria-hidden />
            <div className="source-main">
              <div className="source-name">Backblaze B2 · nightly at about 3 AM</div>
              <div className="source-meta">
                Last backup {when(L?.lastOk)}{L?.ok ? ` · ${mb(L.bytes)}` : ''}{L?.stored ? ` · ${L.stored} stored (${mb(L.storedBytes)})` : ''}
                {L && !L.ok ? ` · last attempt ${when(L.at)} failed: ${L.error}` : ''}
              </div>
            </div>
            <div className="source-actions"><button className="btn" disabled={busy || s.running} onClick={now}>{busy || s.running ? 'Backing up…' : 'Back up now'}</button></div>
          </li>
        </ul>
        <p className="hint" style={{ marginTop: 10 }}>
          Everything is encrypted on your Mac before upload; Backblaze only stores a sealed file. Keeps 14 nightly, 8 weekly and
          12 monthly copies. Restoring needs your database key: keep the recovery kit in your password manager.
        </p>
      </>)}
      {msg && <p className={`banner ${msg.bad ? 'alert' : 'good'}`} style={{ marginTop: 12 }}>{msg.text}</p>}
    </section>
  )
}
