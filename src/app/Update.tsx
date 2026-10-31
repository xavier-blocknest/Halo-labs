// New-version banner (over the dashboard) and Settings → Updates. The server checks GitHub every few hours
// (server/update.ts); "Update now" merges the new commits, then this page waits for the server to report the new
// version (it restarts when server code changes) and reloads.
import { useCallback, useEffect, useState } from 'react'

type Status = { current: string | null; latest: string | null; behind: number; changes: string[]; checkedAt: string | null; error: string | null; updating: boolean; terminal: boolean }
const DISMISSED = 'halo-update-later' // the version "Later" was clicked for (this device)
const POLL_MS = 30 * 60_000

const getStatus = (): Promise<Status | null> => fetch('/api/update/status').then(r => (r.ok ? r.json() : null)).catch(() => null)

/** Update, then reload once the server reports nothing left to update (the new version may be a merge commit, so
 *  it's not `latest` itself). Throws with the reason when the update can't run. */
async function runUpdate() {
  const r = await fetch('/api/update', { method: 'POST' }).catch(() => null) // the server may restart before answering
  if (r && !r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `Server error ${r.status}`)
  for (let i = 0; i < 90; i++) {
    await new Promise(res => setTimeout(res, 2000))
    const s = await getStatus()
    if (s && !s.behind && !s.updating && !s.error) { await new Promise(res => setTimeout(res, 3000)); location.reload(); return } // let vite finish the new build
  }
  throw new Error('The update is taking longer than expected. Reload the page in a minute, or run ./halo update in Terminal.')
}

function useUpdate() {
  const [s, setS] = useState<Status | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const load = useCallback(() => { void getStatus().then(setS) }, [])
  useEffect(() => { load(); const t = setInterval(load, POLL_MS); return () => clearInterval(t) }, [load])
  const update = async () => {
    if (!s?.behind) return
    setBusy(true); setErr(null)
    try { await runUpdate() } catch (e) { setErr((e as Error).message); setBusy(false) }
  }
  return { s, setS, busy, err, update }
}

export function UpdateBanner() {
  const { s, busy, err, update } = useUpdate()
  const [later, setLater] = useState(() => { try { return localStorage.getItem(DISMISSED) } catch { return null } })
  if (!s || !s.behind || !s.latest || (later === s.latest && !busy)) return null
  const dismiss = () => { try { localStorage.setItem(DISMISSED, s.latest!) } catch { /* private mode */ } setLater(s.latest) }
  return (
    <div className="upd-bar" role="status">
      <span className="upd-dot" aria-hidden />
      <span className="upd-text">
        <b>{busy ? 'Updating Halo Labs…' : 'A new version of Halo Labs is available'}</b>
        {!busy && s.changes[0] && <span> · {s.changes[0]}{s.behind > 1 ? ` and ${s.behind - 1} more` : ''}</span>}
        {err && <span className="upd-err">{err}</span>}
        {!err && s.terminal && !busy && <span className="upd-err">This one installs new parts: run <code>./halo update</code> in Terminal.</span>}
      </span>
      {!s.terminal && <button className="upd-go" disabled={busy} onClick={update}>{busy ? 'Updating…' : 'Update now'}</button>}
      {!busy && <button className="upd-later" onClick={dismiss}>Later</button>}
    </div>
  )
}

export function UpdatesCard() {
  const { s, setS, busy, err, update } = useUpdate()
  const [checking, setChecking] = useState(false)
  const check = async () => { setChecking(true); setS(await fetch('/api/update/check', { method: 'POST' }).then(r => r.json()).catch(() => s)); setChecking(false) }
  if (!s) return null
  const when = s.checkedAt ? new Date(s.checkedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : null
  return (
    <section className="card">
      <header className="card-head"><h2>Updates</h2><button className="btn" disabled={checking || busy} onClick={check}>{checking ? 'Checking…' : 'Check now'}</button></header>
      <p className="hint" style={{ marginBottom: 8 }}>
        Version {s.current ?? 'unknown'}{when ? ` · checked ${when}` : ''}. Halo Labs checks for a new version every few hours.
      </p>
      {s.error && <p className="banner alert">{s.error}</p>}
      {!s.error && !s.behind && s.checkedAt && <p className="hint good">You're on the latest version.</p>}
      {s.behind > 0 && (
        <>
          <p className="hint">{s.behind} new change{s.behind === 1 ? '' : 's'}:</p>
          <ul className="upd-list">{s.changes.map((c, i) => <li key={i}>{c}</li>)}</ul>
          {s.terminal
            ? <p className="hint">This update installs new parts, so it runs from Terminal: <code>./halo update</code></p>
            : <button className="btn primary" disabled={busy} onClick={update}>{busy ? 'Updating… the page reloads when it’s done' : 'Update now'}</button>}
        </>
      )}
      {err && <p className="banner alert" style={{ marginTop: 8 }}>{err}</p>}
    </section>
  )
}
