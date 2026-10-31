// Fuel page: the active nutrition protocol (plan/protocol, a Markdown doc) and the diet discipline rules (plan/diet),
// read against MacroFactor, labs, WHOOP and the training sessions. The documents are the source of truth for every
// target, rule and sentence; this file only finds the sections by their headings and adds the measured numbers.
import { readRecords } from '../db.ts'
import type { MdSection, MdTable } from '../import/markdown.ts'
import type { DietRule } from '../import/diet.ts'
import type { FoodDay, FoodEntry, LabResult, NutritionDay, WhoopCycle } from '../model.ts'
import { buildSessions } from './sessions.ts'
import { addDays, short } from './time.ts'

type ProtocolDoc = { title: string; start: string; retest: string | null; weeks: number | null; summary: string; sections: MdSection[] }

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const r1 = (x: number | null) => (x == null ? null : Math.round(x * 10) / 10)
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / 864e5)
const num = (s: string) => { const m = /(\d[\d,]*(?:\.\d+)?)/.exec(s); return m ? Number(m[1].replace(/,/g, '')) : null }
const col = (t: MdTable | undefined, re: RegExp) => (t ? t.header.findIndex(h => re.test(h)) : -1)
const firstSentence = (s: string) => /^.*?[.!?](?=\s|$)/.exec(s)?.[0] ?? s

/** "≤ 12 g" -> max 12, "≥ 30 g (10 g soluble from psyllium)" -> min 30 + the bracket as a note, "2,050 kcal" -> about 2050. */
function targetOf(value: string) {
  const op = /^\s*(≤|<=|<)/.test(value) ? 'max' : /^\s*(≥|>=|>)/.test(value) ? 'min' : /\d:\d\d/.test(value) ? 'time' : 'about'
  return { op, n: op === 'time' ? null : num(value), shown: value.replace(/\s*\(([^)]*)\)\s*$/, '').trim(), extra: /\(([^)]*)\)\s*$/.exec(value)?.[1] ?? null }
}

/** Which MacroFactor field a target row measures. */
const FIELD: [RegExp, keyof NutritionDay, string][] = [
  [/^calories/i, 'kcal', 'kcal'], [/^protein/i, 'proteinG', 'g'], [/^carb/i, 'carbsG', 'g'], [/^total fat|^fat/i, 'fatG', 'g'],
  [/saturated/i, 'satFatG', 'g'], [/cholesterol/i, 'cholesterolMg', 'mg'], [/fiber/i, 'fiberG', 'g'],
]

export function protocolSummary(today: string) {
  const rec = readRecords<ProtocolDoc>('plan', 'protocol').filter(r => r.data.start).sort((a, b) => a.data.start.localeCompare(b.data.start)).at(-1)
  if (!rec) return null
  const p = rec.data, sec = (re: RegExp) => p.sections.find(s => re.test(s.h))
  const weeks = p.weeks ?? (p.retest ? Math.ceil(daysBetween(p.retest, p.start) / 7) : 0)
  const dayN = daysBetween(today, p.start) + 1
  const status = dayN < 1 ? 'upcoming' : p.retest && today > p.retest ? 'done' : 'active'
  const week = status === 'upcoming' ? 0 : Math.min(weeks, Math.ceil(dayN / 7))

  // MacroFactor: logged days before the protocol (the 30 days before the start) and since it started.
  const mf = readRecords<NutritionDay>('macrofactor', 'day').filter(d => d.day && d.day <= today).map(d => ({ day: d.day!, ...d.data }))
  const logged = mf.filter(d => (d.kcal ?? 0) > 0)
  // "Before" = the last 30 full logged days before the start (partial logs under half the calorie target are skipped).
  const kcalGoal = num((sec(/daily targets/i)?.tables[0]?.rows ?? []).find(r => /^calories/i.test(r[0]))?.[1] ?? '')
  const full = (d: (typeof logged)[number]) => !kcalGoal || (d.kcal ?? 0) >= kcalGoal * 0.5
  const before = logged.filter(d => d.day < p.start && full(d)).slice(-30)
  const during = logged.filter(d => d.day >= p.start)
  const mean = (list: typeof logged, k: keyof NutritionDay) => r1(avg(list.map(d => d[k]).filter((x): x is number => typeof x === 'number')))

  // Daily targets, with the pre-protocol average and the protocol-window average for each one MacroFactor measures.
  const tt = sec(/daily targets/i)?.tables[0]
  const targets = (tt?.rows ?? []).map(row => {
    const name = row[0], t = targetOf(row[1] ?? ''), f = FIELD.find(([re]) => re.test(name))
    const meets = (x: number | null) => x == null || t.n == null ? null : t.op === 'max' ? x <= t.n : t.op === 'min' ? x >= t.n : Math.abs(x - t.n) <= Math.max(5, t.n * 0.05)
    const b = f ? mean(before, f[1]) : null, d = f ? mean(during, f[1]) : null
    return { name, value: t.shown, op: t.op, n: t.n, unit: f?.[2] ?? null, change: [row[2] ?? '', t.extra].filter(Boolean).join(' · '), isNew: /^new/i.test(row[2] ?? ''),
      before: b, beforeOk: meets(b), during: d, duringOk: meets(d) }
  })
  const tgt = (re: RegExp) => targets.find(t => re.test(t.name))

  // ApoB: the lab results are the numbers; the doc's "Why this test" table names the diet phase of each draw.
  const why = sec(/why/i)?.tables[0], phaseCol = col(why, /phase|diet/i)
  const phaseOf = (day: string) => {
    const [y, m] = [day.slice(0, 4), Number(day.slice(5, 7))]
    const row = why?.rows.find(r => { const s = r[0] ?? ''; return s.includes(y) && new Date(`${s.replace(/,? \d{4}.*/, '')} 1, 2000`).getMonth() + 1 === m })
    return row && phaseCol >= 0 ? row[phaseCol].replace(/\s*[(,].*$/, '').trim() : null
  }
  const apob = readRecords<LabResult>('labs', 'result').filter(r => /^APOLIPOPROTEIN B\b/.test(r.data.marker) && r.data.value != null)
    .sort((a, b) => a.day!.localeCompare(b.day!)).map(r => ({ day: r.day!, v: r.data.value!, phase: phaseOf(r.day!), unit: r.data.unit, range: r.data.range }))

  // Decision at retest: "≤ 80 | Strong responder | Stay on the protocol…". The best tier's number is the goal.
  const ds = sec(/decision/i), dt = ds?.tables[0]
  const decide = (dt?.rows ?? []).map(r => ({ k: r[0], meaning: r[1] ?? '', action: r[2] ?? '' }))
  const goal = decide.length ? { label: decide[0].k, n: num(decide[0].k) } : null

  // Food rules: In / Out / Limit per category. The "Out" items pause matching diet allowances during the protocol.
  const fr = sec(/food rules/i), ft = fr?.tables[0]
  const ci = { k: 0, inn: col(ft, /^in$/i), out: col(ft, /^out/i), lim: col(ft, /limit/i) }
  const rules = (ft?.rows ?? []).map(r => ({ k: r[ci.k], inn: r[ci.inn] ?? '', out: r[ci.out] ?? '', lim: r[ci.lim] ?? '' }))
  const outs = rules.flatMap(r => /^(none|no change)$/i.test(r.out) ? [] : r.out.split(/,\s*/).map(s => ({ item: s.trim(), category: r.k })))
  const ruleNotes = fr?.paragraphs.filter(x => /^[A-Z][^:]{2,40}:/.test(x)) ?? []
  const labelRule = ruleNotes.find(x => /^label rule/i.test(x)) ?? null

  // Sample day (the daily checklist), the supplement stack and the meal swaps.
  const sd = sec(/sample day/i), st = sd?.tables[0]
  const sc = { t: col(st, /time/i), meal: col(st, /meal/i), kcal: col(st, /kcal/i), p: col(st, /protein/i), sat: col(st, /sat/i) }
  const sampleRows = (st?.rows ?? []).filter(r => !/^total$/i.test(r[0] ?? ''))
  const total = (st?.rows ?? []).find(r => /^total$/i.test(r[0] ?? ''))
  const sample = sampleRows.map(r => ({ t: r[sc.t] ?? '', meal: r[sc.meal] ?? '', kcal: num(r[sc.kcal] ?? ''), protein: num(r[sc.p] ?? ''), satFat: num(r[sc.sat] ?? '') }))
  const supT = sec(/supplement/i)?.tables[0]
  const supplements = (supT?.rows ?? []).map(r => ({ name: r[0], dose: r[col(supT, /dose/i)] ?? '', timing: r[col(supT, /timing/i)] ?? '', effect: r[col(supT, /effect/i)] ?? '', notes: r[col(supT, /notes/i)] ?? '' }))
  const swT = sec(/swap/i)?.tables[0]
  const swaps = (swT?.rows ?? []).map(r => ({ meal: r[0], current: r[1] ?? '', instead: r[2] ?? '', saved: r[3] ?? '' }))

  // Weekly checks, each with what the data says about the last 7 days (logged days only for MacroFactor).
  const wk = sec(/weekly check/i)
  const from7 = addDays(today, -6), last7 = logged.filter(d => d.day >= from7)
  const wAvg = (a: string, b: string) => avg(mf.filter(d => d.day >= a && d.day <= b && d.weightLb).map(d => d.weightLb!))
  const wNow = wAvg(from7, today), wPrev = wAvg(addDays(from7, -7), addDays(from7, -1))
  const satT = tgt(/saturated/i), kcalT = tgt(/^calories/i)
  const sat7 = mean(last7, 'satFatG'), over15 = last7.filter(d => (d.satFatG ?? 0) > 15).length
  const kcal7 = mean(last7, 'kcal')
  const lifts7 = buildSessions().sessions.filter(s => s.sport === 'strength' && s.day >= from7 && s.day <= today)
  const cycles = readRecords<WhoopCycle>('whoop', 'cycle').filter(c => c.day && c.day <= today && c.data.recovery != null)
  const rec7 = avg(cycles.filter(c => c.day! >= from7).map(c => c.data.recovery!))
  const rec28 = avg(cycles.filter(c => c.day! < from7 && c.day! >= addDays(from7, -28)).map(c => c.data.recovery!))
  const hint = (text: string): { d: string; ok: boolean | null } => {
    if (/body weight/i.test(text)) return wNow == null ? { d: 'No weigh-ins in the last 7 days', ok: null }
      : { d: `${wNow.toFixed(1)} lb this week` + (wPrev == null ? '' : `, ${wNow - wPrev >= 0 ? '+' : '−'}${Math.abs(wNow - wPrev).toFixed(1)} lb vs the week before`), ok: wPrev == null ? null : wNow - wPrev >= -0.1 && wNow - wPrev <= 0.6 }
    if (/saturated/i.test(text)) return sat7 == null ? { d: 'No food logged in the last 7 days', ok: null }
      : { d: `${sat7} g/day over ${last7.length} logged day${last7.length === 1 ? '' : 's'} · ${over15} over 15 g`, ok: satT?.n != null ? sat7 <= satT.n && over15 <= 1 : null }
    if (/calories/i.test(text)) return kcal7 == null ? { d: 'No food logged in the last 7 days', ok: null }
      : { d: `${Math.round(kcal7).toLocaleString()} kcal/day over ${last7.length} logged day${last7.length === 1 ? '' : 's'}`, ok: kcalT?.n != null ? Math.abs(kcal7 - kcalT.n) <= 100 : null }
    if (/fitnessai|strength|PR\b/i.test(text)) { const prov = lifts7.filter(s => s.provisional).length
      return { d: `${lifts7.length} lift${lifts7.length === 1 ? '' : 's'} in the last 7 days` + (prov ? ` · ${prov} from WHOOP until the next FitnessAI export` : ''), ok: null } }
    if (/recovery/i.test(text)) return rec7 == null ? { d: 'No WHOOP recovery in the last 7 days', ok: null }
      : { d: `${Math.round(rec7)}% average` + (rec28 == null ? '' : ` vs ${Math.round(rec28)}% the 4 weeks before`), ok: rec28 == null ? null : rec7 >= rec28 - 5 }
    return { d: 'Tick it yourself', ok: null }
  }
  const weekly = (wk?.checks ?? []).map(t => ({ t, ...hint(t) }))
  const ifThen = (wk?.paragraphs ?? []).filter(x => /^If /.test(x)).map(x => { const [h, ...rest] = x.split(':'); return { when: h.trim(), then: firstSentence(rest.join(':').trim()) } })

  // Compliance so far: the doc's own rule (e.g. "more than 15 g saturated fat/day … does not count").
  const voidRule = ds?.paragraphs.find(x => /does not count|doesn't count/i.test(x)) ?? null
  const voidAt = voidRule ? num(/more than (\d+(?:\.\d+)?) ?g/i.exec(voidRule)?.[1] ?? '') : null
  const satDuring = during.map(d => d.satFatG).filter((x): x is number => x != null)

  return {
    title: p.title, start: p.start, startL: short(p.start), retest: p.retest, retestL: p.retest ? short(p.retest) : null, retestYear: p.retest?.slice(0, 4) ?? null,
    weeks, week, dayN, status, daysToRetest: p.retest ? Math.max(0, daysBetween(p.retest, today)) : null,
    summary: p.summary, imported: rec.day,
    targets, targetNotes: sec(/daily targets/i)?.paragraphs ?? [], beforeDays: before.length, beforeFrom: before[0]?.day ?? null, beforeTo: before.at(-1)?.day ?? null, duringDays: during.length, lastLogged: logged.at(-1)?.day ?? null,
    todayLog: logged.find(d => d.day === today) ? { kcal: logged.find(d => d.day === today)!.kcal, satFat: logged.find(d => d.day === today)!.satFatG } : null,
    apob, goal, decide, rules, outs, ruleNotes, labelRule,
    sample, sampleTotal: total ? { kcal: num(total[sc.kcal] ?? ''), protein: num(total[sc.p] ?? ''), satFat: num(total[sc.sat] ?? '') } : null,
    sampleNotes: sd?.paragraphs ?? [], supplements, notInStack: sec(/supplement/i)?.paragraphs.find(x => /^not in the stack/i.test(x)) ?? null, swaps,
    swapNote: sec(/swap/i)?.paragraphs.find(x => /^keep the calories/i.test(x)) ?? null,
    weekly, ifThen, voidRule, compliance: { days: satDuring.length, satFat: r1(avg(satDuring)), over: voidAt == null ? null : satDuring.filter(x => x > voidAt).length, voidAt },
  }
}

// ---- Food log (macrofactor/foods) ---------------------------------------------------------------------

const foodDays = (from: string, to: string) => readRecords<FoodDay>('macrofactor', 'foods').filter(r => r.day && r.day >= from && r.day <= to)
  .map(r => ({ day: r.day!, entries: r.data.entries })).sort((a, b) => b.day.localeCompare(a.day))
const sum = (es: FoodEntry[], k: keyof FoodEntry) => r1(es.reduce((a, e) => a + ((e[k] as number | null) ?? 0), 0))
/** Group "Egg, Whole" logged in different amounts under one name. */
const key = (name: string) => name.toLowerCase().replace(/\s+/g, ' ').trim()

export function foodSummary(today: string) {
  const recent = foodDays(addDays(today, -29), today)
  if (!recent.length) return null
  const days = recent.slice(0, 7).map(d => ({ day: d.day, label: short(d.day), entries: d.entries,
    totals: { kcal: sum(d.entries, 'kcal'), proteinG: sum(d.entries, 'proteinG'), satFatG: sum(d.entries, 'satFatG'), fiberG: sum(d.entries, 'fiberG'),
      noSat: d.entries.filter(e => e.satFatG == null && (e.fatG ?? 0) > 0.5).length } }))

  // Where the saturated fat came from in the last 7 days.
  const week = recent.filter(d => d.day >= addDays(today, -6)).flatMap(d => d.entries.map(e => ({ ...e, day: d.day })))
  const by = new Map<string, { name: string; satFatG: number; n: number; days: Set<string> }>()
  for (const e of week) { if (!e.satFatG) continue; const k = key(e.name), g = by.get(k) ?? { name: e.name, satFatG: 0, n: 0, days: new Set() }
    g.satFatG += e.satFatG; g.n++; g.days.add(e.day); by.set(k, g) }
  const satTotal = r1(week.reduce((a, e) => a + (e.satFatG ?? 0), 0)) ?? 0
  const satSources = [...by.values()].sort((a, b) => b.satFatG - a.satFatG).slice(0, 8)
    .map(g => ({ name: g.name, satFatG: r1(g.satFatG)!, n: g.n, days: g.days.size, share: satTotal ? Math.round(g.satFatG / satTotal * 100) : 0 }))
  const noSat = week.filter(e => e.satFatG == null && (e.fatG ?? 0) > 0.5)
  const noSatFoods = [...new Map(noSat.map(e => [key(e.name), { name: e.name, fatG: 0, n: 0 }])).values()]
  for (const e of noSat) { const g = noSatFoods.find(x => key(x.name) === key(e.name))!; g.fatG += e.fatG ?? 0; g.n++ }

  // Most logged foods, last 30 days.
  const counts = new Map<string, { name: string; n: number; kcal: number }>()
  for (const d of recent) for (const e of d.entries) { const k = key(e.name), g = counts.get(k) ?? { name: e.name, n: 0, kcal: 0 }; g.n++; g.kcal += e.kcal ?? 0; counts.set(k, g) }
  const frequent = [...counts.values()].sort((a, b) => b.n - a.n).slice(0, 8).map(g => ({ name: g.name, n: g.n, kcal: Math.round(g.kcal / g.n) }))

  return { days, satSources, satTotal, weekDays: new Set(week.map(e => e.day)).size, weekEntries: week.length,
    noSat: { n: noSat.length, foods: noSatFoods.sort((a, b) => b.fatG - a.fatG).slice(0, 5).map(g => ({ name: g.name, n: g.n, fatG: r1(g.fatG) })) },
    frequent, last: recent[0].day }
}

/** Food-log names that count as a use of a diet rule: the rule's name, or its last word ("Pork sausages" -> "sausage"). */
function ruleMatcher(name: string) {
  if (/alcohol/i.test(name)) return (e: FoodEntry) => (e.alcoholG ?? 0) >= 1
  const plain = name.toLowerCase(), words = plain.split(/\s+/), last = words.at(-1)!
  const keys = [plain, plain.replace(/e?s$/, ''), ...(words.length > 1 && !/^(cream|pass)$/.test(last) ? [last, last.replace(/s$/, '')] : [])].filter(k => k.length >= 4)
  // Whole words only ("Fried Rice" isn't fries), and flavourings don't count ("Pizza Flavored chips" isn't pizza).
  // Long words may end a compound ("cheeseburger" is a burger); short ones need a word start.
  const esc = (k: string) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(?:${keys.map(k => (k.length >= 6 && !k.includes(' ') ? '' : '\\b') + esc(k)).join('|')})\\b`, 'i')
  return (e: FoodEntry) => re.test(e.name) && !/flavou?r|seasoning/i.test(e.name)
}

export function dietSummary(today: string) {
  const rec = readRecords<{ rules: DietRule[]; uses: Record<string, string[]> }>('plan', 'diet').at(-1)
  if (!rec) return null
  // Uses found in the food log (one per day per rule), with the foods that matched.
  const log = foodDays(addDays(today, -60), today), fromLog: Record<string, { day: string; foods: string[] }[]> = {}
  for (const r of rec.data.rules) {
    const hit = ruleMatcher(r.name)
    for (const d of log) { const foods = [...new Set(d.entries.filter(hit).map(e => e.name))]; if (foods.length) (fromLog[r.id] ??= []).push({ day: d.day, foods }) }
  }
  return { rules: rec.data.rules, uses: rec.data.uses, fromLog, imported: rec.day }
}
