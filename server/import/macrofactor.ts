// MacroFactor XLSX export: the per-day sheets merge into one macrofactor/day record per date.
import ExcelJS from 'exceljs'
import type { RecordRow } from '../db.ts'
import { num, type BodyMeasurements, type FoodEntry, type NutritionDay, type NutritionTarget } from '../model.ts'
import { foodDays, foodEntry } from './foodlog.ts'
import type { Importer } from './files.ts'

const SIGNATURE = ['Calories & Macros', 'Scale Weight', 'Weight Trend']

/** Cell -> "YYYY-MM-DD". MacroFactor stores dates as UTC midnight, or as "8/19/2024" strings in some sheets. */
function dayCell(v: ExcelJS.CellValue): string | null {
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  const m = typeof v === 'string' ? /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v.trim()) : null
  return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : null
}

function sheetRows(ws: ExcelJS.Worksheet | undefined): { header: string[]; rows: ExcelJS.CellValue[][] } {
  if (!ws) return { header: [], rows: [] }
  const values = (r: number) => (ws.getRow(r).values as ExcelJS.CellValue[]).slice(1)
  const header = values(1).map(v => String(v ?? '').trim())
  const rows: ExcelJS.CellValue[][] = []
  for (let r = 2; r <= ws.rowCount; r++) rows.push(values(r))
  return { header, rows }
}

const MICRO_FIELDS: Record<string, keyof NutritionDay> = {
  'Saturated Fat (g)': 'satFatG', 'Fiber (g)': 'fiberG', 'Cholesterol (mg)': 'cholesterolMg', 'Sodium (mg)': 'sodiumMg',
}

export const macroFactor: Importer = {
  id: 'macrofactor-xlsx', source: 'macrofactor', label: 'MacroFactor export (XLSX)',
  detect: f => !!f.sheets && SIGNATURE.every(s => f.sheets!.includes(s)),
  async parse(f) {
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(f.bytes as unknown as ArrayBuffer)
    const days = new Map<string, Partial<NutritionDay>>()
    const day = (d: string) => days.get(d) ?? days.set(d, {}).get(d)!
    const each = (sheet: string, fn: (d: Partial<NutritionDay>, cell: (name: string) => ExcelJS.CellValue, header: string[], row: ExcelJS.CellValue[]) => void) => {
      const { header, rows } = sheetRows(wb.getWorksheet(sheet))
      for (const row of rows) {
        const d = dayCell(row[0])
        if (d) fn(day(d), name => row[header.indexOf(name)], header, row)
      }
    }

    each('Calories & Macros', (d, c) => Object.assign(d, {
      kcal: num(c('Calories (kcal)')), fatG: num(c('Fat (g)')), carbsG: num(c('Carbs (g)')), proteinG: num(c('Protein (g)')),
    }))
    each('Micronutrients', (d, _c, header, row) => {
      const micros: Record<string, number> = {}
      header.forEach((h, i) => {
        const v = num(row[i])
        if (i === 0 || v === null) return
        const field = MICRO_FIELDS[h]
        if (field) (d as Record<string, unknown>)[field] = v
        else micros[h] = v
      })
      d.micros = micros
    })
    each('Scale Weight', (d, c) => Object.assign(d, { weightLb: num(c('Weight (lb)')), bodyFatPct: num(c('Fat Percent')) }))
    each('Weight Trend', (d, c) => { d.trendLb = num(c('Trend Weight (lb)')) })
    each('Expenditure', (d, c) => { d.expenditure = num(c('Expenditure')) })
    each('Steps', (d, c) => { d.steps = num(c('Steps')) })

    const rows: RecordRow[] = [...days].map(([id, data]) => ({ source: 'macrofactor', kind: 'day', id, day: id, data }))

    const targets = sheetRows(wb.getWorksheet('Nutrition Program Settings'))
    const ti = (n: string) => targets.header.indexOf(n)
    for (const r of targets.rows) {
      const effective = dayCell(r[ti('Program Update Date')]), weekday = String(r[ti('Program Weekday')] ?? '')
      if (!effective || !weekday) continue
      const data: NutritionTarget = {
        effective, weekday, kcal: num(r[ti('Calories (kcal)')]), proteinG: num(r[ti('Protein (g)')]), carbsG: num(r[ti('Carbs (g)')]), fatG: num(r[ti('Fat (g)')]),
      }
      rows.push({ source: 'macrofactor', kind: 'target', id: `${effective}|${weekday}`, day: effective, data })
    }

    const body = sheetRows(wb.getWorksheet('Body Metrics'))
    for (const r of body.rows) {
      const d = dayCell(r[0])
      const data: BodyMeasurements = {}
      body.header.forEach((h, i) => { const v = num(r[i]); if (i > 0 && v !== null) data[h] = v })
      if (d && Object.keys(data).length) rows.push({ source: 'macrofactor', kind: 'measurements', id: d, day: d, data })
    }
    return rows
  },
}

// MacroFactor "Quick Export" XLSX: one "Quick Export" sheet (a row per day: expenditure, weight, trend, macros, that
// day's targets, steps, micros) plus a "Food Log" sheet in the food-log CSV's columns. It has no scale body fat, body
// metrics or program settings: those still come from the full export, and upsert merges field by field so a quick
// export never blanks them. The day's targets are stored as a target effective that day for its weekday.
const QUICK_DAY_FIELDS = new Set(['Date', 'Expenditure', 'Trend Weight (lb)', 'Weight (lb)', 'Calories (kcal)', 'Protein (g)', 'Fat (g)', 'Carbs (g)',
  'Target Calories (kcal)', 'Target Protein (g)', 'Target Fat (g)', 'Target Carbs (g)', 'Steps'])
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export const macroFactorQuick: Importer = {
  id: 'macrofactor-quick-xlsx', source: 'macrofactor', label: 'MacroFactor Quick Export (XLSX)',
  detect: f => !!f.sheets?.includes('Quick Export'),
  async parse(f) {
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(f.bytes as unknown as ArrayBuffer)
    const rows: RecordRow[] = []

    const quick = sheetRows(wb.getWorksheet('Quick Export'))
    for (const r of quick.rows) {
      const day = dayCell(r[0])
      if (!day) continue
      const c = (name: string) => num(r[quick.header.indexOf(name)])
      const d: Partial<NutritionDay> = {
        kcal: c('Calories (kcal)'), proteinG: c('Protein (g)'), fatG: c('Fat (g)'), carbsG: c('Carbs (g)'),
        weightLb: c('Weight (lb)'), trendLb: c('Trend Weight (lb)'), expenditure: c('Expenditure'), steps: c('Steps'),
      }
      const micros: Record<string, number> = {}
      quick.header.forEach((h, i) => {
        const v = num(r[i])
        if (QUICK_DAY_FIELDS.has(h) || v === null) return
        const field = MICRO_FIELDS[h]
        if (field) (d as Record<string, unknown>)[field] = v
        else micros[h] = v
      })
      if (Object.keys(micros).length) d.micros = micros
      rows.push({ source: 'macrofactor', kind: 'day', id: day, day, data: d })

      const weekday = WEEKDAYS[(new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7]
      const target: NutritionTarget = { effective: day, weekday, kcal: c('Target Calories (kcal)'), proteinG: c('Target Protein (g)'), carbsG: c('Target Carbs (g)'), fatG: c('Target Fat (g)') }
      if (target.kcal !== null) rows.push({ source: 'macrofactor', kind: 'target', id: `${day}|${weekday}`, day, data: target })
    }

    const log = sheetRows(wb.getWorksheet('Food Log'))
    const foods = new Map<string, FoodEntry[]>()
    for (const r of log.rows) {
      const day = typeof r[0] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r[0].trim()) ? r[0].trim() : r[0] instanceof Date ? dayCell(r[0]) : null
      if (day) foods.set(day, [...(foods.get(day) ?? []), foodEntry(name => (log.header.includes(name) ? r[log.header.indexOf(name)] : undefined))])
    }
    return [...rows, ...foodDays(foods)]
  },
}
