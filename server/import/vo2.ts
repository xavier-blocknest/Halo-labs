// VO2 max test reports (PDF, treadmill protocol with heart-rate zones). One vo2/test per test date.
import { num, type Vo2Test } from '../model.ts'
import type { Importer } from './files.ts'

/** Four numbers after a row label: start/rest, aerobic threshold, anaerobic threshold, VO2 max. */
const row = (t: string, label: RegExp) => {
  const m = new RegExp(`${label.source}\\s+([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)`).exec(t)
  return m ? m.slice(1, 5).map(num) : null
}

/** STAGE AVERAGES rows: stage, time, HR, speed, VO2 mL/min, VO2 mL/kg/min, VE/VO2, VE/VCO2, RER, CHO %, Fat %,
 *  CHO g/min, Fat g/min, CHO cal/min, Fat cal/min, cal/min, cal/hr. Only that table (the interval data has no stage). */
function stages(t: string) {
  const at = t.indexOf('STAGE AVERAGES'), end = t.indexOf('EFFECTIVE FAT BURN', at)
  if (at < 0) return []
  const block = t.slice(at, end > at ? end : at + 4000)
  const n = '([\\d.,]+)'
  const re = new RegExp(`^\\s*(\\d{1,2})\\s+(\\d+:\\d{2})\\s+(\\d+)\\s+${n}\\s+${n}\\s+${n}\\s+${n}\\s+${n}\\s+${n}\\s+${n}%\\s+${n}%\\s+${n}\\s+${n}\\s+${n}\\s+${n}\\s+${n}\\s+(\\d+)\\s*$`, 'gm')
  return [...block.matchAll(re)].map(m => ({ n: Number(m[1]), time: m[2], hr: Number(m[3]), mph: num(m[4])!, vo2: num(m[6])!, rer: num(m[9])!, choPct: num(m[10])!, fatPct: num(m[11])!, kcalHr: Number(m[17]) }))
}

export const vo2Report: Importer = {
  id: 'vo2-max-pdf', source: 'vo2', label: 'VO₂ max test (PDF)',
  detect: f => !!f.pdfText && /VO2 MAX TEST/.test(f.pdfText) && /HEART RATE BASED TRAINING|ZONE 2/.test(f.pdfText),
  parse(f) {
    const t = f.pdfText!
    // Rotated labels push the date far from "DATE:"; it is the first m/d/yyyy after it.
    const date = /DATE:[\s\S]*?\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/.exec(t)
    if (!date) throw new Error('No test date found in the report')
    const day = `${date[3]}-${date[1].padStart(2, '0')}-${date[2].padStart(2, '0')}`
    const hr = row(t, /HEART RATE/), vo2 = row(t, /VO2 \(ML\/KG\/MIN\)/)
    const zones = [1, 2, 3, 4, 5].flatMap(z => {
      const m = new RegExp(`ZONE ${z}\\s+(?:([<>])\\s*(\\d+)|(\\d+)\\s*-\\s*(\\d+))`).exec(t)
      if (!m) return []
      return [{ zone: `Z${z}`, lowHr: m[3] ? num(m[3]) : m[1] === '>' ? num(m[2]) : null, highHr: m[4] ? num(m[4]) : m[1] === '<' ? num(m[2]) : null }]
    })
    const rec = (label: string) => num(new RegExp(`${label}\\.+\\s*(\\d+)`).exec(t)?.[1])
    const data: Vo2Test = {
      provider: null,
      vo2max: vo2?.[3] ?? null, maxHr: hr?.[3] ?? null, restingHr: hr?.[0] ?? null,
      aerobicThreshold: hr ? { hr: hr[1], vo2: vo2?.[1] ?? null } : null,
      anaerobicThreshold: hr ? { hr: hr[2], vo2: vo2?.[2] ?? null } : null,
      zones,
      recovery: { peak: rec('Peak'), after1m: rec('1 Minute'), after2m: rec('2 Minutes') },
      stages: stages(t),
    }
    return [{ source: 'vo2', kind: 'test', id: day, day, data }]
  },
}
