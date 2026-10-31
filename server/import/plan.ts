// Fitness roadmap (JSON): goal race, milestones, weekly schedule, deload, per-sport plans. Stored whole as
// plan/roadmap; the newest as_of_date is the active plan. Interpreted in dashboard/plan.ts.
import type { Importer } from './files.ts'

export const roadmap: Importer = {
  id: 'fitness-roadmap-json', source: 'plan', label: 'Fitness roadmap (JSON)',
  detect: f => !!f.json && typeof f.json === 'object' && !Array.isArray(f.json) && 'primary_goal' in f.json && 'milestones' in f.json,
  parse(f) {
    const doc = f.json as { as_of_date?: string }
    const day = /^\d{4}-\d{2}-\d{2}$/.test(doc.as_of_date ?? '') ? doc.as_of_date! : new Date().toISOString().slice(0, 10)
    return [{ source: 'plan', kind: 'roadmap', id: day, day, data: doc }]
  },
}
