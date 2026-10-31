// Fitness roadmap (JSON): goal race, milestones, weekly schedule, deload, per-sport plans. Stored whole as
// plan/roadmap; the newest is the active plan. Interpreted in dashboard/plan.ts.
// Filed under its as_of_date, or today when that is earlier, so a file uploaded now replaces a plan made in the app.
import { today } from '../dashboard/time.ts'
import type { Importer } from './files.ts'

export const roadmap: Importer = {
  id: 'fitness-roadmap-json', source: 'plan', label: 'Fitness roadmap (JSON)',
  detect: f => !!f.json && typeof f.json === 'object' && !Array.isArray(f.json) && 'primary_goal' in f.json && 'milestones' in f.json,
  parse(f) {
    const doc = f.json as { as_of_date?: string }
    const asOf = /^\d{4}-\d{2}-\d{2}$/.test(doc.as_of_date ?? '') ? doc.as_of_date! : '', day = asOf > today() ? asOf : today()
    return [{ source: 'plan', kind: 'roadmap', id: day, day, data: doc }]
  },
}
