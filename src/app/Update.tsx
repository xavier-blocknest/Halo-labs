// New-version banner (over the dashboard) and Settings → Updates. The server checks GitHub every few hours
// (server/update.ts); "Update now" merges the new commits, then this page waits for the server to report the new
// version (it restarts when server code changes) and reloads. With automatic checks switched off (Settings → Updates)
// the banner stays hidden; the card can still check and update by hand.
import { useCallback, useEffect, useState } from 'react'

type Status = { current: string | null; latest: string | null; behind: number; changes: string[]; checkedAt: string | null; error: string | null; updating: boolean; terminal: boolean; auto?: boolean }
const DISMISSED = 'halo-update-later' // the version "Later" was clicked for (this device)
const POLL_MS = 5 * 60_000 // and whenever the page comes back to the foreground

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
  useEffect(() => {
    load()
    const t = setInterval(load, POLL_MS), onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVisible) }
  }, [load])
  const update = async () => {
    if (!s?.behind) return
    setBusy(true); setErr(null)
    try { await runUpdate() } catch (e) { setErr((e as Error).message); setBusy(false) }
  }
  return { s, setS, load, busy, err, update }
}

/** Full-width bar across the top of the page: "New version available. Update now" and an X to dismiss (until the
 *  next version). While it shows, <html> gets .upd-on so the page and its fixed header move down below it. */
export function UpdateBanner() {
  const { s, load, busy, err, update } = useUpdate()
  const [later, setLater] = useState(() => { try { return localStorage.getItem(DISMISSED) } catch { return null } })
  const show = !!(s && s.auto !== false && s.behind && s.latest && (later !== s.latest || busy))
  useEffect(() => { document.documentElement.classList.toggle('upd-on', show); return () => document.documentElement.classList.remove('upd-on') }, [show])
  useEffect(() => { window.addEventListener('halolabs:update', load); return () => window.removeEventListener('halolabs:update', load) }, [load])
  if (!show || !s) return null
  const dismiss = () => { try { localStorage.setItem(DISMISSED, s.latest!) } catch { /* private mode */ } setLater(s.latest) }
  return (
    <div className="upd-bar" role="status">
      <span className="upd-text">
        {busy ? 'Updating Halo Labs… the page reloads when it’s done.'
          : err ? <span className="upd-err">{err}</span>
          : s.terminal ? <>New version available. Run <code>./halo update</code> in Terminal.</>
          : <>New version available. <button className="upd-go" onClick={update}>Update now</button></>}
      </span>
      {!busy && <button className="upd-x" onClick={dismiss} aria-label="Dismiss until the next version">×</button>}
    </div>
  )
}

export function UpdatesCard() {
  const { s, setS, busy, err, update } = useUpdate()
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState(false)
  const setAuto = async (on: boolean) => {
    setSaving(true)
    const next = await fetch('/api/update/auto', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ on }) }).then(r => (r.ok ? r.json() : null)).catch(() => null)
    if (next) setS(next)
    setSaving(false)
    window.dispatchEvent(new Event('halolabs:update')) // the banner follows the switch right away
  }
  const check = async () => {
    setChecking(true); setS(await fetch('/api/update/check', { method: 'POST' }).then(r => r.json()).catch(() => s)); setChecking(false)
    try { localStorage.removeItem(DISMISSED) } catch { /* private mode */ }
    window.dispatchEvent(new Event('halolabs:update')) // the banner shows right away, even if it was dismissed
  }
  if (!s) return null
  const when = s.checkedAt ? new Date(s.checkedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : null
  return (
    <section className="card">
      <header className="card-head"><h2>Updates</h2><button className="btn" disabled={checking || busy} onClick={check}>{checking ? 'Checking…' : 'Check now'}</button></header>
      <p className="hint" style={{ marginBottom: 8 }}>
        Version {s.current ?? 'unknown'}{when ? ` · checked ${when}` : ''}.{' '}
        {s.auto !== false ? 'Halo Labs checks for a new version every 15 minutes.' : 'Automatic checks are off: no update bar, and nothing changes unless you check here.'}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, margin: '4px 0 10px' }}>
        <div>
          <div>Check for updates automatically</div>
          <p className="hint" style={{ margin: '2px 0 0' }}>Turn this off if you've changed Halo Labs' code yourself and don't want update reminders. Updates never install on their own either way.</p>
        </div>
        <button type="button" role="switch" aria-checked={s.auto !== false} aria-label={`Automatic update checks: ${s.auto !== false ? 'on' : 'off'}`} disabled={saving}
          className={`api-switch${s.auto !== false ? ' on' : ''}`} onClick={() => void setAuto(s.auto === false)}><span /></button>
      </div>
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
