// Diet discipline rules (plain text): "Bacon: 1x week max", "Pizza: 1 every 2 weeks (eating out)", "Alcohol pass: 1x/mo",
// then a "---" line and logged uses like "Burger: 10/25/26". Stored as plan/diet (newest wins).
import { today as localToday } from '../dashboard/time.ts'
import type { Importer } from './files.ts'

export type DietRule = { id: string; name: string; count: number; windowDays: number; amount: string | null; note: string | null; text: string }

const slug = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, ' ').trim().replace(/ /g, '-')
/** Singular words, for matching "Burger: 10/25/26" to the "Burgers" rule. */
const sing = (s: string) => slug(s).split('-').map(w => w.replace(/(?<=[^s])s$/, '')).join('-')

export function parseRule(line: string): DietRule | null {
  const m = /^\s*([^:]+):\s*(.+)$/.exec(line)
  if (!m) return null
  const name = m[1].trim(), text = m[2].trim(), lower = text.toLowerCase()
  const windowDays = /\bday\b|daily/.test(lower) ? 1 : /two weeks|2 weeks/.test(lower) ? 14 : /month|\/mo\b/.test(lower) ? 30 : /week/.test(lower) ? 7 : null
  if (!windowDays) return null
  const count = Number(/(\d+)\s*x/.exec(lower)?.[1] ?? /^(\d+)\s+every/.exec(lower)?.[1] ?? 1)
  const nice = name.replace(/^Icecream$/i, 'Ice cream')
  return { id: slug(nice), name: nice, count, windowDays, amount: /(\d+\s*(?:oz|fl oz|g))\b/i.exec(text)?.[1] ?? null,
    note: /\(([^)]+)\)/.exec(text)?.[1] ?? null, text }
}

/** "10/25/26" or "10/25/2026" -> "2026-10-25" */
const usDay = (s: string) => { const m = /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(s); if (!m) return null; const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]); return `${y}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` }

export const dietRules: Importer = {
  id: 'diet-discipline-txt', source: 'plan', label: 'Diet discipline rules (text)',
  detect: f => !!f.text && !/^#{1,3} /m.test(f.text) && f.text.split('\n').filter(l => parseRule(l)).length >= 3 && /max|every|\/mo/i.test(f.text),
  parse(f) {
    const [rulesPart, usesPart = ''] = f.text!.split(/^\s*-{3,}\s*$/m)
    const rules = rulesPart.split('\n').map(parseRule).filter((r): r is DietRule => !!r)
    const uses: Record<string, string[]> = {}
    for (const line of usesPart.split('\n')) {
      const m = /^\s*([^:]+):\s*(.+)$/.exec(line), day = m ? usDay(m[2]) : null
      if (!m || !day) continue
      const key = sing(m[1].replace(/^Icecream$/i, 'Ice cream')), rule = rules.find(r => sing(r.name) === key)
      if (rule) (uses[rule.id] ??= []).push(day)
    }
    return [{ source: 'plan', kind: 'diet', id: 'current', day: localToday(), data: { rules, uses } }]
  },
}
