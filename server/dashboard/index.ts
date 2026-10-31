// GET /api/dashboard: everything the pages show, computed from the records for the real local date.
// Each section is null when its source has no data, so the pages can show an empty state.
import { lastRuns, sourceSummary } from '../db.ts'
import { TZ } from '../model.ts'
import { setting } from '../settings.ts'
import { bodySummary } from './body.ts'
import { fuelSummary } from './fuel.ts'
import { dietSummary, foodSummary, protocolSummary } from './nutrition.ts'
import { planSummary } from './plan.ts'
import { testsSummary } from './tests.ts'
import { long, today as localToday } from './time.ts'
import { trainingSummary } from './training.ts'
import { recoveryWork } from './recoveryWork.ts'
import { whoopSummary } from './whoop.ts'
import { journalEntries } from '../journal.ts'
import { calendarSummary } from '../calendar.ts'
import { weekPlans } from '../weekPlan.ts'

export function dashboard(day = localToday()) {
  const last: Record<string, string> = {}
  for (const r of sourceSummary()) if (r.last && (!last[r.source] || r.last > last[r.source])) last[r.source] = r.last
  const training = trainingSummary(day)
  const plan = planSummary(day, training?.longest ?? null), protocol = protocolSummary(day)
  return {
    today: day, todayLabel: long(day), tz: TZ, name: setting('HALO_NAME') || 'there',
    lastData: last,
    // Last successful API sync per connector (ISO UTC), so pages can say how fresh WHOOP numbers are.
    synced: Object.fromEntries(lastRuns().map(r => [r.source, r.last_ok.replace(' ', 'T') + 'Z'])),
    whoop: whoopSummary(day),
    recoveryWork: recoveryWork(day),
    training,
    plan,
    body: bodySummary(day),
    fuel: fuelSummary(day),
    protocol,
    diet: dietSummary(day),
    foods: foodSummary(day),
    tests: testsSummary(),
    journal: journalEntries(),
    weekPlans: weekPlans(day),
    calendar: calendarSummary(day, plan, protocol),
  }
}

export type Dashboard = ReturnType<typeof dashboard>
