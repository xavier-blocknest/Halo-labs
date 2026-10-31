import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import '../styles/global.css'
import { hydrateSharedState } from '../sync'
import { setSample } from '../sampleMode'
import './app.css'
import { LockScreen } from './LockScreen'

type DashboardData = { today: string } & Record<string, unknown>
type Auth = { authenticated: boolean; setup: boolean; idleMinutes: number }

const REFRESH_MS = 5 * 60_000

// The dashboard (pages, builders, coach, voice) is its own chunk: the lock screen loads without it, and it is
// fetched in the background as soon as the app starts, so it is usually ready by the time you unlock.
const loadDashboard = () => import('../legacy/builders').then(() => import('../legacy/logic')).then(m => ({ default: m.Dashboard }))
const Dashboard = lazy(loadDashboard)
const Onboarding = lazy(() => import('./Onboarding').then(m => ({ default: m.Onboarding })))
const FirstRun = lazy(() => import('./Onboarding').then(m => ({ default: m.FirstRun })))
const SampleBanner = lazy(() => import('./Onboarding').then(m => ({ default: m.SampleBanner })))
// First run: 'choose' (set up or sample data), 'setup' (the wizard), 'sample' (sample dashboard), 'done'.
type Stage = 'choose' | 'setup' | 'sample' | 'done'
const putOnboarding = (body: object) => fetch('/api/onboarding', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
const PING_EVERY_MS = 60_000

// A phone can keep the app open for days on an old build. When it comes back to the foreground, compare the entry
// script in a fresh index.html with the one running, and reload if a new version was deployed since.
const entryOf = (html: string) => html.match(/\/assets\/index-[\w-]+\.js/)?.[0] ?? null
const RUNNING = entryOf(document.documentElement.outerHTML)
const reloadIfNewBuild = () => {
  if (!RUNNING) return
  fetch('/', { cache: 'no-store' }).then(r => (r.ok ? r.text() : '')).then(html => { const e = entryOf(html); if (e && e !== RUNNING) location.reload() }).catch(() => {})
}

/** Passkey gate, idle auto-lock, then today's numbers from the server (refreshed in the background). */
export function App() {
  const [auth, setAuth] = useState<Auth | null>(null)
  const [D, setD] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stage, setStage] = useState<Stage | null>(null)
  const sample = stage === 'sample'
  const lastActive = useRef(Date.now())
  const lastPing = useRef(0)

  const checkAuth = useCallback(() => {
    fetch('/auth/status').then(r => r.json()).then(a => { lastActive.current = Date.now(); setAuth(a) }).catch(e => setError(e.message))
  }, [])
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') reloadIfNewBuild() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])
  useEffect(() => {
    checkAuth()
    loadDashboard().catch(() => {}) // warm the chunk while the lock screen is up
    window.addEventListener('halolabs:auth', checkAuth) // e.g. the auto-lock time changed in Settings
    return () => window.removeEventListener('halolabs:auth', checkAuth)
  }, [checkAuth])

  const lock = useCallback(() => {
    setD(null) // drop the data from memory, not just from the screen
    setAuth(a => (a ? { ...a, authenticated: false } : a))
    fetch('/auth/logout', { method: 'POST' }).catch(() => {})
  }, [])

  const load = useCallback(() => {
    fetch(sample ? '/api/sample/dashboard' : '/api/dashboard')
      .then(r => (r.status === 401 ? (lock(), null) : r.ok ? r.json() : Promise.reject(new Error(`Server error ${r.status}`))))
      .then(d => { if (d) { setD(d); setError(null) } })
      .catch(e => setError(e.message))
  }, [lock, sample])

  // Opening or returning to the app: show what we have, then pull WHOOP if it's stale and redraw.
  const loadFresh = useCallback(() => {
    load()
    if (sample) return
    fetch('/api/refresh', { method: 'POST' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (j?.synced) load() })
      .catch(() => {})
  }, [load, sample])

  // First run: choose setup or sample data, then the wizard, until it's finished or skipped (saved server-side,
  // so once per install). A setup already in progress (its step is in localStorage) goes straight back to it.
  useEffect(() => {
    if (!auth?.authenticated) { setStage(null); return }
    fetch('/api/onboarding').then(r => (r.ok ? r.json() : { done: true }))
      .then(o => setStage(o.done ? 'done' : o.mode === 'sample' ? 'sample' : localStorage.getItem('halo-onboarding') ? 'setup' : 'choose'))
      .catch(() => setStage('done'))
  }, [auth?.authenticated])
  useEffect(() => { setSample(sample); setD(null) }, [sample])

  useEffect(() => {
    if (!auth?.authenticated || stage === null || stage === 'choose' || stage === 'setup') return
    const idleMs = auth.idleMinutes * 60_000
    const idleTooLong = () => Date.now() - lastActive.current > idleMs
    // Taps, clicks, keys and scrolling count as use; the background refresh does not.
    const onActivity = () => {
      lastActive.current = Date.now()
      if (Date.now() - lastPing.current > PING_EVERY_MS) { lastPing.current = Date.now(); fetch('/auth/ping', { method: 'POST' }).catch(() => {}) }
    }
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const
    events.forEach(e => window.addEventListener(e, onActivity, { passive: true, capture: true }))
    // Phones pause timers in the background, so also check the moment the app comes back.
    const onVisible = () => { if (document.visibilityState !== 'visible') return; if (idleTooLong()) lock(); else loadFresh() }
    document.addEventListener('visibilitychange', onVisible)
    const idleTimer = setInterval(() => { if (idleTooLong()) lock() }, 15_000)
    const refresh = setInterval(load, REFRESH_MS)
    window.addEventListener('halolabs:data', load) // e.g. the roadmap was edited
    // Sample mode never mirrors browser state to the server; real mode does (and drops anything left from the demo).
    if (sample) loadFresh(); else hydrateSharedState().then(loadFresh)
    return () => {
      events.forEach(e => window.removeEventListener(e, onActivity, { capture: true }))
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(idleTimer); clearInterval(refresh)
      window.removeEventListener('halolabs:data', load)
    }
  }, [auth?.authenticated, auth?.idleMinutes, load, loadFresh, lock, stage, sample])

  if (!auth) return <div className="boot-wait">{error ? `Couldn't reach Halo Labs: ${error}` : ''}</div>
  if (!auth.authenticated) return <LockScreen setup={auth.setup} onUnlocked={checkAuth} />
  const wait = <div className="boot-wait" />
  if (stage === null) return wait
  if (stage === 'choose') return <Suspense fallback={wait}><FirstRun onSetup={() => setStage('setup')} onSample={async () => { await putOnboarding({ done: false, mode: 'sample' }); setStage('sample') }} /></Suspense>
  if (stage === 'setup') return <Suspense fallback={wait}><Onboarding onDone={() => setStage('done')} /></Suspense>
  if (!D) return <div className="boot-wait">{error ? `Couldn't load your data: ${error}` : sample ? 'Loading the sample athlete…' : ''}</div>
  return (
    <Suspense fallback={wait}>
      <Dashboard key={sample ? 'sample' : 'real'} D={D} onLock={lock} />
      {sample && <SampleBanner onSetup={async () => { await putOnboarding({ done: false }); setStage('setup') }} />}
    </Suspense>
  )
}
