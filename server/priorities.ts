// Priorities the coach manages (plan/priority). The Overview's Priorities card is mostly computed from the data in
// the browser (stale sources, HRV, labs, …, see priorities() in src/legacy/builders.tsx). On top of those the coach
// can, with the update_priorities tool:
//   add     a priority of its own (id "c-…"), placed first or after the data-driven ones;
//   edit    one of its own, or reword / reposition a data-driven one (an override keyed by that priority's id);
//   remove  one of its own (deleted), or hide a data-driven one (an override with removed: true);
//   restore a data-driven one: drop the override, back to the data's own text.
// Done / Snooze / Dismiss on the card stay in the shared im4-al state, as before.
import { randomUUID } from 'node:crypto'
import { deleteRecord, readRecords, upsertRecords } from './db.ts'
import { today } from './dashboard/time.ts'

export type Position = 'first' | 'after_data'
/** A coach priority (custom: true) or an override of a data-driven one (custom: false). */
export type Priority = {
  id: string; custom: boolean; title: string; why: string; act: string; position: Position | null
  removed: boolean; created: string; updated: string
}

// Ids of the data-driven priorities (builders.tsx priorities()); anything else that isn't a coach id is rejected.
const AUTO_ID = /^(stale-(whoop|strava)|race-.+|hrv|resp|log|labs-.+|fitnessai-.+|ride|weak)$/
const CUSTOM_ID = /^c-[0-9a-f]{8}$/
const MAX_CUSTOM = 20

export const priorityList = () => readRecords<Priority>('plan', 'priority').map(r => r.data)
  .sort((a, b) => a.created.localeCompare(b.created))

type Change = { action?: unknown; id?: unknown; title?: unknown; why?: unknown; act?: unknown; position?: unknown }
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** Apply the coach's changes in order. Each one is checked first; nothing is written if any change is invalid. */
export function updatePriorities(input: { changes?: unknown }): string[] {
  if (!Array.isArray(input.changes) || !input.changes.length || input.changes.length > 10) throw new Error('Send between 1 and 10 changes.')
  const byId = new Map(priorityList().map(p => [p.id, p]))
  const now = new Date().toISOString(), writes = new Map<string, Priority>(), deletes = new Set<string>(), done: string[] = []
  for (const c of input.changes as Change[]) {
    const action = c.action, id = text(c.id, 80), title = text(c.title, 120), why = text(c.why, 400), act = text(c.act, 200)
    const position = c.position === 'first' || c.position === 'after_data' ? c.position : null
    const cur = writes.get(id) ?? (deletes.has(id) ? undefined : byId.get(id))
    if (action === 'add') {
      if (!title || !act) throw new Error('A new priority needs a title and an action ("act").')
      if ([...byId.values(), ...writes.values()].filter(p => p.custom && !deletes.has(p.id)).length >= MAX_CUSTOM) throw new Error(`There are already ${MAX_CUSTOM} coach priorities; remove some first.`)
      const p: Priority = { id: 'c-' + randomUUID().slice(0, 8), custom: true, title, why, act, position: position ?? 'first', removed: false, created: now, updated: now }
      writes.set(p.id, p); done.push(`added ${p.id} "${title}"`)
    } else if (action === 'edit') {
      if (CUSTOM_ID.test(id)) {
        if (!cur) throw new Error(`No coach priority ${id}.`)
        writes.set(id, { ...cur, title: title || cur.title, why: why || cur.why, act: act || cur.act, position: position ?? cur.position, updated: now })
      } else if (AUTO_ID.test(id)) {
        // An override: empty fields keep the data's own (live) text.
        const base = cur ?? { id, custom: false, title: '', why: '', act: '', position: null, removed: false, created: now, updated: now }
        writes.set(id, { ...base, title: title || base.title, why: why || base.why, act: act || base.act, position: position ?? base.position, removed: false, updated: now })
      } else throw new Error(`Unknown priority id "${id}". Use an id from the Priorities list in your context.`)
      done.push(`edited ${id}`)
    } else if (action === 'remove') {
      if (CUSTOM_ID.test(id)) {
        if (!cur) throw new Error(`No coach priority ${id}.`)
        writes.delete(id); deletes.add(id)
      } else if (AUTO_ID.test(id)) {
        writes.set(id, { ...(cur ?? { id, custom: false, title: '', why: '', act: '', position: null, created: now }), removed: true, updated: now })
      } else throw new Error(`Unknown priority id "${id}".`)
      done.push(`removed ${id}`)
    } else if (action === 'restore') {
      if (!AUTO_ID.test(id)) throw new Error('restore is for data-driven priorities; edit or add coach priorities instead.')
      writes.delete(id); deletes.add(id); done.push(`restored ${id}`)
    } else throw new Error(`Unknown action "${String(action)}".`)
  }
  for (const id of deletes) if (!writes.has(id)) deleteRecord('plan', 'priority', id)
  if (writes.size) upsertRecords([...writes.values()].map(p => ({ source: 'plan' as const, kind: 'priority', id: p.id, day: today(), data: p })))
  return done
}

/** The coach's tool. Strict schema: every field required ("" where there's nothing). */
export const UPDATE_PRIORITIES_TOOL = {
  name: 'update_priorities',
  description: 'Add, edit, remove or restore items on the Priorities card of the athlete\'s Overview page. ' +
    'The current list, with ids, is in your context under "Priorities". Use it when the athlete asks you to, or when you have agreed on something to keep in front of them; say in your reply what you changed. ' +
    'Priorities marked [data] are computed from their data and update themselves: edit them only to reword or reposition (your text then replaces the data\'s live text), remove hides one, restore brings back the data\'s own version. ' +
    'Your own priorities ([coach]) stay until removed. Keep titles short ("Book a bike fit"), why = one sentence of reasoning with numbers when you have them, act = the concrete next step.',
  strict: true,
  input_schema: {
    type: 'object', additionalProperties: false, required: ['changes'],
    properties: {
      changes: { type: 'array', description: 'Applied in order', items: {
        type: 'object', additionalProperties: false, required: ['action', 'id', 'title', 'why', 'act', 'position'],
        properties: {
          action: { type: 'string', enum: ['add', 'edit', 'remove', 'restore'] },
          id: { type: 'string', description: 'The priority\'s id for edit/remove/restore; "" for add' },
          title: { type: 'string', description: 'Short title; "" to keep the current one (edit) or for remove/restore' },
          why: { type: 'string', description: 'Why it matters; "" to keep / if not needed' },
          act: { type: 'string', description: 'The next step; required for add, "" to keep' },
          position: { type: 'string', enum: ['first', 'after_data', 'keep'], description: 'first = above the data-driven priorities; after_data = below them; keep = unchanged (add defaults to first)' },
        },
      } },
    },
  },
} as const
