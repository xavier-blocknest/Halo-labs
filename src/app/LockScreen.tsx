import { startAuthentication, startRegistration } from '@simplewebauthn/browser'
import { useState } from 'react'

async function post<T>(path: string, body: unknown = {}): Promise<T> {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`)
  return data
}

/** Adds a passkey. First-time setup passes the setup code; later ones need a signed-in session. */
export async function addPasskey(name: string, setupCode?: string) {
  const { flow, options } = await post<{ flow: string; options: Parameters<typeof startRegistration>[0]['optionsJSON'] }>('/auth/register/options', { setupCode })
  const response = await startRegistration({ optionsJSON: options })
  await post('/auth/register/verify', { flow, response, name, setupCode })
}

const friendly = (e: unknown) => {
  const err = e as Error
  if (err.name === 'NotAllowedError') return 'Cancelled, or no matching passkey on this device.'
  if (err.name === 'InvalidStateError') return 'This device already has a Halo Labs passkey.'
  return err.message
}

const deviceName = () => {
  const ua = navigator.userAgent
  return /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Macintosh/.test(ua) ? 'Mac' : /Android/.test(ua) ? 'Android' : 'This device'
}

export function LockScreen({ setup, onUnlocked }: { setup: boolean; onUnlocked: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const secure = window.isSecureContext && !!window.PublicKeyCredential

  async function unlock() {
    setBusy(true); setError(null)
    try {
      const { flow, options } = await post<{ flow: string; options: Parameters<typeof startAuthentication>[0]['optionsJSON'] }>('/auth/login/options')
      const response = await startAuthentication({ optionsJSON: options })
      await post('/auth/login/verify', { flow, response })
      onUnlocked()
    } catch (e) { setError(friendly(e)) }
    setBusy(false)
  }

  async function create() {
    setBusy(true); setError(null)
    try { await addPasskey(deviceName(), code); onUnlocked() } catch (e) { setError(friendly(e)) }
    setBusy(false)
  }

  return (
    <div className="lock">
      <div className="lock-card">
        <span className="lock-ring" aria-hidden><span /></span>
        <div className="lock-brand">HALO<small>LABS</small></div>
        {!secure ? (
          <p className="lock-text">Passkeys need a secure address. On the Mac, open <a href="http://localhost:8787">localhost:8787</a>; on a phone, use the Tailscale HTTPS address (see the README).</p>
        ) : setup ? (
          <>
            <p className="lock-text">Create a passkey to lock Halo Labs. Enter the one-time setup code (in Terminal: <code>./halo setup-code</code>).</p>
            <input className="lock-input" value={code} onChange={e => setCode(e.target.value)} placeholder="Setup code" autoCapitalize="characters" autoComplete="one-time-code" spellCheck={false}
              onKeyDown={e => { if (e.key === 'Enter' && code.trim()) void create() }} />
            <button className="lock-btn" disabled={busy || !code.trim()} onClick={create}>{busy ? 'Waiting for passkey…' : 'Create passkey'}</button>
          </>
        ) : (
          <>
            <p className="lock-text">Locked. Syncing continues in the background.</p>
            <button className="lock-btn" disabled={busy} onClick={unlock} autoFocus>{busy ? 'Waiting for passkey…' : 'Unlock with passkey'}</button>
          </>
        )}
        {error && <p className="lock-error">{error}</p>}
      </div>
    </div>
  )
}
