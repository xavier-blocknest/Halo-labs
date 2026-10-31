import { useCallback, useEffect, useState } from 'react'

type Device = { id: string; label: string; endpoint: string; created: string; lastSent: string | null; service: string }
type Kind = 'call' | 'problems' | 'calendar'
type Status = { publicKey: string; prefs: { call: boolean; problems: boolean; calendar: boolean }; devices: Device[] }

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'never')
const supported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent)
const deviceLabel = () => (/iPhone/.test(navigator.userAgent) ? 'iPhone' : /iPad/.test(navigator.userAgent) ? 'iPad' : /Macintosh/.test(navigator.userAgent) ? 'Mac' : /Android/.test(navigator.userAgent) ? 'Android' : 'Browser')
const b64 = (s: string) => { const p = (s + '='.repeat((4 - (s.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'); return Uint8Array.from(atob(p), c => c.charCodeAt(0)) }

const KINDS: { k: Kind; name: string; what: string }[] = [
  { k: 'call', name: "Today's call", what: 'Hard, Easy or Rest, once a day when WHOOP has your recovery (4 AM–2 PM)' },
  { k: 'calendar', name: 'Calendar', what: '48 hours, 24 hours and 30 minutes before each event (all-day items: 8 AM two days and one day before)' },
  { k: 'problems', name: 'Sync problems', what: 'WHOOP or Strava failing 3 times in a row or needing you to reconnect, and when it recovers' },
]

/** Settings card: Web Push to this device (server/push.ts, public/sw.js). */
export function Notifications() {
  const [s, setS] = useState<Status | null>(null)
  const [mine, setMine] = useState<string | null>(null) // this device's push endpoint, when subscribed
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null)

  const load = useCallback(() => {
    fetch('/api/push').then(r => r.json()).then(setS).catch(() => {})
    if (supported()) navigator.serviceWorker.getRegistration().then(r => r?.pushManager.getSubscription()).then(sub => setMine(sub?.endpoint ?? null)).catch(() => {})
  }, [])
  useEffect(load, [load])

  async function enable() {
    if (!s) return
    setBusy(true); setMsg(null)
    try {
      // Must run straight from the tap: iOS only shows the permission prompt for a user gesture.
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') throw new Error(perm === 'denied' ? 'Notifications are blocked for Halo Labs. On iPhone: Settings app → Notifications → Halo Labs. On a Mac: the browser’s settings for this site.' : 'Permission not given.')
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const old = await reg.pushManager.getSubscription()
      const sub = old ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(s.publicKey) })
      const r = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub.toJSON(), label: deviceLabel() }) })
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? 'Could not save this device.')
      setMsg({ text: 'Notifications are on for this device. Send a test to check.' })
    } catch (e) { setMsg({ text: (e as Error).message, bad: true }) }
    setBusy(false); load()
  }

  async function test(id?: string) {
    setBusy(true); setMsg(null)
    const r = await fetch('/api/push/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }), d = await r.json().catch(() => ({}))
    setMsg(r.ok ? { text: `Sent to ${d.sent} device${d.sent === 1 ? '' : 's'}.` } : { text: d.error ?? 'Sending failed.', bad: true })
    setBusy(false); load()
  }

  async function remove(d: Device) {
    await fetch(`/api/push/devices/${d.id}`, { method: 'DELETE' })
    if (d.endpoint === mine) { const reg = await navigator.serviceWorker.getRegistration(); await (await reg?.pushManager.getSubscription())?.unsubscribe().catch(() => {}) }
    load()
  }

  async function toggle(k: Kind) {
    if (!s) return
    const r = await fetch('/api/push/prefs', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [k]: !s.prefs[k] }) })
    if (r.ok) setS({ ...s, prefs: (await r.json()).prefs })
  }

  if (!s) return null
  const here = supported(), standalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true)
  return (
    <section className="card">
      <header className="card-head"><h2>Notifications</h2></header>
      <ul className="sources">
        {KINDS.map(x => (
          <li key={x.k}>
            <span className={`dot ${s.prefs[x.k] ? 'ok' : ''}`} aria-hidden />
            <div className="source-main"><div className="source-name">{x.name}</div><div className="source-meta">{x.what}</div></div>
            <div className="source-actions"><button className="btn" onClick={() => toggle(x.k)}>{s.prefs[x.k] ? 'On' : 'Off'}</button></div>
          </li>
        ))}
      </ul>
      <h3 className="hint" style={{ margin: '16px 0 6px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Devices</h3>
      {s.devices.length ? (
        <ul className="sources">
          {s.devices.map(d => (
            <li key={d.id}>
              <span className="dot ok" aria-hidden />
              <div className="source-main">
                <div className="source-name">{d.label}{d.endpoint === mine && <span className="status ok">This device</span>}</div>
                <div className="source-meta">Added {when(d.created)} · last notification {when(d.lastSent)}</div>
              </div>
              <div className="source-actions" style={{ flexDirection: 'row', gap: 8 }}>
                <button className="btn" disabled={busy} onClick={() => test(d.id)}>Test</button>
                <button className="btn" onClick={() => remove(d)}>Remove</button>
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="hint">No devices yet.</p>}
      <div className="source-actions" style={{ marginTop: 14, alignItems: 'flex-start' }}>
        {!here ? (
          <p className="hint">{isIos() && !standalone ? 'Open Halo Labs from its Home Screen icon (not Safari) to turn on notifications. No icon yet: run ./halo phone on the Mac, open the address it shows in Safari, then Share → Add to Home Screen.' : 'This browser can’t receive push notifications.'}</p>
        ) : s.devices.some(d => d.endpoint === mine) ? (
          <p className="hint">This device gets notifications.</p>
        ) : (
          <button className="btn" disabled={busy} onClick={enable}>{busy ? 'Turning on…' : 'Turn on for this device'}</button>
        )}
      </div>
      <p className="hint" style={{ marginTop: 10 }}>
        Sent by Halo Labs on your Mac through your browser’s push service (Apple’s for Safari and iPhone), end-to-end encrypted: the
        service relays them but can’t read them. They only go out while Halo Labs is running on the Mac. On iPhone, add the app to
        the Home Screen first (./halo phone, then Share → Add to Home Screen in Safari).
      </p>
      {msg && <p className={`banner ${msg.bad ? 'alert' : 'good'}`} style={{ marginTop: 12 }}>{msg.text}</p>}
    </section>
  )
}
