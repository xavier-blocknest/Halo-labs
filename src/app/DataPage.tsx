import { useCallback, useEffect, useState } from 'react'
import { getSources, syncNow, type Connector, type Sources } from './api'
import { ApiKeys } from './ApiKeys'
import { Backups } from './Backups'
import { CoachMemory } from './CoachMemory'
import { CoachPicker } from './CoachPicker'
import { FoldCard } from './Fold'
import { Passkeys } from './Passkeys'
import { RecoveryKit } from './RecoveryKit'
import { UploadTokens } from './UploadTokens'
import { DeleteAll } from './DeleteAll'
import { Uploader } from './Uploader'

// Source registry (spec section 03). staleDays: when data this old counts as stale (spec's proposed thresholds).
const SOURCES: { id: string; name: string; what: string; connector?: Connector['id']; staleDays?: number }[] = [
  { id: 'whoop', name: 'WHOOP', what: 'Recovery, HRV, sleep, strain, workouts', connector: 'whoop', staleDays: 2 },
  { id: 'strava', name: 'Strava', what: 'Runs, rides, swims, walks, gear', connector: 'strava', staleDays: 2 },
  { id: 'fitnessai', name: 'FitnessAI', what: 'Strength workouts, sets, muscle activation', staleDays: 7 },
  { id: 'runna', name: 'Runna', what: 'Plan runs and splits' },
  { id: 'macrofactor', name: 'MacroFactor', what: 'Food log, macros, weight trend, expenditure, steps', staleDays: 3 },
  { id: 'labs', name: 'Lab reports', what: 'Bloodwork (Quest Diagnostics PDFs)' },
  { id: 'dexa', name: 'DEXA', what: 'Body composition scans' },
  { id: 'vo2', name: 'VO₂ max', what: 'Thresholds and heart-rate zones' },
]

// [singular, plural]; empty means don't list the kind.
const KIND_LABEL: Record<string, [string, string]> = {
  cycle: ['day', 'days'], sleep: ['sleep', 'sleeps'], nap: ['nap', 'naps'], workout: ['workout', 'workouts'], journal: ['journal answer', 'journal answers'],
  activity: ['activity', 'activities'], gear: ['gear item', 'gear items'], set: ['set', 'sets'], run: ['run', 'runs'], day: ['day', 'days'],
  target: ['target', 'targets'], measurements: ['measurement', 'measurements'], draw: ['draw', 'draws'], result: ['result', 'results'],
  scan: ['scan', 'scans'], test: ['test', 'tests'], body: ['', ''],
}
const countText = (n: number, kind: string) => { const l = KIND_LABEL[kind] ?? [kind, kind]; return `${n.toLocaleString()} ${n === 1 ? l[0] : l[1]}` }

const fmtDay = (d: string | null) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '')
const daysAgo = (d: string) => Math.floor((Date.now() - new Date(`${d}T12:00:00`).getTime()) / 86_400_000)
const fmtWhen = (utc: string) => new Date(utc.replace(' ', 'T') + 'Z').toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

/** `embedded`: shown inside the dashboard's Settings page, which has its own title. */
export function DataPage({ embedded = false }: { embedded?: boolean }) {
  const [data, setData] = useState<Sources | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)

  const load = useCallback(() => {
    getSources().then(d => { setData(d); setError(null) }).catch(e => setError(e.message))
  }, [])
  useEffect(() => { load() }, [load])

  async function sync(id: Connector['id']) {
    setSyncing(id)
    try { await syncNow(id) } catch (e) { setError((e as Error).message) }
    setSyncing(null)
    load()
  }

  const connected = new URLSearchParams(location.search).get('connected')

  return (
    <main className="dp">
      {!embedded && <p className="eyebrow">Data</p>}
      {!embedded && <h1>{data ? headline(data) : 'Loading your sources…'}</h1>}
      {connected && <p className="banner good">{connected === 'whoop' ? 'WHOOP' : 'Strava'} connected. History is syncing in the background.</p>}
      {error && <p className="banner alert">{error}</p>}

      <Uploader onDone={load} />

      <section className="card">
        <header className="card-head"><h2>Sources</h2></header>
        <ul className="sources">
          {SOURCES.map(s => {
            const counts = data?.records.filter(r => r.source === s.id) ?? []
            const last = counts.reduce<string | null>((m, r) => (r.last && (!m || r.last > m) ? r.last : m), null)
            const first = counts.reduce<string | null>((m, r) => (r.first && (!m || r.first < m) ? r.first : m), null)
            const conn = data?.connectors.find(c => c.id === s.connector)
            const stale = last && s.staleDays !== undefined && daysAgo(last) > s.staleDays
            const status = !counts.length ? 'off' : stale ? 'stale' : 'ok'
            return (
              <li key={s.id}>
                <span className={`dot ${status}`} aria-hidden />
                <div className="source-main">
                  <div className="source-name">{s.name}<span className={`status ${status}`}>{status === 'ok' ? 'OK' : status === 'stale' ? `Stale · ${daysAgo(last!)} days` : 'No data'}</span></div>
                  <div className="source-what">{s.what}</div>
                  {counts.length > 0 && (
                    <div className="source-meta">
                      {counts.filter(c => KIND_LABEL[c.kind]?.[0] !== '').map(c => countText(c.n, c.kind)).join(' · ')}
                      {first && <> · {fmtDay(first)} – {fmtDay(last)}</>}
                    </div>
                  )}
                  {conn?.lastError && !conn.lastSync && <div className="source-meta alert">Last sync failed: {conn.lastError.detail}</div>}
                </div>
                {conn && (
                  <div className="source-actions">
                    {!conn.configured ? <span className="hint">Add its keys under APIs below</span>
                      : !conn.connected ? <a className="btn" href={`/api/connect/${conn.id}`}>Connect</a>
                      : <button className="btn" disabled={syncing === conn.id || conn.syncing} onClick={() => sync(conn.id)}>
                          {syncing === conn.id || conn.syncing ? 'Syncing…' : 'Sync now'}
                        </button>}
                    {conn.lastSync && <span className="hint">Synced {fmtWhen(conn.lastSync)}</span>}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <ApiKeys />
      <RecoveryKit />
      <CoachPicker />
      <CoachMemory />
      <Backups />
      <Passkeys />
      <UploadTokens />

      {data && data.imports.length > 0 && (
        <FoldCard title="Import history" meta={`Latest ${fmtWhen(data.imports[0].imported_at)}`}>
          <ul className="history">
            {data.imports.slice(0, 20).map((i, n) => (
              <li key={n}>
                <span className={`pill ${i.status}`}>{i.status === 'imported' ? 'Imported' : i.status === 'failed' ? 'Failed' : 'Not recognized'}</span>
                <span className="history-name" title={i.name ?? ''}>{i.name?.split('/').pop()}</span>
                <span className="hint">{i.status === 'imported' ? countText(i.records, 'result').replace('result', 'record') : i.detail}</span>
                <span className="hint when">{fmtWhen(i.imported_at)}</span>
              </li>
            ))}
          </ul>
        </FoldCard>
      )}
      <DeleteAll />
    </main>
  )
}

function headline(d: Sources) {
  const withData = SOURCES.filter(s => d.records.some(r => r.source === s.id)).length
  const total = d.records.reduce((a, r) => a + r.n, 0)
  if (!withData) return 'No data yet. Upload an export to get started.'
  return `${withData} of ${SOURCES.length} sources have data · ${total.toLocaleString()} records`
}
