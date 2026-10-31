import { useCallback, useEffect, useState } from 'react'

type Row = { id: string; group: string; label: string; secret: boolean; hint: string; placeholder?: string; set: boolean; from: 'app' | 'env' | null; value: string | null; last4: string | null }
type Check = { ok: boolean; detail: string }

const TESTS: Record<string, 'claude' | 'elevenlabs'> = { 'Claude (coach)': 'claude', 'ElevenLabs (voice)': 'elevenlabs' }

/** Settings card: API keys and the athlete's name, stored encrypted on the server (server/settings.ts). Secret
 *  values are write-only here: the server only says whether one is set and its last 4 characters. */
export function ApiKeys() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null)
  const [checks, setChecks] = useState<Record<string, Check | 'busy'>>({})

  const load = useCallback(() => { fetch('/api/settings').then(r => r.json()).then(d => setRows(d.settings)).catch(() => {}) }, [])
  useEffect(load, [load])

  async function put(values: Record<string, string>) {
    setBusy(true); setMsg(null)
    const r = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
    const d = await r.json().catch(() => ({}))
    if (r.ok) { setRows(d.settings); setDraft({}); setMsg({ text: 'Saved.' }); window.dispatchEvent(new Event('halolabs:data')) }
    else setMsg({ text: d.error ?? 'Couldn\'t save.', bad: true })
    setBusy(false)
  }

  async function test(kind: 'claude' | 'elevenlabs') {
    setChecks(c => ({ ...c, [kind]: 'busy' }))
    const d = await fetch(`/api/settings/test/${kind}`, { method: 'POST' }).then(r => r.json()).catch(() => ({ ok: false, detail: 'Couldn\'t reach Halo Labs.' }))
    setChecks(c => ({ ...c, [kind]: d }))
  }

  if (!rows) return null
  const groups = [...new Set(rows.map(r => r.group))]
  const dirty = Object.keys(draft).length > 0
  return (
    <section className="card">
      <header className="card-head">
        <h2>APIs</h2>
        <button className="btn" onClick={async () => {
          if (!confirm('Open the setup guide again? Nothing you\'ve saved is removed.')) return
          await fetch('/api/onboarding', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ done: false }) })
          location.reload()
        }}>Run setup again</button>
      </header>
      <p className="hint" style={{ marginBottom: 12 }}>
        Your own keys for the services Halo Labs talks to. They're stored encrypted in your database, never shown again after saving,
        and only sent to the service they belong to. Leave a section empty to switch that feature off.
      </p>
      {groups.map(g => {
        const kind = TESTS[g], check = kind ? checks[kind] : undefined
        return (
          <div key={g} className="api-group">
            <div className="api-group-head">
              <span className="source-name">{g}</span>
              {kind && <button className="btn" disabled={check === 'busy'} onClick={() => test(kind)}>{check === 'busy' ? 'Checking…' : 'Test'}</button>}
            </div>
            {check && check !== 'busy' && <p className={`hint ${check.ok ? 'good' : 'alert'}`}>{check.detail}</p>}
            {rows.filter(r => r.group === g).map(r => (
              <label key={r.id} className="api-row">
                <span className="api-label">{r.label}</span>
                <span className="api-field">
                  <input className="api-input" type={r.secret ? 'password' : 'text'} autoComplete="off" spellCheck={false}
                    value={draft[r.id] ?? (r.secret ? '' : r.value ?? '')}
                    placeholder={r.secret && r.set ? `Saved · ends in ${r.last4 ?? '••••'}${r.from === 'env' ? ' (from .env)' : ''}` : r.placeholder ?? ''}
                    onChange={e => setDraft(d => ({ ...d, [r.id]: e.target.value }))} />
                  {r.secret && r.set && r.from === 'app' && (
                    <button className="btn" type="button" disabled={busy} onClick={() => { if (confirm(`Remove the saved ${g} ${r.label.toLowerCase()}?`)) void put({ [r.id]: '' }) }}>Remove</button>
                  )}
                </span>
                {r.hint && <span className="hint api-hint">{r.hint}</span>}
              </label>
            ))}
          </div>
        )
      })}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
        <button className="btn" disabled={busy || !dirty} onClick={() => put(draft)}>{busy ? 'Saving…' : 'Save'}</button>
        {dirty && <button className="btn" disabled={busy} onClick={() => setDraft({})}>Cancel</button>}
      </div>
      {msg && <p className={`banner ${msg.bad ? 'alert' : 'good'}`} style={{ marginTop: 12 }}>{msg.text}</p>}
    </section>
  )
}
