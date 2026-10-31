// Tests page: lab draws and results, VO2 tests.
import { readRecords } from '../db.ts'
import type { LabDraw, LabResult, Vo2Test } from '../model.ts'
import { short } from './time.ts'

// Display groups (spec section 05 · Tests), checked in order. Markers not listed fall under "Other".
const GROUPS: [string, RegExp][] = [
  ['Lipids', /CHOLESTEROL|TRIGLYCERIDES|LDL|HDL|APOLIPOPROTEIN|LIPOPROTEIN|CHOL\/HDLC/],
  ['Iron & blood', /IRON|FERRITIN|SATURATION|HEMOGLOBIN(?! A1c)|HEMATOCRIT|BLOOD CELL|PLATELET|MCV|MCH|RDW|MPV|NEUTROPHILS|LYMPHOCYTES|MONOCYTES|EOSINOPHILS|BASOPHILS/],
  ['Hormones', /TESTOSTERONE|SHBG|SEX HORMONE|ESTRADIOL|\bLH\b|\bFSH\b|CORTISOL|DHEA/],
  ['Metabolic', /GLUCOSE|A1c|INSULIN|TSH|SODIUM|POTASSIUM|CHLORIDE|CARBON DIOXIDE|CALCIUM|PROTEIN|ALBUMIN|GLOBULIN/],
  ['Liver & kidney', /\bALT\b|\bAST\b|ALKALINE|BILIRUBIN|CREATININE|EGFR|UREA|\bBUN\b/],
  ['Inflammation & vitamins', /CRP|HOMOCYSTEINE|VITAMIN/],
]
const groupOf = (marker: string) => GROUPS.find(([, re]) => re.test(marker))?.[0] ?? 'Other'

/** "LDL-CHOLESTEROL" -> "LDL cholesterol", "HEMOGLOBIN A1c" -> "Hemoglobin A1c" */
const nice = (m: string) => m.toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (_, p, c) => p + c.toUpperCase())
  .replace(/\b(Ldl|Hdl|Alt|Ast|Tsh|Lh|Fsh|Egfr|Bun|Crp|Hs|Dhea|Mcv|Mch|Mchc|Rdw|Mpv|Shbg|Ms|Ia)\b/g, s => s.toUpperCase()).replace(/A1C/, 'A1c')

export function testsSummary() {
  const draws = readRecords<LabDraw>('labs', 'draw').map(d => ({ id: d.day!, label: short(d.day!), year: d.day!.slice(0, 4), ...d.data }))
  const results = readRecords<LabResult>('labs', 'result')
  const markers = new Map<string, { name: string; group: string; unit: string | null; low: number | null; high: number | null; range: string | null; values: Record<string, { v: number | null; t: string; f: 'H' | 'L' | null }> }>()
  for (const r of results) {
    const key = r.data.marker
    const m = markers.get(key) ?? { name: nice(key), group: groupOf(key), unit: r.data.unit, low: r.data.low, high: r.data.high, range: r.data.range, values: {} }
    m.values[r.day!] = { v: r.data.value, t: r.data.text, f: r.data.flag }
    if (r.data.range) Object.assign(m, { low: r.data.low, high: r.data.high, range: r.data.range, unit: r.data.unit ?? m.unit })
    markers.set(key, m)
  }
  const vo2 = readRecords<Vo2Test>('vo2', 'test').map(t => ({ day: t.day!, label: short(t.day!), ...t.data }))
  return { draws, markers: [...markers.values()], vo2 }
}
