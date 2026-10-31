import { useCallback, useEffect, useState } from 'react'

type Token = { id: string; label: string; created: string; lastUsed: string | null; uses: number }

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'never')

/** Settings card: upload-only tokens for the iPhone share-sheet Shortcut (POST /hooks/import). */
export function UploadTokens() {
  const [tokens, setTokens] = useState<Token[]>([])
  const [fresh, setFresh] = useState<{ token: string; label: string } | null>(null)
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null)
  const load = useCallback(() => { fetch('/api/upload-tokens').then(r => r.json()).then(setTokens).catch(() => {}) }, [])
  useEffect(load, [load])
  const url = `${location.origin}/hooks/import`

  async function create() {
    const label = prompt('Name this token (for example "iPhone Shortcut")', 'iPhone Shortcut')
    if (label === null) return
    const r = await fetch('/api/upload-tokens', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label }) })
    if (!r.ok) { setMsg({ text: 'Could not create a token.', bad: true }); return }
    const t = await r.json(); setFresh({ token: t.token, label: t.label }); setMsg(null); load()
  }
  async function revoke(t: Token) {
    if (!confirm(`Revoke "${t.label}"? Shortcuts using it will stop working.`)) return
    const r = await fetch(`/api/upload-tokens/${t.id}`, { method: 'DELETE' })
    setMsg(r.ok ? { text: 'Token revoked.' } : { text: 'Could not revoke it.', bad: true }); load()
  }
  const copy = (s: string, what: string) => navigator.clipboard?.writeText(s).then(() => setMsg({ text: `${what} copied.` }), () => setMsg({ text: 'Copy failed; select it and copy by hand.', bad: true }))

  return (
    <section className="card">
      <header className="card-head"><h2>Upload from iPhone</h2></header>
      <p className="hint" style={{ marginBottom: 12 }}>
        Send a MacroFactor or FitnessAI export straight from the share sheet with an iOS Shortcut. Upload tokens can only
        import files; they can't read anything. Needs phone access set up (README → Phone access) and Tailscale on on the iPhone.
      </p>
      {fresh && (
        <div className="banner good" style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <strong>Token for "{fresh.label}". Copy it now; it won't be shown again.</strong>
          <code style={{ wordBreak: 'break-all', userSelect: 'all' }}>{fresh.token}</code>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => copy('Bearer ' + fresh.token, 'Authorization value')}>Copy "Bearer …" value</button>
            <button className="btn" onClick={() => copy(url, 'Upload URL')}>Copy upload URL</button>
          </div>
          <ol style={{ margin: '4px 0 0 18px', lineHeight: 1.6 }}>
            <li>Shortcuts app → <b>+</b> → name it <i>Send to Halo Labs</i>. In its details (ⓘ), turn on <b>Show in Share Sheet</b> and accept <b>Files</b>.</li>
            <li>Add <b>Get Contents of URL</b>. URL: <code>{url}</code>. Method <b>POST</b>.</li>
            <li>Headers: <code>Authorization</code> = the "Bearer …" value; <code>X-Filename</code> = <b>Shortcut Input</b> (tap it and pick <b>Name</b>).</li>
            <li>Request Body: <b>File</b> → <b>Shortcut Input</b>.</li>
            <li>Add <b>Show Result</b> with <b>Contents of URL</b>, so you see what was imported.</li>
            <li>In MacroFactor: export your data, then share the file to <i>Send to Halo Labs</i>.</li>
          </ol>
        </div>
      )}
      <ul className="sources">
        {tokens.map(t => (
          <li key={t.id}>
            <span className="dot ok" aria-hidden />
            <div className="source-main">
              <div className="source-name">{t.label}</div>
              <div className="source-meta">Created {when(t.created)} · last used {when(t.lastUsed)}{t.uses ? ` · ${t.uses} upload${t.uses === 1 ? '' : 's'}` : ''}</div>
            </div>
            <div className="source-actions"><button className="btn" onClick={() => revoke(t)}>Revoke</button></div>
          </li>
        ))}
      </ul>
      <div className="source-actions" style={{ marginTop: 14, alignItems: 'flex-start' }}>
        <button className="btn" onClick={create}>Create an upload token</button>
      </div>
      {msg && <p className={`banner ${msg.bad ? 'alert' : 'good'}`} style={{ marginTop: 12 }}>{msg.text}</p>}
    </section>
  )
}
