// Nutrition protocol document (Markdown). Stored whole as
// plan/protocol (newest start date is the active protocol); interpreted in dashboard/nutrition.ts.
import type { Importer } from './files.ts'
import { readMarkdown } from './markdown.ts'

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }
export const parseUsDate = (s: string): string | null => {
  const m = /\b([A-Z][a-z]{2})[a-z]*\.? (\d{1,2}),? (\d{4})/.exec(s)
  return m && MONTHS[m[1].toLowerCase()] ? `${m[3]}-${String(MONTHS[m[1].toLowerCase()]).padStart(2, '0')}-${m[2].padStart(2, '0')}` : null
}

export const protocolDoc: Importer = {
  id: 'nutrition-protocol-md', source: 'plan', label: 'Nutrition protocol (Markdown)',
  detect: f => !!f.text && /^# .*protocol/im.test(f.text) && /^## Daily targets/im.test(f.text),
  parse(f) {
    const md = readMarkdown(f.text!)
    const dateLine = md.intro.find(p => parseUsDate(p)) ?? ''
    const start = parseUsDate(dateLine)
    if (!start) throw new Error('No start date found (expected a line like "Oct 28, 2026 · @Name")')
    const all = md.intro.join(' ')
    const retest = parseUsDate(/retest (?:on )?([A-Z][a-z]+ \d{1,2},? \d{4})/i.exec(all)?.[1] ?? '')
    const weeks = Number(/(\d+)-week/i.exec(md.title)?.[1] ?? /(\d+)-week/i.exec(all)?.[1] ?? 0) || null
    const summary = md.intro.filter(p => p !== dateLine).join(' ')
    return [{ source: 'plan', kind: 'protocol', id: start, day: start, data: { title: md.title, start, retest, weeks, summary, sections: md.sections } }]
  },
}
