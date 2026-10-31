// DEXA body-composition reports from Benchmark Body Metrics (PDF). One dexa/scan per measured date.
import { num, type DexaScan } from '../model.ts'
import type { Importer } from './files.ts'

const REGIONS = ['Arms', 'Legs', 'Trunk', 'Android', 'Gynoid', 'Total']

export const benchmarkDexa: Importer = {
  id: 'benchmark-dexa-pdf', source: 'dexa', label: 'DEXA scan, Benchmark Body Metrics (PDF)',
  detect: f => !!f.pdfText && /COMPOSITION ANALYSIS/.test(f.pdfText) && /REGION ANALYSIS/.test(f.pdfText),
  parse(f) {
    const t = f.pdfText!
    const measured = /Measured:\s*(\d{2})\/(\d{2})\/(\d{4})/.exec(t)
    if (!measured) throw new Error('No "Measured" date found in the scan')
    const day = `${measured[3]}-${measured[1]}-${measured[2]}`
    const regions: DexaScan['regions'] = {}
    for (const name of REGIONS) {
      const m = new RegExp(`^\\s*${name}\\s+([\\d.]+) %\\s+([\\d.]+) lbs\\s+([\\d.]+) lbs\\s+([\\d.]+) lbs\\s+([\\d.]+) lbs`, 'm').exec(t)
      if (m) regions[name] = { bodyFatPct: num(m[1]), totalLb: num(m[2]), fatLb: num(m[3]), leanLb: num(m[4]), bmcLb: num(m[5]) }
    }
    const total = regions.Total
    delete regions.Total
    // Bone health row: age, BMD (g/cm²), T-score, Z-score, centile
    const bone = /BONE HEALTH[\s\S]*?^\s+\d{2}\.\d\s+(\d\.\d{3})\s+(-?\d+\.\d)\s+(-?\d+\.\d)\s+(\d+)?/m.exec(t)
    const data: DexaScan = {
      provider: 'Benchmark Body Metrics',
      totalLb: total?.totalLb ?? null, fatLb: total?.fatLb ?? null, leanLb: total?.leanLb ?? null,
      bodyFatPct: total?.bodyFatPct ?? null, bmcLb: total?.bmcLb ?? null, regions,
      vatLb: num(/([\d.]+) lbs\s+[\d.]+ in³/.exec(t)?.[1]),
      rsmi: num(/Your RSMI:\s*([\d.]+)/.exec(t)?.[1]),
      rmrKcal: num(/YOUR RMR:\s*([\d,]+)/.exec(t)?.[1]),
      bmd: bone ? { gcm2: num(bone[1]), tScore: num(bone[2]), zScore: num(bone[3]), centile: num(bone[4]) } : null,
    }
    return [{ source: 'dexa', kind: 'scan', id: day, day, data }]
  },
}
