import { useCallback, useEffect, useState } from 'react'

/** Settings card: download the database key. Everything is encrypted with it, so without a copy a broken disk or a
 *  deleted .env means the data is gone. Stays highlighted until the kit has been downloaded once. */
export function RecoveryKit() {
  const [saved, setSaved] = useState<string | null | undefined>(undefined)
  const load = useCallback(() => { fetch('/api/recovery-kit/status').then(r => r.json()).then(d => setSaved(d.downloaded)).catch(() => {}) }, [])
  useEffect(load, [load])
  if (saved === undefined) return null
  return (
    <section className={`card${saved ? '' : ' card-warn'}`}>
      <header className="card-head"><h2>Recovery kit</h2></header>
      <p className="hint" style={{ marginBottom: 12 }}>
        All your data is encrypted with one database key, kept in the <code>.env</code> file of your Halo Labs folder.
        If that file is lost, nothing (not even a backup) can be read again. Download the kit and keep it in your password
        manager (for example as a secure note in iCloud Keychain or 1Password), not next to the app.
      </p>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <a className="btn" href="/api/recovery-kit" download onClick={() => setTimeout(load, 1500)}>Download recovery kit</a>
        <span className="hint">{saved ? `Downloaded ${new Date(saved).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : 'Not downloaded yet'}</span>
      </div>
    </section>
  )
}
