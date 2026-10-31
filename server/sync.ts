// Background polling for connected sources, single-flight per source, every run logged in sync_runs.
import { syncStrava } from './connectors/strava.ts'
import { syncWhoop, whoopEager } from './connectors/whoop.ts'
import { finishRun, startRun } from './db.ts'
import { isConnected, type Provider } from './oauth.ts'
import { maybeSendMorningCall, syncResult } from './push.ts'

// WHOOP polls every 5 min while today's recovery is pending or freshly scored (WHOOP sometimes revises it after
// the first score), every 15 min otherwise. ~5 requests a sync, far under 10,000/day.
const JOBS: Record<Provider, { run: () => Promise<number>; everyMin: number; eagerMin?: number; eager?: () => boolean }> = {
  whoop: { run: syncWhoop, everyMin: 15, eagerMin: 5, eager: whoopEager },
  strava: { run: syncStrava, everyMin: 30 },
}

const running = new Map<Provider, Promise<number>>()
const lastStart = new Map<Provider, number>()

export function syncNow(p: Provider): Promise<number> {
  const existing = running.get(p)
  if (existing) return existing
  lastStart.set(p, Date.now())
  const id = startRun(p)
  const job = JOBS[p].run()
    .then(n => {
      finishRun(id, true, n)
      // Notifications: problem cleared, and (WHOOP) today's call once recovery is in. Never fails the sync.
      syncResult(p, true).then(() => (p === 'whoop' ? maybeSendMorningCall() : undefined)).catch(e => console.error('push:', e?.message ?? e))
      return n
    })
    .catch(e => {
      finishRun(id, false, 0, String(e?.message ?? e)); console.error(`${p} sync failed:`, e?.message ?? e)
      syncResult(p, false, String(e?.message ?? e)).catch(err => console.error('push:', err?.message ?? err))
      throw e
    })
    .finally(() => running.delete(p))
  running.set(p, job)
  return job
}

/** Sync unless the last start was less than maxAgeMs ago (joins a sync already running). null = still fresh. */
export function syncIfStale(p: Provider, maxAgeMs: number): Promise<number> | null {
  if (!isConnected(p)) return null
  const existing = running.get(p)
  if (existing) return existing
  if (Date.now() - (lastStart.get(p) ?? 0) < maxAgeMs) return null
  return syncNow(p)
}

export function startScheduler() {
  for (const [p, job] of Object.entries(JOBS) as [Provider, (typeof JOBS)[Provider]][]) {
    const tick = () => {
      const min = job.eager?.() ? job.eagerMin! : job.everyMin
      syncIfStale(p, min * 60_000 - 30_000)?.catch(() => {})
    }
    setTimeout(tick, 10_000)
    setInterval(tick, 60_000)
  }
}

export const isSyncing = (p: Provider) => running.has(p)
