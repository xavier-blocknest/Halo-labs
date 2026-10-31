// FORM Smart Swim goggles: the per-swim CSV export (FORM app → swim → Export, or "Export all swims", one CSV per swim).
// The file holds two tables: a one-row swim header (date, start/end time, pool size, HR device, firmware), a blank
// line, then one row per pool length or rest ("REST" in the stroke column) with move/rest time, strokes, stroke rate,
// distance per stroke, SWOLF, heart rate (from a paired armband such as the Polar OH1) and calories.
// Times are the goggles' local wall clock with no zone: read in the athlete's time zone (HALO_TZ, else the computer's zone).
// Every length is stored as recorded; glitchy ones are flagged when read (server/dashboard/swims.ts).
import { dayOf, num, offsetOf, zonedToUtc, type FormSwim, type SwimLength } from '../model.ts'
import { columns, type Importer, type Sniffed } from './files.ts'

const YD = 0.9144

/** "0:27.34", "61:50.64" or "1:02:03.5" -> seconds. */
export const clockS = (v: string | null) => {
  if (!v) return 0
  return v.split(':').reduce((a, p) => a * 60 + (Number(p) || 0), 0)
}

/** "10/31/2026" + "10:06:47AM" -> "2026-10-31T10:06:47" (local wall clock). */
function localStamp(date: string, time: string) {
  const d = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(date.trim()), t = /^(\d{1,2}):(\d{2}):(\d{2})\s*([AP]M)?$/i.exec(time.trim())
  if (!d || !t) throw new Error(`Unexpected FORM date/time: ${date} ${time}`)
  let h = Number(t[1]) % 12
  if (!t[4]) h = Number(t[1]); else if (t[4].toUpperCase() === 'PM') h += 12
  const p2 = (n: number | string) => String(n).padStart(2, '0')
  return `${d[3]}-${p2(d[1])}-${p2(d[2])}T${p2(h)}:${t[2]}:${t[3]}`
}

const HEAD = ['Swim Date', 'Swim Start Time', 'Pool Size']
const LENGTH_HEAD = (r: string[]) => r[0]?.trim() === 'Swim Date' && r.some(c => c.trim() === 'Strk') && r.some(c => c.trim() === 'SWOLF')

const isForm = (f: Sniffed) => !!f.csv && HEAD.every(h => f.csv!.header.some(c => c.trim() === h)) && f.csv.rows.some(LENGTH_HEAD)

export const formSwims: Importer = {
  id: 'form-swim-csv', source: 'form', label: 'FORM swim (CSV)',
  detect: isForm,
  parse(f) {
    const { header, rows } = f.csv!
    const h = columns(header), top = rows[0]
    const at = rows.findIndex(LENGTH_HEAD)
    if (at < 1) throw new Error('FORM file without a swim header row')
    const lh = rows[at], c = columns(lh)
    // Units come from the column names: "Length (m)" or "Length (yd)".
    const unit: 'm' | 'yd' = lh.some(x => /\(yd\)/i.test(x)) ? 'yd' : 'm'
    const toM = (v: number | null) => (v == null ? null : unit === 'yd' ? v * YD : v)
    const col = (r: string[], base: string) => c(r, `${base} (${unit})`)

    const date = h(top, 'Swim Date')!
    const start = zonedToUtc(localStamp(date, h(top, 'Swim Start Time')!))
    const endLocal = h(top, 'Swim End Time')
    let end = endLocal ? zonedToUtc(localStamp(date, endLocal)) : null
    if (end && end < start) end = new Date(Date.parse(end) + 86_400_000).toISOString().replace('.000Z', 'Z') // past midnight

    const lengths: SwimLength[] = []
    let cursor = 0 // seconds from the start, from the cumulative-time column
    for (const r of rows.slice(at + 1)) {
      if (LENGTH_HEAD(r)) break // a second swim in one file is not a known layout: stop rather than mix them
      const stroke = c(r, 'Strk')
      if (!stroke) continue
      const move = clockS(c(r, 'Move Time')), rest = clockS(c(r, 'Rest Time')), cumul = clockS(c(r, 'Cumul Time'))
      if (stroke.toUpperCase() === 'REST') {
        if (lengths.length) lengths[lengths.length - 1].restS += rest
        cursor = cumul || cursor + rest
        continue
      }
      const m = toM(num(col(r, 'Dist')) ?? num(col(r, 'Length')))
      const pos = (x: number | null) => (x == null || x <= 0 ? null : x)
      lengths.push({
        set: num(c(r, 'Set #')) ?? 0, setLabel: c(r, 'Set') ?? '', stroke: stroke.toUpperCase(),
        atS: Math.round((cumul ? cumul - move : cursor) * 100) / 100, s: move, m: m ?? 0, restS: rest,
        strokes: num(c(r, 'Strk Count')), rate: num(c(r, 'Avg Strk Rate (strk/min)')), dps: pos(toM(num(c(r, 'Avg DPS')))),
        swolf: num(c(r, 'SWOLF')), hr: pos(num(c(r, 'Avg BPM (moving)'))), maxHr: pos(num(c(r, 'Max BPM'))), kcal: num(c(r, 'Calories')),
      })
      cursor = cumul || cursor + move
    }
    if (!lengths.length) throw new Error('FORM file has no swim lengths')

    const pool = num(h(top, 'Pool Size'))
    const data: FormSwim = {
      start, end, tz: offsetOf(start), title: h(top, 'Swim Title'), variant: (h(top, 'Activity Variant') ?? 'pool').toLowerCase(),
      poolM: toM(pool), poolUnit: unit, hrDevice: h(top, 'HR Device'), device: h(top, 'Device'), firmware: h(top, 'Firmware'), lengths,
    }
    return [{ source: 'form' as const, kind: 'swim', id: start, day: dayOf(start), data }]
  },
}
