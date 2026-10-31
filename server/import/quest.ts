// Quest Diagnostics lab report PDFs (pdftotext -layout). One labs/draw per report, one labs/result per marker.
import type { RecordRow } from '../db.ts'
import { num, type LabDraw, type LabResult } from '../model.ts'
import type { Importer } from './files.ts'

const mdy = (s: string) => { const m = /(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/.exec(s); return m ? { day: `${m[3]}-${m[1]}-${m[2]}`, time: m[4] ? `${m[4]}:${m[5]}` : null } : null }

/** "<200 mg/dL", "65-99 mg/dL", "> OR = 40 mg/dL", "<5.0 (calc)" -> range/low/high/unit */
export function parseRange(s: string) {
  // "For 8 a.m.(7-9 a.m.) Specimen: 4.0-22.0" -> the morning range; "< or = 13.5" -> "<=13.5"
  const t = s.replace(/^.*?Specimen:\s*/i, '').replace(/\(calc\)/i, '').replace(/^Optimal\s+/i, '')
    .replace(/([<>])\s*or\s*=\s*/i, '$1=').replace(/\s+/g, ' ').trim()
  const m = /^(>=|<=|<|>)?\s*(-?\d[\d.,]*)(?:\s*-\s*(\d[\d.,]*))?\s*(.*)$/.exec(t)
  if (!m) return { range: t || null, low: null, high: null, unit: null }
  const op = m[1] ?? '', a = num(m[2]), b = num(m[3])
  return {
    range: `${op}${m[2]}${m[3] ? `-${m[3]}` : ''}`,
    low: b !== null ? a : op.startsWith('>') ? a : null,
    high: b !== null ? b : op.startsWith('<') ? a : null,
    unit: m[4] || null,
  }
}

// Marker names are upper case ("HEMOGLOBIN A1c" and "% SATURATION" included); prose lines are not.
const NAME = /^(?!.*[a-z]{2})[%A-Z0-9][A-Za-z0-9 ,()/\-+.%'&]*[A-Za-z0-9)%]$/
const VALUE = /^([<>]?\d[\d.,]*|NEGATIVE|POSITIVE|NONE SEEN|NOT DETECTED|DETECTED|SEE NOTE:|PENDING|TNP)(?:\s+(H|L|HH|LL))?$/

export const questLabs: Importer = {
  id: 'quest-pdf', source: 'labs', label: 'Quest Diagnostics lab report (PDF)',
  detect: f => !!f.pdfText && /Lab Reference ID/.test(f.pdfText) && /Reference Range/i.test(f.pdfText) && /Specimen:/.test(f.pdfText),
  parse(f) {
    const text = f.pdfText!
    const collected = mdy(/Collected:\s*([\d/]+\s+[\d:]+)/.exec(text)?.[1] ?? '')
    if (!collected) throw new Error('No collection date found in the report')
    const reported = mdy(/Reported:\s*([\d/]+\s+[\d:]+)/.exec(text)?.[1] ?? '')
    const draw: LabDraw = {
      lab: 'Quest Diagnostics',
      collectedAt: collected.time ? `${collected.day}T${collected.time}` : collected.day,
      reportedAt: reported ? `${reported.day}T${reported.time}` : null,
      status: /Report Status:\s*([A-Z]+)/.exec(text)?.[1] ?? null,
      fasting: /Fasting:\s*Y/.test(text) ? true : /Fasting:\s*N/.test(text) ? false : null,
    }
    const rows: RecordRow[] = [{ source: 'labs', kind: 'draw', id: collected.day, day: collected.day, data: draw }]

    const lines = text.split('\n')
    const seen = new Set<string>()
    lines.forEach((line, i) => {
      const cols = line.trim().split(/\s{2,}/)
      if (cols.length < 2 || !NAME.test(cols[0]) || cols[0] === 'ANALYTE') return
      const v = VALUE.exec(cols[1])
      if (!v) return
      let rest = cols.slice(2).join(' ')
      let flag = v[2]?.[0] as 'H' | 'L' | undefined
      if (!flag && /^(H|L)$/.test(cols[2] ?? '')) { flag = cols[2] as 'H' | 'L'; rest = cols.slice(3).join(' ') }
      let rangeText = /Reference Range:\s*(.+)/i.exec(rest)?.[1] ?? null
      let unit: string | null = null
      if (!rangeText) {
        unit = rest.replace(/\(calc\)/i, '').trim() || null
        // Some markers put the range on following lines: "Reference range: <100", "Reference Range   <90",
        // or "Reference Range" then "Optimal <1.0". Stop at the next marker.
        for (let j = i + 1; j < Math.min(lines.length, i + 8); j++) {
          const next = lines[j].trim().split(/\s{2,}/)
          if (next.length >= 2 && NAME.test(next[0]) && VALUE.test(next[1])) break
          const m = /Reference range:?\s*(\S.*)?$/i.exec(lines[j].trim())
          if (!m) continue
          rangeText = m[1]?.trim() || lines[j + 1]?.trim() || null
          break
        }
      }
      const r = rangeText ? parseRange(rangeText) : { range: null, low: null, high: null, unit: null }
      const marker = cols[0]
      if (seen.has(marker)) return
      seen.add(marker)
      const result: LabResult = {
        marker, panel: null, value: num(v[1].replace(/^[<>]/, '')), text: v[1], unit: r.unit ?? unit,
        flag: flag ?? null, range: r.range, low: r.low, high: r.high,
      }
      rows.push({ source: 'labs', kind: 'result', id: `${collected.day}|${marker}`, day: collected.day, data: result })
    })
    return rows
  },
}
