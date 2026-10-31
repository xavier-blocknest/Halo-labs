// MacroFactor food-log CSV (the granular export: one row per food, "Date, Time, Food Name, Serving Size, Serving Qty, …"
// plus ~55 nutrients). Stored as one macrofactor/foods record per day, so a newer export replaces the whole day:
// edits and deletions in MacroFactor carry over, and overlapping exports never double-count.
import type { RecordRow } from '../db.ts'
import { num, type FoodDay, type FoodEntry } from '../model.ts'
import type { Importer } from './files.ts'

/** "03:03 PM" -> "15:03" */
const time24 = (s: string) => {
  const m = /^(\d{1,2}):(\d{2})\s*([AP]M)?$/i.exec(s.trim())
  if (!m) return s.trim()
  let h = Number(m[1]) % 12
  if (m[3]?.toUpperCase() === 'PM') h += 12
  if (!m[3]) h = Number(m[1])
  return `${String(h).padStart(2, '0')}:${m[2]}`
}

/** One food row -> FoodEntry. `cell` reads a column by its MacroFactor header (same headers in the CSV and in the
 *  Quick Export's "Food Log" sheet). */
export function foodEntry(cell: (name: string) => unknown): FoodEntry {
  const s = (name: string) => String(cell(name) ?? '').trim()
  return { t: time24(s('Time')), name: s('Food Name'), qty: num(cell('Serving Qty')), unit: s('Serving Size') || null,
    kcal: num(cell('Calories (kcal)')), proteinG: num(cell('Protein (g)')), carbsG: num(cell('Carbs (g)')), fatG: num(cell('Fat (g)')),
    satFatG: num(cell('Saturated Fat (g)')), fiberG: num(cell('Fiber (g)')), cholesterolMg: num(cell('Cholesterol (mg)')),
    sodiumMg: num(cell('Sodium (mg)')), sugarsAddedG: num(cell('Sugars Added (g)')), alcoholG: num(cell('Alcohol (g)')) }
}

/** Entries grouped by day -> one macrofactor/foods record per day, sorted by time. */
export const foodDays = (days: Map<string, FoodEntry[]>) =>
  [...days].map(([day, entries]): RecordRow<FoodDay> => ({ source: 'macrofactor', kind: 'foods', id: day, day,
    data: { entries: entries.sort((a, b) => a.t.localeCompare(b.t)) } }))

export const macroFactorFoodLog: Importer = {
  id: 'macrofactor-food-log-csv', source: 'macrofactor', label: 'MacroFactor food log (CSV)',
  detect: f => !!f.csv && ['Date', 'Time', 'Food Name', 'Serving Qty', 'Calories (kcal)'].every(h => f.csv!.header.includes(h)),
  parse(f) {
    const h = f.csv!.header, days = new Map<string, FoodEntry[]>()
    for (const r of f.csv!.rows) {
      const day = r[h.indexOf('Date')]
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day ?? '')) continue
      days.set(day, [...(days.get(day) ?? []), foodEntry(name => (h.includes(name) ? r[h.indexOf(name)] : undefined))])
    }
    return foodDays(days)
  },
}
