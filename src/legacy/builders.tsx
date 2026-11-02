// @ts-nocheck -- view-model builders for the v4 page layout (View.tsx), all computed from /api/dashboard
// (this.props.D) and the athlete's saved state. Nothing here is hard-coded data: when a source has no
// data the builders return empty states instead. Installed onto the Component prototype at the bottom.
import React from 'react'
import { END_OF_TURN_MS, startRecording, transcribe, voiceReady } from '../voice'
import { activeCoach, coachNotesPrompt } from '../coachPersona'
import { isSample } from '../sampleMode'
import { VOICE, VoiceBlob } from '../app/VoiceBlob'
import { A, AD, AGLOW, BACK_S, COMBO, Component, FRONT_S, G, ICONS, LINE_C, PAGES, R, SFX, T1, T2, T3, W, BodyScan, BootFx, setBootSteps } from './logic'

// ---- helpers ------------------------------------------------------------------------------------
const hm = (min) => (min == null ? '—' : Math.floor(min / 60) + ':' + String(Math.round(min % 60)).padStart(2, '0'))
const f1 = (x) => (x == null ? '—' : x.toFixed(1)) // always one decimal, like WHOOP's strain
const n1 = (x) => (x == null ? '—' : (Math.round(x * 10) / 10).toString())
const num = (x) => (x == null ? '—' : Math.round(x).toLocaleString())
const sign = (x, dp = 0) => (x == null ? '' : (x > 0 ? '+' : x < 0 ? '−' : '±') + Math.abs(x).toFixed(dp))
const pctOf = (a, b) => (a == null || !b ? null : Math.round((a - b) / b * 100))
const tile = (k, v, u, note, nc, c, go) => ({ k, v, u, note: note || '', nc: nc || T3, c: c || T1, go: go || null, cur: go ? 'pointer' : 'default' })
const noteRow = (dot, text, page = '', go = null) => ({ dot, text, page, go })
const fmtDay = (day, opts = { month: 'short', day: 'numeric' }) => new Date(day + 'T12:00:00Z').toLocaleDateString('en-US', { timeZone: 'UTC', ...opts })
const clock = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
const daysBetween = (a, b) => Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / 864e5)
const ZC = ['oklch(0.82 0.13 210 / 0.18)', 'oklch(0.82 0.13 210 / 0.4)', 'oklch(0.82 0.13 210 / 0.65)', A, 'oklch(0.9 0.1 210)']

/** Plain-text profile for the coach, built from the data (replaces the hand-written prototype profile). */
function chatProfile(D) {
  const w = D.whoop, t = D.training, f = D.fuel, b = D.body, vo2 = D.tests?.vo2?.at(-1), scan = b?.scans?.at(-1)
  const lines = [`Athlete: ${D.name}. Today is ${D.todayLabel}. Time zone ${D.tz}.`]
  lines.push('Latest data per source: ' + Object.entries(D.lastData).map(([s, d]) => `${s} ${d}`).join(', ') + '.')
  if (w) lines.push(`WHOOP (${w.latest.day}): recovery ${w.latest.rec}%, HRV ${w.latest.hrv} ms (30-day avg ${w.avg30.hrv}), resting HR ${w.latest.rhr} (avg ${w.avg30.rhr}), respiratory ${w.latest.resp} (avg ${w.avg30.resp}), sleep performance ${w.latest.performance ?? '—'}% (slept ${hm(w.latest.sleepMin)} vs need ${hm(w.latest.needMin)}), strain so far today ${w.latest.strainToday ?? '—'}, 7-day strain ${w.load7} vs 30-day ${w.load30}.`)
  if (vo2) lines.push(`VO2 test ${vo2.day}: VO2max ${vo2.vo2max}, max HR ${vo2.maxHr}, zones ${vo2.zones.map(z => `${z.zone} ${z.lowHr ?? '<'}–${z.highHr ?? '+'}`).join(', ')}.`)
  if (t) lines.push(`Training: streak ${t.streak} days; run ${t.kpis.runMonth.mi} mi this month (${t.kpis.runMonth.n} runs), ${t.kpis.runMonth.prevMi} last month; swim/bike/run ${t.kpis.sbrPerWeek} h/wk; strength ${t.kpis.strPerWeek}/wk; last ride ${t.kpis.lastRide ? t.kpis.lastRide.day : 'none'}. Heart rate, strain and zones for runs, swims and rides come from WHOOP, matched to each activity (distance and pace from the activity's own app; swims from FORM goggles when imported).`)
  const fs = t?.swim?.form ?? []
  if (fs.length) lines.push('FORM swim technique (newest first; yards; pace and SWOLF over clean lengths, glitchy lengths left out; SWOLF = strokes + seconds per pool length): ' + fs.map(x => {
    const dr = x.mainSet?.drift, mm = (v) => (v == null ? '—' : `${Math.floor(v / 60)}:${String(Math.round(v % 60)).padStart(2, '0')}`)
    return `${x.day} ${x.name}: ${x.yd} yd, ${x.swimMin} min swimming + ${x.restMin} min rest` + (x.free ? `; freestyle ${x.free.pace}/100yd, SWOLF ${x.free.swolf}, ${x.free.strokes} strokes/length, ${x.free.rate} strokes/min, ${x.free.dpsYd} yd/stroke` : '') +
      (dr ? `; main set ${x.mainSet.label}: SWOLF ${dr.swolf[0]}→${dr.swolf[1]}, pace ${mm(dr.paceS[0])}→${mm(dr.paceS[1])}/100yd, armband HR ${dr.hr[0]}→${dr.hr[1]} (first vs last ${dr.n} lengths)` : '') + (x.excluded ? `; ${x.excluded} lengths left out as bad readings` : '')
  }).join(' | ') + '.')
  const p = D.plan
  if (p) lines.push((p.goal.target
    ? `Main goal (a measurable target, not a race; everything serves it): ${p.goal.target.sentence}${p.goal.objective ? ' Why: ' + p.goal.objective : ''}` +
      (p.goal.target.testOnly ? ` This number only changes when a new test or an entered value comes in${p.goal.target.current ? ` (last one ${p.goal.target.current.ageDays} days ago)` : ''}: between tests judge progress by what moves with it (for VO₂ max: Zone 2 pace at the same heart rate, resting heart rate, HRV), never estimate a new value, and suggest a retest when one is due (every 8–12 weeks).` : '')
    : `Goal: ${p.goal.event}, ${p.goal.dateLabel}, ${p.goal.location} (${p.goal.daysTo} days)${p.goal.registered ? `, officially registered on ${p.goal.registered}` : ''}. ${p.goal.objective}`) +
    ` Upcoming: ${p.milestones.filter(m => m.status !== 'completed').slice(0, 5).map(m => `${m.name} (${m.when}, ${m.status}${m.target ? '; target: ' + m.target.sentence : ''})`).join('; ')}. Weekly schedule: ${Object.entries(p.schedule).map(([d, x]) => `${d.slice(0, 3)} ${x.join(' + ')}`).join('; ')}.` + (p.deload?.active ? ` Deload week ${p.deload.start} to ${p.deload.end} at ${Math.round(p.deload.fraction * 100)}% weights.` : '') + (p.hard75 ? ` Sustainable 75 Hard: ${p.hard75.status === 'in_progress' ? `day ${p.hard75.day} of ${p.hard75.days}` : p.hard75.status}, ${p.hard75.start} to ${p.hard75.end} (if he says he missed a day or is starting over, restart it with the restart_75_hard tool); daily rules: ${p.hard75.rules.join('; ')}. He tracks these in another app (no export): assume every day was completed unless he says otherwise; don't ask him to confirm them.` : '') + ` Unknowns: ${p.unknowns.join('; ') || 'none'}.` + (p.answered?.length ? ` Settled (don't ask again): ${p.answered.map(x => `${x.q}: ${x.a}`).join('; ')}.` : ''))
  const wp = D.weekPlans
  if (wp) {
    const showWeek = (label, start, w) => {
      const ds = Array.from({ length: 7 }, (_, i) => plusDays(start, i)).map(d => { const ss = plannedOn(D, d).sessions
        return `${fmtDay(d, { weekday: 'short', month: 'short', day: 'numeric' })}: ${ss.length ? ss.map(x => `[${x.sport}] ${x.title}${x.detail ? ` (${x.detail})` : ''}`).join('; ') : 'nothing planned'}` })
      return `${label} (week starting Monday ${start}; ${w ? `saved plan, ${w.by === 'coach' ? 'made with you' : 'edited by him'}` : 'no saved plan, roadmap template'}):\n${ds.join('\n')}` +
        (w?.targets.length ? `\nTargets: ${w.targets.join('; ')}` : '') + (w?.notes.length ? `\nNotes: ${w.notes.join('; ')}` : '')
    }
    lines.push(`Week plans. You can save a week's plan with the save_week_plan tool once he agrees to it or asks for a change; it shows on his Week page.\n${showWeek('This week', wp.thisStart, wp.this)}\n${showWeek('Next week', wp.nextStart, wp.next)}` +
      (wp.later ?? []).map(w => `\n${showWeek(`Week of ${fmtDay(w.start)}`, w.start, w)}`).join(''))
  }
  { // Priorities card (Overview): what the athlete sees, in order, with ids for the update_priorities tool.
    let al = {}; try { al = JSON.parse(localStorage.getItem('im4-al') || '{}') } catch (e) {}
    const ps = priorities(D), hidden = (D.coachPriorities ?? []).filter(p => !p.custom && p.removed)
    const st = a => al[a.key] === 'done' ? 'marked done' : al[a.key] === 'snoozed' ? 'snoozed' : al[a.key] === 'dismissed' ? 'dismissed' : 'active'
    lines.push(`Priorities (the Overview card shows the first 3 active ones; you can add, edit, remove or restore them with the update_priorities tool):\n` +
      (ps.length ? ps.map(a => `${a.id} [${a.src}${a.edited ? ', reworded by you' : ''}${a.pos === 'first' && a.src === 'data' ? ', moved first' : ''}] ${st(a)}: ${a.title}${a.why ? ` (${a.why})` : ''} → ${a.act}`).join('\n') : 'none') +
      (hidden.length ? `\nData priorities you removed: ${hidden.map(p => p.id).join(', ')} (restore brings one back if it still applies).` : ''))
  }
  const lv = D.body?.volume
  if (lv) { const f = (k, l) => { const x = lv.periods[k]; return `${l} ${x.lb.toLocaleString()} lb, ${x.sets} sets, ${x.reps} reps, ${x.n} sessions` + (x.prev ? ` (prior period ${x.prev.lb.toLocaleString()} lb, ${x.prev.sets} sets)` : '') }
    lines.push(`Lifting volume (weight lifted = reps × weight, FitnessAI + screenshots): ${f('week', 'this week so far')}; ${f('d30', 'last 30 days')}; ${f('year', 'this year')}. Most weight moved in 30 days: ${lv.periods.d30.top.map(t => `${t.name} ${t.lb.toLocaleString()} lb`).join(', ')}.`) }
  // Journal (owner's choice: the coach may read it). Newest first, capped so the prompt stays small.
  // Workouts he linked to an entry: the entry is about that session (how it felt, pain, conditions, …).
  const linked = e => (e.workouts ?? []).length ? ` [Linked workout${e.workouts.length > 1 ? 's' : ''}: ${e.workouts.map(w => w.missing ? `a ${w.sport} on ${w.day} (no longer in the data)` : `${w.name} (${w.sport}, ${w.day} ${w.time}${w.mi != null ? `, ${w.mi} mi` : w.yd != null ? `, ${w.yd} yd` : ''}${w.min ? `, ${w.min} min` : ''}${w.strain != null ? `, strain ${w.strain}` : ''}${w.avgHr ? `, avg HR ${w.avgHr}` : ''})`).join('; ')}]` : ''
  const jr = (D.journal ?? []).slice(0, 12).map(e => (e.doc
    ? `${e.date} · "${e.title}" from ${e.doc.from}. TL;DR: ${e.doc.tldr.map(t => `${t.k} ${t.v}`).join(' ')} Full text: ${e.doc.blocks.filter(b => b.type !== 'sig').map(b => (b.lead ? b.lead + ' ' : '') + b.t).join(' ')}` + (e.note ? ` His notes: ${e.note}` : '')
    : `${e.date} · his entry "${e.title || 'Untitled'}": ${e.body}`) + linked(e)).join('\n').slice(0, 16000)
  if (jr) lines.push(`Journal (his own entries and documents from his care team; cite them when relevant):\n${jr}`)
  const cal = (D.calendar ?? []).filter(i => i.daysTo >= -7 && i.daysTo <= 120)
  if (cal.length) lines.push(`Calendar (his appointments and events, plus dated roadmap milestones; today is ${D.today}):\n` + cal.map(i => `${i.date}${i.time ? ' ' + i.time : ''} · ${i.title} [${i.kind}]${i.location ? ` at ${i.location}` : ''}${i.note ? ` (${i.note})` : ''} · ${i.daysTo === 0 ? 'today' : i.daysTo > 0 ? `in ${i.daysTo} days` : `${-i.daysTo} days ago`}`).join('\n'))
  if (scan) lines.push(`DEXA ${scan.day}: ${scan.bodyFatPct}% body fat, lean ${scan.leanLb} lb, fat ${scan.fatLb} lb, VAT ${scan.vatLb} lb.`)
  const P = D.protocol
  if (P) {
    lines.push(`Nutrition protocol (the athlete's own document, the source of truth for food): "${P.title}", ${P.startL} to retest ${P.retestL ?? 'unknown'}; status ${P.status}, week ${P.week} of ${P.weeks}, ${P.daysToRetest ?? '?'} days to retest. ${P.summary}`)
    lines.push('Daily targets: ' + P.targets.map(t => `${t.name} ${t.value}${t.before != null ? ` (before the protocol: ${t.before} ${t.unit ?? ''})` : ''}`).join('; ') + `. "Before" = last ${P.beforeDays} full logged days before the start.` + (P.compliance.days ? ` Since the start: sat fat ${P.compliance.satFat} g/day over ${P.compliance.days} logged days.` : ' No food logged since the start yet.'))
    lines.push('ApoB (labs): ' + P.apob.map(a => `${a.day} ${a.v}${a.phase ? ` (${a.phase})` : ''}`).join(', ') + '.')
    lines.push('Food rules (in / out / limit): ' + P.rules.map(r => `${r.k}: ${r.inn} / ${r.out} / ${r.lim}`).join('; ') + '. ' + P.ruleNotes.join(' '))
    lines.push('Meal swaps: ' + P.swaps.map(w => `${w.meal}: ${w.instead} (saves ${w.saved})`).join('; ') + '. ' + (P.swapNote ?? ''))
    lines.push('Supplements: ' + P.supplements.map(x => `${x.name} ${x.dose}, ${x.timing}`).join('; ') + '. ' + (P.notInStack ?? ''))
    lines.push('Sample day: ' + P.sample.map(x => `${x.t} ${x.meal}`).join('; ') + '. ' + P.sampleNotes.join(' '))
    lines.push('Weekly checks: ' + P.weekly.map(x => `${x.t} [data: ${x.d}]`).join('; ') + '. ' + P.ifThen.map(x => x.when + ': ' + x.then).join(' '))
    lines.push('Decision at retest: ' + P.decide.map(d => `${d.k}: ${d.meaning}; ${d.action}`).join(' | ') + ' ' + (P.voidRule ?? ''))
  }
  if (D.foods) {
    lines.push('Food log (MacroFactor), recent days: ' + D.foods.days.slice(0, 3).map(d => `${d.day} (${d.totals.kcal} kcal, ${d.totals.satFatG} g sat fat${d.totals.noSat ? `, ${d.totals.noSat} foods missing sat-fat data` : ''}): ` + d.entries.map(e => `${e.t} ${e.name} ${e.qty ?? ''} ${e.unit ?? ''} ${e.kcal != null ? Math.round(e.kcal) + ' kcal' : ''}${e.satFatG != null ? ', ' + e.satFatG + ' g sat' : ''}`.replace(/\s+/g, ' ').trim()).join('; ')).join(' | '))
    lines.push('Top saturated-fat sources, last 7 days: ' + D.foods.satSources.map(s => `${s.name} ${s.satFatG} g (${s.share}%)`).join(', ') + `. Most logged foods (30 days): ` + D.foods.frequent.map(f => `${f.name} ${f.n}x`).join(', ') + '.')
  }
  const supps = readSupps()
  if (supps.length) lines.push('Usual supplements (his own list, separate from the protocol stack): ' + supps.map(x => { const l = suppLast(D, x.name)
    return `${x.name}${x.dose ? ' ' + x.dose : ''} (${l ? (l.day === D.today ? 'taken today ' + t12(l.t) : 'last logged ' + l.day) : 'not in the recent food log'})` }).join('; ') + '.')
  if (D.diet) {
    const mine = (() => { try { return JSON.parse(localStorage.getItem('im4-diet') || '{}') } catch (e) { return {} } })()
    lines.push('Diet discipline allowances (rolling windows): ' + D.diet.rules.map(r => { const used = [...new Set([...(D.diet.uses[r.id] || []), ...(D.diet.fromLog?.[r.id] || []).map(x => x.day), ...(mine[r.id] || [])])].sort()
      return `${r.name} ${r.count}x per ${r.windowDays} days${r.note ? ` (${r.note})` : ''}${used.length ? `, last ${used.at(-1)}` : ''}` }).join('; ') + '. During the protocol, its Out list overrides these allowances.')
  }
  const rw = D.recoveryWork
  if (rw) { const goals = readRwGoals()
    lines.push('Recovery work logged in WHOOP (WHOOP does not share heart rate for these, so duration only): ' + rw.types.filter(t => t.n90).map(t => `${t.name} ${t.n7} in the last 7 days, ${t.n30} in 30 days (${t.min30} min), ${t.thisWeek} this week${goals[t.name] ? ` of a ${goals[t.name]}/week target` : ''}, usually ${t.avgMin} min, last ${t.last}`).join('; ') + '.'
      + (rw.recent.length ? ' Last 7 days: ' + rw.recent.map(x => `${x.day} ${x.name} ${x.min} min`).join(', ') + '.' : '')
      + rw.effects.filter(e => e.ready).map(e => ` Strain-matched next-day recovery after ${e.name.toLowerCase()}: ${e.recWith}% vs ${e.recWithout}% without (${e.n} days${e.hrv != null ? `, HRV ${e.hrv >= 0 ? '+' : ''}${e.hrv} ms` : ''}).`).join('')) }
  if (f) lines.push(`Nutrition: trend weight ${f.trend?.now} lb; food logged ${f.logged30.length} of last 30 days; target ${f.target ? `${f.target.kcal} kcal, ${f.target.proteinG} g protein` : 'none'}.`)
  return lines.join('\n')
}

// ---- Command -------------------------------------------------------------------------------------
function signalsOf(D) {
  const w = D.whoop
  if (!w) return null
  const L = w.latest, M = w.avg30, st = (bad, warn) => (bad ? R : warn ? W : G)
  const hrvPct = pctOf(L.hrv, M.hrv), respD = L.resp != null && M.resp != null ? +(L.resp - M.resp).toFixed(1) : null, rhrD = L.rhr != null && M.rhr != null ? +(L.rhr - M.rhr).toFixed(1) : null
  return [
    { k: 'Recovery', v: L.rec, u: '%', note: L.rec >= 67 ? 'Green' : L.rec >= 34 ? 'Yellow zone' : 'Red zone', c: st(L.rec < 34, L.rec < 67) },
    { k: 'HRV', v: L.hrv, u: 'ms', note: sign(hrvPct) + '% vs 30-day avg', c: st(hrvPct <= -20, hrvPct <= -8) },
    { k: 'Respiratory rate', v: L.resp, u: 'rpm', note: sign(respD, 1) + ' vs avg' + (L.resp != null && L.resp >= L.respMax30 ? ' · 30-day high' : ''), c: st(respD >= 1.5, respD >= 0.6) },
    { k: 'Resting HR', v: L.rhr, u: 'bpm', note: sign(rhrD, 1) + ' vs avg', c: st(rhrD >= 4, rhrD >= 2) },
    // Sleep as WHOOP shows it: performance %, colored with WHOOP's bands (≥85 optimal, 70–84 sufficient, <70 poor).
    L.performance != null
      ? { k: 'Sleep', v: L.performance, u: '%', note: hm(L.sleepMin) + ' · need ' + hm(L.needMin), c: st(L.performance < 70, L.performance < 85) }
      : { k: 'Sleep', v: hm(L.sleepMin), u: '', note: 'Need ' + hm(L.needMin) + (L.sleepMin >= L.needMin ? ' · met' : ''), c: st(L.sleepMin < L.needMin * 0.8, L.sleepMin < L.needMin) },
    // Today's strain as WHOOP shows it (builds through the day); the dot still rates the 7-day load.
    { k: 'Strain', v: f1(L.strainToday), u: 'today', note: '7-day avg ' + n1(w.load7) + ' vs ' + n1(w.load30), c: st(w.load7 > w.load30 * 1.3, w.load7 > w.load30 * 1.1) },
  ]
}

function zonesOf(D) {
  const z = D.tests?.vo2?.at(-1)?.zones ?? []
  const get = (id) => z.find(x => x.zone === id)
  return { z1: get('Z1')?.highHr ?? null, z2: get('Z2') ? [get('Z2').lowHr, get('Z2').highHr] : null }
}

function verdict(go) {
  const D = this.props.D, sig = signalsOf(D)
  if (!sig) {
    return { signals: [], vdPlan: [], vdScale: [],
      vd: { word: 'No recovery data', c: T3, line: 'Connect WHOOP or upload a WHOOP export on Settings to get a daily call.', planTitle: '', why: '', wash: 'transparent', border: LINE_C, ring: LINE_C, ov: '', ovc: T3 } }
  }
  const L = D.whoop.latest
  const signals = sig.map(s => ({ ...s, go: s.k === 'Strain' ? go.training : go.recovery }))
  const reds = signals.filter(s => s.c === R).length, yellows = signals.filter(s => s.c === W).length
  let auto = (L.rec < 34 || reds >= 2) ? 'rest' : (L.rec >= 67 && reds === 0 && yellows <= 1) ? 'hard' : 'easy'
  let note = ''
  const hurt = (this.state.inj || []).filter(x => x.status !== 'Resolved' && x.sev !== 'Mild')
  if (hurt.length) { auto = 'rest'; note = 'Active injury: ' + hurt[0].area.toLowerCase() + ' (' + hurt[0].sev.toLowerCase() + ')' }
  const cur = this.state.vOv || auto
  const { z1, z2 } = zonesOf(D)
  const cap = z2 ? 'Zone 2' : 'an easy, conversational effort'
  const V = {
    hard: { word: 'Train hard', c: G, line: 'Recovery is green and no signal is red. A good day for a quality session.', planTitle: 'Plan · quality day',
      plan: [{ sport: 'KEY', title: 'Quality session', detail: 'Intervals or a tempo effort after a 15-minute warm-up' + (z2 ? ' in Zone 2' : ''), time: '' },
        { sport: 'FUEL', title: 'Carbs around the session', detail: 'Eat before and refuel within an hour after', time: '' }] },
    easy: { word: 'Train easy', c: W, line: `Recovery is ${L.rec}% with ${reds} red and ${yellows} yellow signals. Keep training aerobic.`, planTitle: 'Plan · aerobic day',
      plan: [{ sport: 'CARDIO', title: 'Easy aerobic only', detail: 'Stay in ' + cap, time: '' },
        { sport: 'STRENGTH', title: 'Lift light if you lift', detail: 'Fewer sets, nothing to failure', time: '' },
        { sport: 'SLEEP', title: 'Bank sleep tonight', detail: 'Aim for your need of ' + hm(L.needMin), time: '' }] },
    rest: { word: 'Rest', c: R, line: 'Too many signals are down. Skip training, walk, and check in tomorrow.', planTitle: 'Plan · recovery day',
      plan: [{ sport: 'WALK', title: 'Easy walk · 30–45 min', detail: z1 ? 'Stay in Zone 1' : 'Very easy', time: '' },
        { sport: 'MOBILITY', title: 'Light stretching · 20 min', detail: 'Hips, calves, upper back', time: '' },
        { sport: 'SLEEP', title: 'Early night', detail: 'Aim for ' + hm(L.needMin) + ' or more', time: '' }] },
  }
  const P = V[cur], washes = { hard: 'oklch(0.78 0.15 160 / 0.16)', easy: 'oklch(0.82 0.14 80 / 0.14)', rest: 'oklch(0.7 0.18 25 / 0.16)' }
  const why = note || (auto === 'easy' ? 'Easy because recovery is 34–66% or signals are mixed' : auto === 'hard' ? 'Hard because recovery is green and no signal is red' : 'Rest because recovery is red or 2+ signals are red')
  return {
    signals,
    vd: { word: P.word, c: P.c, line: P.line, planTitle: P.planTitle, why: cur === auto ? why : 'Previewing · auto call is ' + V[auto].word.toLowerCase(),
      wash: washes[cur], border: P.c.replace(')', ' / 0.35)'), ring: P.c.replace(')', ' / 0.18)'),
      ov: this.state.vOv ? 'Override · tap ' + V[auto].word.replace('Train ', '') + ' to return to auto' : 'Auto · from WHOOP' + (z2 ? ' and your VO₂ zones' : ''), ovc: this.state.vOv ? W : T3 },
    vdScale: [['hard', 'Hard', G], ['easy', 'Easy', W], ['rest', 'Rest', R]].map(x => ({ label: x[1], pick: () => this.setState(s => ({ vOv: (x[0] === auto || s.vOv === x[0]) ? null : x[0] })),
      bg: x[0] === cur ? 'oklch(1 0 0 / 0.08)' : 'transparent', fg: x[0] === cur ? T1 : T3, dot: x[0] === cur ? x[2] : 'oklch(1 0 0 / 0.2)', glow: x[0] === cur ? '0 0 8px ' + x[2] : 'none' })),
    vdPlan: P.plan,
  }
}

/** Priorities from the data: stale sources, recovery signals, logging gaps, out-of-range labs, neglected work. */
function dataPriorities(D) {
  const out = [], w = D.whoop, t = D.training, f = D.fuel, b = D.body
  for (const [src, label] of [['whoop', 'WHOOP'], ['strava', 'Strava']]) {
    const last = D.lastData[src]
    if (last && daysBetween(D.today, last) > 2) out.push({ id: 'stale-' + src, c: W, title: `${label} data is ${daysBetween(D.today, last)} days old`, why: `The latest ${label} record is from ${fmtDay(last)}, so today's numbers lag behind.`, act: `Connect ${label} on Settings, or upload a fresh export` })
  }
  const nr = D.plan?.nextRace
  if (nr && nr.daysTo <= 14 && nr.name !== D.plan.goal.event) out.push({ id: 'race-' + nr.name + nr.start, c: A, title: `${nr.name} in ${nr.daysTo} day${nr.daysTo === 1 ? '' : 's'}`, why: `${nr.when}.` + (nr.targetTime ? ` Target ${nr.targetTime}.` : ' No goal time set yet.'), act: nr.daysTo <= 3 ? 'Keep it easy and rest your legs' : 'Keep runs easy and plan a light week before it' })
  if (w) {
    const hp = pctOf(w.latest.hrv, w.avg30.hrv)
    if (hp <= -8) out.push({ id: 'hrv', c: hp <= -20 ? R : W, title: 'HRV is down', why: `${w.latest.hrv} ms, ${sign(hp)}% vs your 30-day average of ${Math.round(w.avg30.hrv)}.`, act: 'Keep today aerobic and watch for illness' })
    if (w.latest.resp != null && w.avg30.resp != null && w.latest.resp - w.avg30.resp >= 0.6) out.push({ id: 'resp', c: W, title: 'Breathing rate is up', why: `${w.latest.resp} rpm vs ${w.avg30.resp} average.`, act: 'Take it easy if you feel run down' })
  }
  if (f && f.logged30.length < 15) out.push({ id: 'log', c: W, title: `Food logged on ${f.logged30.length} of the last 30 days`, why: 'Without intake, MacroFactor can\'t estimate expenditure and the targets are guesses.', act: 'Log meals in MacroFactor, even protein only' })
  const draw = D.tests?.draws?.at(-1)
  if (draw) {
    const flagged = D.tests.markers.filter(m => m.values[draw.id]?.f)
    if (flagged.length) out.push({ id: 'labs-' + draw.id, c: W, title: `${flagged.length} lab markers out of range on ${draw.label}`, why: flagged.slice(0, 5).map(m => `${m.name} ${m.values[draw.id].t}`).join(', ') + (flagged.length > 5 ? '…' : '') + '.', act: 'Go through them with your doctor' })
  }
  const prov = t?.merge.unmatched.provisionalLifts ?? []
  if (prov.length) out.unshift({ id: 'fitnessai-' + prov.at(-1), c: W, title: `${prov.length} lift${prov.length === 1 ? '' : 's'} counted from WHOOP until FitnessAI is updated`,
    why: `FitnessAI data ends ${fmtDay(t.merge.unmatched.fitnessCoveredUntil)}. WHOOP lifts since then (${prov.map(d => fmtDay(d)).join(', ')}) stand in, without sets or exercises.`,
    act: 'Request a FitnessAI export and upload it on Settings' })
  if (t?.kpis.lastRide && t.kpis.lastRide.daysAgo > 14) out.push({ id: 'ride', c: W, title: `No ride in ${t.kpis.lastRide.daysAgo} days`, why: `Last ride was ${fmtDay(t.kpis.lastRide.day)}, ` + (t.kpis.lastRide.mi != null ? `${t.kpis.lastRide.mi} mi.` : `${t.kpis.lastRide.min} min indoors.`), act: 'Get a ride in this week' })
  if (b?.load.d30.sets > 100) {
    const weak = Object.entries(b.load.d30.m).filter(([, v]) => v < 10).map(([k]) => k)
    if (weak.length) out.push({ id: 'weak', c: W, title: `${weak.slice(0, 3).join(', ')} barely trained`, why: `Under 10 weighted sets each in the last 30 days.`, act: 'Add a few sets for them this week' })
  }
  return out
}

/** The card's list: the data-driven priorities with the coach's edits applied (reworded, moved first, hidden), plus
 *  the coach's own (D.coachPriorities, server/priorities.ts). key = what Done/Snooze/Dismiss store in im4-al: the id
 *  for data-driven ones, id@updated for the coach's, so an edited coach priority shows again. */
function priorities(D) {
  const cp = D.coachPriorities ?? [], ov = Object.fromEntries(cp.filter(p => !p.custom).map(p => [p.id, p]))
  const auto = dataPriorities(D).filter(a => !ov[a.id]?.removed).map(a => { const o = ov[a.id]
    return { ...a, key: a.id, src: 'data', edited: !!o, pos: o?.position ?? 'after_data', title: o?.title || a.title, why: o?.why || a.why, act: o?.act || a.act } })
  const mine = cp.filter(p => p.custom).map(p => ({ id: p.id, key: p.id + '@' + p.updated, src: 'coach', c: A, title: p.title, why: p.why, act: p.act, pos: p.position ?? 'first' }))
  const all = [...mine, ...auto]
  return [...all.filter(a => a.pos === 'first'), ...all.filter(a => a.pos !== 'first')]
}

function command(go) {
  const D = this.props.D
  const ALL = priorities(D)
  const al = this.state.al, setAl = (id, st) => this.setState(s => { const n = Object.assign({}, s.al); n[id] = st; this.saveLS('im4-al', n); return { al: n } })
  const active = ALL.filter(a => !al[a.key]), top = active.slice(0, 3)
  return {
    prio: top.map((a, i) => ({ n: String(i + 1).padStart(2, '0'), title: a.title, why: a.why, act: a.act, c: a.c, bc: a.c.replace(')', ' / 0.3)'), done: () => setAl(a.key, 'done'), snooze: () => setAl(a.key, 'snoozed'), dismiss: () => setAl(a.key, 'dismissed') })),
    prioEmpty: top.length === 0, prioMeta: top.length + ' of ' + active.length + ' active',
    prioQueued: Math.max(0, active.length - 3) + ' more queued · ' + Object.values(al).filter(x => x === 'done').length + ' done · ' + Object.values(al).filter(x => x === 'snoozed').length + ' snoozed',
    prioReset: () => this.setState(() => { this.saveLS('im4-al', {}); return { al: {} } }), prioResetT: Object.keys(al).length ? 'Restore all' : '',
  }
}

// ---- Week ----------------------------------------------------------------------------------------
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const plannedSport = (item) => (/\brun/i.test(item) ? 'run' : /swim/i.test(item) ? 'swim' : /ride|bike|cycl/i.test(item) ? 'ride' : /rest/i.test(item) ? 'rest' : 'strength')

/** What's planned on a day: the saved week plan (coach or Week page) when that week has one, else the roadmap's
 *  weekly template. Sessions are { sport, title, detail }. */
function plannedOn(D, day) {
  const wp = D.weekPlans, plan = [wp?.this, wp?.next, ...(wp?.later ?? [])].find(w => w && day >= w.start && day <= plusDays(w.start, 6)) ?? null
  if (plan) return { saved: true, sessions: plan.days[day] ?? [] }
  const wd = (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7
  return { saved: false, sessions: (D.plan?.schedule[DAY_KEYS[wd]] ?? []).map(x => ({ sport: plannedSport(x), title: x, detail: '' })) }
}

function weekData() {
  const D = this.props.D, plan = D.plan, wp = D.weekPlans
  if (!wp) return { wkBudget: [], wkDays: [], wk: null }
  // No activity data yet (no WHOOP/Strava): still show the plan, with this week's dates and nothing marked done or missed.
  const live = !!D.training
  const t = D.training ?? { weekDays: Array.from({ length: 7 }, (_, i) => { const day = plusDays(wp.thisStart, i); return { day, items: [], today: day === D.today, future: day > D.today } }) }
  const SPORT = { run: 'Run', ride: 'Ride', swim: 'Swim', walk: 'Walk', strength: 'Lift', other: 'Activity' }
  const describe = it => `${SPORT[it.sport]} · ${it.mi != null ? it.mi + ' mi' : it.yd != null ? it.yd.toLocaleString() + ' yd' : it.min + ' min'}`
  // Tabs: this week, next week, and any saved weeks further ahead (by their Monday).
  const later = wp.later ?? [], picked = later.find(w => w.start === this.state.wkSel)
  const sel = picked ? picked.start : this.state.wkSel === 'next' ? 'next' : 'this'
  const start = picked ? picked.start : sel === 'next' ? wp.nextStart : wp.thisStart, saved = picked ?? (sel === 'next' ? wp.next : wp.this)
  const TRACKED = new Set(['strength', 'run', 'swim', 'ride', 'walk']) // sports a recorded session can confirm
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = plusDays(start, i), actual = sel === 'this' ? t.weekDays[i] : null
    const items = actual?.items ?? [], future = actual ? actual.future : true, today = !!actual?.today
    const deload = sel === 'this' && plan?.deload && day >= plan.deload.start && day <= plan.deload.end && !saved
    const left = {}; for (const it of items) left[it.sport] = (left[it.sport] ?? 0) + 1
    const sessions = plannedOn(D, day).sessions
    const rows = sessions.map(x => {
      const done = TRACKED.has(x.sport) && left[x.sport] > 0; if (done) left[x.sport]--
      const tag = x.sport === 'rest' ? (live && !future && !items.length ? 'Rest' : '') : done ? 'Done' : future ? (deload && x.sport === 'strength' ? 'Deload' : '') : today ? 'Today' : live && TRACKED.has(x.sport) ? 'Missed' : ''
      const tc = tag === 'Done' ? G : tag === 'Missed' ? R : tag === 'Today' ? A : T3
      return { t: x.title + (deload && x.sport === 'strength' ? ` · ${Math.round(plan.deload.fraction * 100)}%` : ''), detail: x.detail, sport: x.sport,
        fg: tag === 'Missed' ? T3 : T1, td: tag === 'Missed' ? 'line-through' : 'none', tag, tc, to: tag ? 1 : 0 }
    })
    return { day, d: fmtDay(day, { weekday: 'short' }), date: fmtDay(day, { month: 'short', day: 'numeric' }), today, sessions,
      plan: rows.length ? rows : [{ t: future || !live ? 'Nothing planned' : items.length ? 'Nothing planned' : 'No activity', detail: '', fg: T3, td: 'none', tag: '', tc: T3, to: 0 }],
      actual: items.length ? items.map(describe).join(' · ') : future ? '' : '—', showActual: live && sel === 'this',
      src: items.length ? `${items.reduce((a, it) => a + it.min, 0)} min total` : '', ac: items.length ? G : T3,
      dc: today ? A : T1, b: today ? '1px solid oklch(0.82 0.13 210 / 0.35)' : '1px solid ' + LINE_C, bg: today ? 'oklch(0.82 0.13 210 / 0.06)' : 'oklch(1 0 0 / 0.015)' }
  })
  // Session goals: counted from this week's saved plan when there is one, else the roadmap baseline.
  const c = t.weekCounts, ws = plan?.weeklySessions, tp = wp.this
  const count = sp => tp ? Object.values(tp.days).flat().filter(x => x.sport === sp).length : null
  // A planned 0 stays 0 (e.g. a no-run week); only the usual-average fallback is floored at 1.
  const b = (k, key, planned) => { const goal = planned ?? Math.max(1, Math.round(c.avg4[key]))
    return { k, done: c.now[key], goal, pct: (goal ? Math.min(100, Math.round(c.now[key] / goal * 100)) : c.now[key] ? 100 : 0) + '%', note: (planned != null ? `Plan ${planned} this week · ` : '') + `usual ${c.avg4[key]}`, c: A, nc: T3 } }
  const wkBudget = !live ? [] : tp
    ? [b('Strength', 'strength', count('strength')), b('Runs', 'runs', count('run')), b('Swims', 'swims', count('swim')), b('Rides', 'rides', count('ride')), b('Active days', 'activeDays', 7)]
    : ws ? [b('Strength', 'strength', ws.strength), b('Runs', 'runs', ws.running), b('Swims', 'swims', ws.swimming), b('Active days', 'activeDays', 7)]
    : [b('Strength', 'strength'), b('Runs', 'runs'), b('Swims', 'swims'), b('Rides', 'rides'), b('Active days', 'activeDays')]
  // Edits from the page replace one day; a week without a saved plan is first filled in from the template.
  const saveDay = async (day, sessions) => {
    const all = Object.fromEntries(days.map(x => [x.day, x.sessions]))
    all[day] = sessions
    const r = await fetch(`/api/week-plan/${start}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ days: all, targets: saved?.targets ?? [], notes: saved?.notes ?? [] }) })
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `Server error ${r.status}`)
    window.dispatchEvent(new Event('halolabs:data'))
  }
  const end = plusDays(start, 6)
  return { wkBudget, wkDays: days, wk: {
    tabs: this.seg([['this', 'This week'], ['next', 'Next week'], ...later.map(w => [w.start, 'Week of ' + fmtDay(w.start)])], sel, id => this.setState({ wkSel: id })),
    title: `${fmtDay(start)} – ${fmtDay(end)}` + (sel === 'this' ? (live ? ' · plan vs actual' : ' · this week') : ' · coming up'),
    note: saved ? `${saved.by === 'coach' ? 'Planned with ' + activeCoach().name : 'Your plan'} · updated ${fmtDay(saved.updated.slice(0, 10))}` : plan ? 'From your roadmap\'s weekly template' : 'No plan yet',
    noteC: saved ? T2 : T3, deload: sel === 'this' && !saved && plan?.deload?.active ? `Deload week · ${Math.round(plan.deload.fraction * 100)}% weights` : '',
    targets: saved?.targets ?? [], notes: saved?.notes ?? [], saveDay, editable: true,
    empty: sel !== 'this' && !saved ? `Ask ${activeCoach().name} to plan next week, or edit a day below.` : '',
  } }
}

// ---- Recovery ------------------------------------------------------------------------------------
function recovery() {
  const D = this.props.D, w = D.whoop, m = this.state.rMet
  const empty = { rMetric: [], rHead: 'Recovery', rNote: 'No WHOOP data yet', rDays: [], rTip: null, rLeave: null, rBase: '0%', recMini: [], sleep: [], sleepMini: [], recMix: [], hrvMonths: [], zoneRows: [], zoneLegend: [], recNotes: [noteRow(T3, 'Connect WHOOP or upload a WHOOP export on Settings.')] }
  if (!w) return empty
  const recC = x => x >= 67 ? G : x >= 34 ? W : R, M30 = w.avg30, L = w.latest
  const MET = {
    rec: ['Recovery', `30-day average ${Math.round(M30.rec)}% · dashed line = 67% green threshold`, d => d.rec, 0, 100, x => x + '%', 67],
    hrv: ['HRV', `30-day average ${Math.round(M30.hrv)} ms · range ${M30.hrvMin}–${M30.hrvMax}`, d => d.hrv, Math.max(0, M30.hrvMin - 10), M30.hrvMax + 5, x => x + ' ms', M30.hrv],
    rhr: ['Resting HR', `30-day average ${Math.round(M30.rhr)} bpm · lower is better`, d => d.rhr, Math.round(M30.rhr) - 12, Math.round(M30.rhr) + 10, x => x + ' bpm', M30.rhr],
    sl: ['Sleep', `30-day average ${hm(M30.sl)} asleep`, d => d.sl, 240, 600, x => hm(x), M30.sl],
    st: ['Strain', `30-day average ${n1(M30.st)}` + (L.strainYesterday ? ` · ${fmtDay(L.strainYesterday.day)} ${n1(L.strainYesterday.v)}` : ''), d => d.st, 0, 21, x => n1(x), M30.st],
  }
  const Mx = MET[m] ?? MET.rec, n = w.days30.length
  // Hover (mouse) or tap (touch) a bar to read that day's value above it.
  const sel = this.state.rSel?.m === (m ?? 'rec') ? this.state.rSel.i : null
  const pick = (i) => this.setState({ rSel: i == null ? null : { m: m ?? 'rec', i } })
  const rDays = w.days30.map((d, i) => { const x = Mx[2](d), last = i === n - 1
    const hp = x == null ? 2 : Math.max(3, Math.round((x - Mx[3]) / (Mx[4] - Mx[3]) * 100))
    return { t: d.l + ' · ' + (x == null ? '—' : Mx[5](x)), h: hp + '%', hp, date: d.l, val: x == null ? 'No data' : Mx[5](x),
      c: x == null ? 'oklch(1 0 0 / 0.06)' : m === 'rec' || !m ? recC(x) : last ? A : AD, glow: last && x != null ? (m === 'rec' || !m ? '0 0 10px ' + recC(x) : AGLOW) : 'none',
      op: sel == null || sel === i ? 1 : 0.45,
      down: (e) => { this._rPt = e.pointerType },
      enter: (e) => { if (e.pointerType === 'mouse') pick(i) },
      tap: () => { if (this._rPt !== 'mouse') pick(sel === i ? null : i) } } })
  const sd = sel == null ? null : rDays[sel]
  const rTip = sd ? { date: sd.date, val: sd.val, c: sd.c === 'oklch(1 0 0 / 0.06)' ? T3 : (m === 'rec' || !m ? sd.c : A),
    l: ((sel + 0.5) / n * 100).toFixed(2) + '%', b: `calc(${Math.min(sd.hp, 88)}% + 8px)`, tf: sel < 3 ? 'translateX(-15%)' : sel > n - 4 ? 'translateX(-85%)' : 'translateX(-50%)' } : null
  const tl = (k, v, u, note, nc, c) => ({ k, v, u, note, nc: nc || T3, c: c || T1 })
  const hp = pctOf(L.hrv, M30.hrv), rd = L.resp - M30.resp
  const stage = (k, v, avg, c) => ({ k, v: hm(v), f: v ?? 0, c, avg: avg ? '30-day avg ' + hm(avg) : '' })
  const notes = []
  notes.push(noteRow(recC(L.rec), `Recovery is ${L.rec}% with HRV at ${L.hrv} ms (${sign(hp)}% vs average) and resting HR ${L.rhr} bpm.`))
  if (rd >= 0.6) notes.push(noteRow(W, `Respiratory rate is ${L.resp}, ${sign(rd, 1)} vs your 30-day average. Watch for illness.`))
  const run = w.zoneRows.find(z => /run/i.test(z.k))
  if (run) { const tot = run.zoneMin.reduce((a, b) => a + b, 0) || 1; notes.push(noteRow(T2, `Runs in the last 30 days averaged ${run.hr} bpm, with ${Math.round((run.zoneMin[3] + run.zoneMin[4]) / tot * 100)}% of time in WHOOP zones 4–5.`)) }
  if (w.hrvMonths.length >= 6) { const a = w.hrvMonths.slice(0, 3), b = w.hrvMonths.slice(-3), av = xs => Math.round(xs.reduce((s, x) => s + x.v, 0) / xs.length)
    notes.push(noteRow(av(b) >= av(a) ? A : W, `HRV averaged ${av(b)} ms over the last three months, vs ${av(a)} ms in ${a[0].l}–${a[2].l}.`)) }
  if (L.consistency != null && L.consistency < M30.consistency) notes.push(noteRow(W, `Sleep consistency is ${L.consistency}%, under your ${M30.consistency}% average.`))
  return {
    rMetric: this.seg(Object.keys(MET).map(k => [k, MET[k][0]]), m, id => this.setState({ rMet: id, rSel: null })),
    rHead: Mx[0], rNote: Mx[1], rDays, rTip, rLeave: (e) => { if (e.pointerType === 'mouse') pick(null) }, rBase: Math.round((Mx[6] - Mx[3]) / (Mx[4] - Mx[3]) * 100) + '%',
    recMini: [tl('HRV', L.hrv, 'ms', sign(Math.round(L.hrv - M30.hrv)) + ' vs 30-day avg', hp <= -8 ? R : T3), tl('Resting HR', L.rhr, 'bpm', sign(Math.round(L.rhr - M30.rhr)) + ' vs 30-day avg'),
      tl('Respiratory', L.resp ?? '—', 'rpm', L.resp >= L.respMax30 ? 'Highest in 30 days' : '30-day avg ' + M30.resp, L.resp >= L.respMax30 ? W : T3),
      tl('Blood oxygen', L.spo2 ?? '—', '%', '30-day avg ' + M30.spo2), tl('Skin temp', L.skinTemp ?? '—', '°C', '30-day avg ' + M30.skinTemp),
      tl('Strain · today', f1(L.strainToday), '', (L.strainYesterday ? fmtDay(L.strainYesterday.day) + ' ' + n1(L.strainYesterday.v) + ' · ' : '') + '30-day avg ' + n1(M30.st))],
    sleep: [stage('Deep', L.deep, M30.deep, A), stage('REM', L.rem, M30.rem, 'oklch(0.82 0.13 210 / 0.6)'), stage('Light', L.light, M30.light, 'oklch(0.82 0.13 210 / 0.28)'), stage('Awake', L.awake, null, 'oklch(1 0 0 / 0.12)')],
    sleepMini: [tl('Efficiency', L.efficiency ?? '—', '%', '30-day avg ' + M30.efficiency + '%'), tl('Consistency', L.consistency ?? '—', '%', '30-day avg ' + M30.consistency + '%', L.consistency < M30.consistency ? W : T3),
      tl('Sleep debt', L.debtMin ?? '—', 'min', L.debtMin ? 'To pay back' : 'Fully paid off'), tl('30-day avg', hm(M30.sl), '', M30.performance + '% performance')],
    recMix: w.recMix.map(([k, x]) => ({ k, g: x.g, y: x.y, r: x.r, gt: x.g + ' green', yt: x.y + ' yellow', rt: x.r + ' red', avg: x.avg + '% avg' })),
    hrvMonths: (() => { const lo = Math.min(...w.hrvMonths.map(x => x.v)) - 5, hi = Math.max(...w.hrvMonths.map(x => x.v)); return w.hrvMonths.map((x, i) => ({ l: x.l, v: x.v, h: Math.round((x.v - lo) / Math.max(1, hi - lo) * 84) + '%', c: i === w.hrvMonths.length - 1 ? A : AD, glow: i === w.hrvMonths.length - 1 ? AGLOW : 'none' })) })(),
    zoneRows: w.zoneRows.map(x => { const tot = x.zoneMin.reduce((a, b) => a + b, 0) || 1; return { k: x.k, n: x.n, t: Math.floor(x.min / 60) + 'h ' + (x.min % 60) + 'm', s: n1(x.strain), hr: x.hr, hc: T1, z: x.zoneMin.map((mm, i) => ({ f: mm, c: ZC[i], t: 'Zone ' + (i + 1) + ' · ' + mm + ' min (' + Math.round(mm / tot * 100) + '%)' })) } }),
    zoneLegend: ['Z1 50–60%', 'Z2 60–70%', 'Z3 70–80%', 'Z4 80–90%', 'Z5 90%+'].map((t, i) => ({ t, c: ZC[i] })),
    recNotes: notes,
  }
}

// ---- Fuel ----------------------------------------------------------------------------------------
function fuel() {
  const f = this.props.D.fuel, m = this.state.fMet
  if (!f) return { fT: { ax: ['', '', ''], macH: 'No MacroFactor data yet', macSub: '' }, fuelKpis: [], fMetric: [], fMetricHead: 'Nutrition', fMetricNote: 'No MacroFactor data yet', fDays: [], macros: [], fMicro: [], fLogged: [], fFoods: [], fuelNotes: [noteRow(T3, 'Upload a MacroFactor export on Settings.')] }
  const range = (k, pad) => { const v = f.days30.map(d => d[k]).filter(x => x != null); return v.length ? [Math.min(...v) - pad, Math.max(...v) + pad] : [0, 1] }
  const [w0, w1] = range('w', 1), [b0, b1] = range('bf', 1)
  const MET = {
    w: ['Weight', f.trend ? `Trend ${f.trend.ago30 ?? '—'} → ${f.trend.now.toFixed(1)} lb over 30 days · ${f.weighIns30} weigh-ins` : 'Daily weigh-ins', d => d.w, w0, w1, x => x + ' lb'],
    bf: ['Scale body fat', 'Smart-scale estimate · use for trend, DEXA for the real number', d => d.bf, b0, b1, x => x + '%'],
    steps: ['Steps', f.steps30 ? `Average ${f.steps30.toLocaleString()} a day` + (f.peakSteps ? ` · peak ${f.peakSteps.n.toLocaleString()} on ${fmtDay(f.peakSteps.day)}` : '') : 'No step data', d => d.steps, 0, Math.max(10000, ...f.days30.map(d => d.steps ?? 0)), x => Math.round(x).toLocaleString() + ' steps'],
    cal: ['Calories', `Food logged on ${f.logged30.length} of 30 days`, d => d.cal || 0, 0, Math.max(2200, ...f.days30.map(d => d.cal ?? 0)), x => Math.round(x) + ' kcal'],
  }
  const Mx = MET[m] ?? MET.w, vals = f.days30.map(Mx[2])
  let lastIdx = -1; for (let i = vals.length - 1; i >= 0; i--) if (vals[i]) { lastIdx = i; break }
  const fDays = f.days30.map((d, i) => { const x = vals[i], h = x ? Math.max(4, Math.round((x - Mx[3]) / (Mx[4] - Mx[3]) * 100)) : 2
    return { t: d.l + (x ? ' · ' + Mx[5](x) : ' · no data'), h: h + '%', c: !x ? 'oklch(1 0 0 / 0.06)' : i === lastIdx ? A : AD, glow: i === lastIdx ? AGLOW : 'none' } })
  const t = f.target, rec = f.recent, avg = k => rec.length ? Math.round(rec.reduce((a, d) => a + (d[k] ?? 0), 0) / rec.length) : null
  const mac = (name, k, goal, unit) => { const a = avg(k); return { name, done: a == null ? '—' : a.toLocaleString(), goal: goal == null ? '—' : goal.toLocaleString() + ' ' + unit, pct: a != null && goal ? Math.min(100, Math.round(a / goal * 100)) + '%' : '0%' } }
  const loggedLabel = f.logged30.length ? f.logged30.slice(-3).map(d => fmtDay(d, { day: 'numeric' })).join(', ') : 'None'
  const notes = []
  if (f.logged30.length < 15) notes.push(noteRow(W, `Food logged on ${f.logged30.length} of the last 30 days. MacroFactor's expenditure estimate needs intake to learn from.`))
  if (f.bestStreak) notes.push(noteRow(G, `Best logging stretch: ${f.bestStreak.len} straight days (${fmtDay(f.bestStreak.start)} – ${fmtDay(f.bestStreak.end)}), ${f.bestStreak.kcal.toLocaleString()} kcal and ${f.bestStreak.protein} g protein on average.`))
  if (f.trend?.ago30 != null) notes.push(noteRow(A, `Trend weight moved ${sign(f.trend.now - f.trend.ago30, 1)} lb over 30 days, to ${f.trend.now.toFixed(1)} lb.`))
  return {
    fuelKpis: [
      tile('Trend weight', f.trend ? f.trend.now.toFixed(1) : '—', 'lb', f.trend?.ago30 != null ? sign(f.trend.now - f.trend.ago30, 1) + ' lb in 30 days' : ''),
      tile('Latest weigh-in', f.lastWeighIn ? f.lastWeighIn.lb.toFixed(1) : '—', 'lb', f.lastWeighIn ? fmtDay(f.lastWeighIn.day) + ' · ' + f.weighIns30 + ' of 30 days weighed' : ''),
      tile('Days logged', f.logged30.length, 'of 30', loggedLabel, f.logged30.length < 15 ? W : T3, f.logged30.length < 15 ? W : T1),
      tile('Steps', f.steps30 ? f.steps30.toLocaleString() : '—', '/day', 'Last 30 days'),
      tile('Target', t ? t.kcal.toLocaleString() : '—', 'kcal', t ? `${t.proteinG} g protein · since ${fmtDay(f.targetSince)}` : 'No target set'),
      tile('Best logging run', f.bestStreak ? f.bestStreak.len : '—', 'days', f.bestStreak ? `${fmtDay(f.bestStreak.start)} – ${fmtDay(f.bestStreak.end)}` : '', G),
    ],
    fMetric: this.seg(Object.keys(MET).map(k => [k, MET[k][0]]), m in MET ? m : 'w', id => this.setState({ fMet: id })),
    fMetricHead: Mx[0], fMetricNote: Mx[1], fDays,
    macros: [mac('Calories', 'kcal', t?.kcal, 'kcal'), mac('Protein', 'protein', t?.proteinG, 'g'), mac('Carbs', 'carbs', t?.carbsG, 'g'), mac('Fat', 'fat', t?.fatG, 'g')],
    fMicro: [
      { k: 'Fiber · logged days', v: n1(avg('fiber')), u: 'g/day', c: T1 }, { k: 'Cholesterol · logged days', v: num(avg('chol')), u: 'mg/day', c: T1 },
      { k: 'Logged days · ' + this.props.D.today.slice(0, 4), v: f.loggedYear, u: 'days', c: T1 }, { k: 'Weigh-ins · 30 days', v: f.weighIns30, u: 'days', c: f.weighIns30 >= 20 ? G : T1 },
    ],
    fLogged: rec.map(x => ({ d: x.d, cal: x.kcal.toLocaleString(), tc: t ? t.kcal.toLocaleString() : '—', p: x.protein + ' g', pc: t && x.protein >= t.proteinG ? G : T1, c: x.carbs + ' g', f: x.fat + ' g', win: t && x.kcal < t.kcal * 0.5 ? 'Partial' : 'Full' })),
    fFoods: (this.props.D.foods?.frequent ?? []).map(x => ({ n: x.name, s: `${x.n}× · ${x.kcal} kcal` })), fuelNotes: notes,
    fT: { ax: [0, 14, 29].map(i => f.days30[i]?.l ?? ''), macH: rec.length ? `Average of the last ${rec.length} logged day${rec.length === 1 ? '' : 's'}` : 'No logged days yet',
      macSub: rec.length ? `${fmtDay(rec.at(-1).day)} – ${fmtDay(rec[0].day)} · vs current target` : '' },
  }
}

// ---- Fuel: nutrition protocol + diet rules (from plan/protocol and plan/diet) -------------------
const plusDays = (day, n) => new Date(Date.parse(day + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10)
const per = (d) => (d === 1 ? 'a day' : d === 7 ? 'a week' : d === 14 ? 'every 2 weeks' : d === 30 ? 'a month' : 'every ' + d + ' days')
const fmtN = (x, unit) => (x == null ? '—' : (Math.abs(x) >= 100 ? Math.round(x).toLocaleString() : (Math.round(x * 10) / 10).toString()) + (unit ? ' ' + unit : ''))
const checkRow = (done, toggle) => ({ mark: done ? '✓' : '', bc: done ? A : 'oklch(1 0 0 / 0.25)', bg: done ? A : 'transparent', fg: done ? T3 : T1, td: done ? 'line-through' : 'none', toggle })

/** Saved checklist for a period: { key, done: { [i]: true } }; a new day/week starts empty. */
function checks(stateKey, storeKey, period) {
  const s = this.state[stateKey], done = s && s.key === period ? s.done || {} : {}
  const toggle = (i) => () => { const next = { key: period, done: { ...done, [i]: !done[i] } }
    try { localStorage.setItem(storeKey, JSON.stringify(next)) } catch (e) {}
    SFX.play('toggle'); this.setState({ [stateKey]: next }) }
  return { done, toggle }
}

function protoData() {
  const D = this.props.D, P = D.protocol
  const empty = { protoOn: false, protoWeeks: [], apob: [], decide: [], protoTargets: [], protoPlan: [], protoRules: [], protoWeekly: [], protoDay: '', protoDayC: T3, wkChkS: '', wkChkC: T3, pT: {} }
  if (!P) return empty
  const status = P.status, live = status === 'active'
  const protoWeeks = Array.from({ length: P.weeks }, (_, i) => { const w = i + 1, cur = live && w === P.week, past = status === 'done' || (live && w < P.week)
    return { l: 'W' + w, c: cur ? A : past ? AD : 'oklch(1 0 0 / 0.08)', g: cur ? AGLOW : 'none', fc: cur ? A : T3 } })

  // ApoB bars: every lab draw, then the goal tier at the retest (dashed).
  const top = Math.max(...P.apob.map(a => a.v), P.goal?.n ?? 0, 1)
  const apob = P.apob.map((a, i) => ({ v: a.v, l: fmtDay(a.day, { month: 'short', year: '2-digit' }).replace(' ', " '") + (a.phase ? '\n' + a.phase : ''), h: Math.round(a.v / top * 72) + '%',
    c: i === P.apob.length - 1 ? A : AD, g: i === P.apob.length - 1 ? AGLOW : 'none', bd: '1px solid transparent', vc: i === P.apob.length - 1 ? A : T1 }))
  if (P.goal?.n) apob.push({ v: P.goal.label, l: 'Goal\n' + (P.retestL ? 'retest ' + P.retestL : 'at retest'), h: Math.round(P.goal.n / top * 72) + '%', c: 'oklch(0.78 0.15 160 / 0.12)', g: 'none', bd: '1.5px dashed ' + G, vc: G })
  const tierC = [G, W, R]
  const decide = P.decide.map((d, i) => ({ k: d.k, v: d.meaning + '. ' + (/^.*?[.!?](?=\s|$)/.exec(d.action)?.[0] ?? d.action), c: tierC[Math.min(i, 2)] }))

  const protoTargets = P.targets.map(t => ({ k: t.name, note: t.change && !/^none$/i.test(t.change) ? t.change : 'No change', v: t.value,
    before: t.before == null ? '—' : fmtN(t.before, t.unit), bc: t.beforeOk == null ? T3 : t.beforeOk ? G : W, kc: t.isNew ? A : T1, fw: t.isNew ? '500' : '400', nc: t.isNew ? T2 : T3 }))

  // Today: the sample day, then the supplement stack. Ticks are saved for today only.
  const day = checks.call(this, 'pchk', 'im4-pchk', D.today)
  const items = [
    ...P.sample.map(s => ({ t: s.t, k: s.meal, d: s.kcal == null ? '' : [s.kcal.toLocaleString() + ' kcal', s.protein != null ? s.protein + ' g protein' : null, s.satFat != null ? s.satFat + ' g sat fat' : null].filter(Boolean).join(' · ') })),
    ...P.supplements.map(s => ({ t: 'Supp.', k: s.name + ' · ' + s.dose, d: s.timing })),
  ]
  const protoPlan = items.map((x, i) => ({ ...x, ...checkRow(!!day.done[i], day.toggle(i)) }))
  const dayDone = items.filter((_, i) => day.done[i]).length

  // Weekly checks, saved per protocol week, each with what the data says.
  const wk = checks.call(this, 'wchk', 'im4-wchk', P.start + '#' + P.week)
  const protoWeekly = P.weekly.map((x, i) => ({ k: x.t, t: '', d: (x.ok === true ? 'On track · ' : x.ok === false ? 'Check · ' : '') + x.d, dc: x.ok === true ? G : x.ok === false ? W : T3, ...checkRow(!!wk.done[i], wk.toggle(i)) }))
  const wkDone = P.weekly.filter((_, i) => wk.done[i]).length

  const kick = live ? `Active protocol · week ${P.week} of ${P.weeks}` : status === 'upcoming' ? `Protocol starts ${P.startL}` : `Protocol finished · retest ${P.retestL ?? ''}`.trim()
  const log = P.todayLog ? `Today so far: ${fmtN(P.todayLog.kcal, 'kcal')}` + (P.todayLog.satFat != null ? ` · ${fmtN(P.todayLog.satFat, 'g')} sat fat` : '')
    : 'Set in MacroFactor · today not logged yet' + (P.lastLogged ? ` · last log ${fmtDay(P.lastLogged)}` : '')
  const comp = P.compliance.days ? ` Since ${P.startL}: ${P.compliance.satFat} g sat fat a day over ${P.compliance.days} logged day${P.compliance.days === 1 ? '' : 's'}.` : ''
  const voidS = P.voidRule ? (P.voidRule.split(/(?<=[.!?])\s+/).find(s => /does not count|doesn't count/i.test(s)) ?? '') : ''
  return {
    protoOn: true, protoWeeks, apob, decide, protoTargets, protoPlan, protoWeekly, protoRules: P.rules.map(r => ({ k: r.k, inn: r.inn, out: r.out, lim: r.lim })),
    protoDay: `${dayDone} of ${items.length} done`, protoDayC: dayDone === items.length && items.length ? G : T3,
    wkChkS: `${wkDone} of ${P.weekly.length} · week ${Math.max(1, P.week)}`, wkChkC: wkDone === P.weekly.length && P.weekly.length ? G : T3,
    pT: {
      kicker: kick, title: P.title.replace(/^\d+-week\s+/i, ''), goal: P.summary,
      days: P.daysToRetest ?? '—', daysL: status === 'done' ? 'retest due' : 'days to retest', retest: P.retestL ?? '—', year: P.retestYear ?? '',
      apobH: 'ApoB · ' + (P.apob[0]?.unit ?? 'mg/dL') + (P.apob.at(-1)?.range ? ' · lab range ' + P.apob.at(-1).range : ''),
      decideH: 'Decision at retest' + (P.voidRule || P.decide.length ? ' · agree with your doctor first' : ''),
      targetsSub: log,
      targetsNote: (P.beforeDays ? `Right column: your average over the last ${P.beforeDays} full logged days before the protocol (${fmtDay(P.beforeFrom)} – ${fmtDay(P.beforeTo)}).` : 'Right column: no logged days before the protocol.')
        + (P.targetNotes.at(-1) ? ' ' + (/^.*?[.!?](?=\s|$)/.exec(P.targetNotes.at(-1))?.[0] ?? '') : ''),
      labelRule: P.labelRule ?? '',
      ruleHead: P.ruleHead ?? { k: 'Category', inn: 'In', out: 'Out', lim: 'Limit' },
      ifThen: P.ifThen.map(x => x.when + ': ' + x.then).join(' ') + (voidS ? ' ' + voidS : '') + comp,
    },
  }
}

const t12 = (t) => { const m = /^(\d{2}):(\d{2})$/.exec(t || ''); if (!m) return t || ''; const h = +m[1]; return (h % 12 || 12) + ':' + m[2] + (h < 12 ? ' AM' : ' PM') }
const g1 = (x) => (x == null ? '—' : (Math.round(x * 10) / 10) + ' g')

// ---- Recovery work (sauna, red light, massage, …) from WHOOP activities; weekly targets saved in im4-rwgoal -----
const readRwGoals = () => { try { const v = JSON.parse(localStorage.getItem('im4-rwgoal') || '{}'); return v && typeof v === 'object' ? v : {} } catch (e) { return {} } }
const RW_VERB = { 'Sauna': 'a sauna', 'Red Light Therapy': 'red light', 'Massage Therapy': 'a massage', 'Warm Bath': 'a warm bath', 'Meditation': 'meditation' }

function rwData() {
  const rw = this.props.D.recoveryWork
  if (!rw) return { rw: null }
  const goals = this.state.rwGoals ?? readRwGoals()
  const setGoal = (name, n) => { const next = Object.assign({}, goals); if (n) next[name] = n; else delete next[name]; this.saveLS('im4-rwgoal', next); this.setState({ rwGoals: next }) }
  const active = rw.types.filter(t => t.n90 > 0)
  const sel = active.find(t => t.name === this.state.rwSel) ?? active[0] ?? rw.types[0]
  const goal = goals[sel.name] ?? null
  const counts = rw.weeks.map(w => w.counts[sel.name] ?? 0), top = Math.max(goal ?? 0, ...counts, 1)
  const eff = rw.effects.find(e => e.name === sel.name)
  const what = RW_VERB[sel.name] ?? sel.name.toLowerCase()
  const effect = !eff ? null : eff.ready
    ? { c: Math.abs(eff.rec) < 3 ? T2 : eff.rec > 0 ? G : W, t: `Next-day recovery after ${what}: ${eff.recWith}% vs ${eff.recWithout}% on days with similar strain and no ${sel.name.toLowerCase()}` + (eff.hrv != null ? `, HRV ${sign(eff.hrv)} ms` : '') + '. ' + (Math.abs(eff.rec) < 3 ? 'No clear difference so far.' : eff.rec > 0 ? 'Recovery tends to be higher after it.' : 'Recovery tends to be lower after it.'), sub: `${eff.n} session days since ${fmtDay(eff.since, { month: 'short', year: 'numeric' })}, compared within the same strain range.` }
    : { c: T3, t: `Not enough data yet to see whether ${what} changes next-day recovery.`, sub: `Needs ${eff.need} session days with similar-strain days to compare against; ${eff.have} so far.` }
  return { rw: {
    tabs: active.length > 1 ? active.map(t => ({ t: t.name, on: t.name === sel.name, pick: () => this.setState({ rwSel: t.name }) })) : [],
    sel: sel.name, goal, chartNote: goal ? `Sessions per week · dashed line = your target of ${goal}` : 'Sessions per week',
    bars: rw.weeks.map((w, i) => { const v = counts[i], last = i === rw.weeks.length - 1
      return { v, l: i % 3 === 0 || last ? w.l : '', t: `Week of ${w.l} · ${v} session${v === 1 ? '' : 's'}`, h: v ? Math.max(6, Math.round(v / top * 100)) + '%' : '3px', c: v === 0 ? 'oklch(1 0 0 / 0.06)' : goal && v >= goal ? G : last ? A : AD, glow: last && v ? AGLOW : 'none' } }),
    goalLine: goal ? Math.round(goal / top * 100) + '%' : null,
    rows: active.map(t => { const g = goals[t.name] ?? null
      return { name: t.name, week: g ? `${t.thisWeek} of ${g}` : String(t.thisWeek), weekC: g ? (t.thisWeek >= g ? G : T1) : T1, goal: g, setGoal: n => setGoal(t.name, n),
        d30: t.n30 ? `${t.n30} · ${t.min30} min` : '0', avg: t.avgMin + ' min', last: t.ago === 0 ? 'Today' : t.ago === 1 ? 'Yesterday' : t.lastL, hr: t.hr ? `${t.hr.avg} avg · ${t.hr.max} max` : null } }),
    hasHr: active.some(t => t.hr), effect,
    hrNote: rw.hrMissing ? 'WHOOP shows heart rate for these in its app, but its developer API sends them without heart rate, strain or zones, so this card uses session count and duration only.' : '',
    older: rw.types.filter(t => !t.n90).map(t => `${t.name} (last ${fmtDay(t.last)})`).join(', '),
  } }
}

// ---- Supplements: the athlete's usual stack (saved list, im4-supps), each checked against the MacroFactor log -------
const suppKey = (x) => String(x || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const readSupps = () => { try { const v = JSON.parse(localStorage.getItem('im4-supps') || '[]'); return Array.isArray(v) ? v : [] } catch (e) { return [] } }
/** When a supplement was last logged: { day, t } from the most recent logged day whose entry names match, else null. */
const isSupp = (name, entryName) => { const k = suppKey(name), n = suppKey(entryName); return !!k && !!n && (n.includes(k) || k.includes(n)) }
function suppLast(D, name) {
  if (!suppKey(name) || !D.foods) return null
  for (const d of D.foods.days) { const e = d.entries.find(x => isSupp(name, x.name)); if (e) return { day: d.day, t: e.t } }
  return null
}

function suppData() {
  const D = this.props.D, list = this.state.supps || [], edit = !!this.state.suppEdit, f = this.state.suppF || { name: '', dose: '' }
  const save = (next) => { this.saveLS('im4-supps', next); this.setState({ supps: next }) }
  const latest = D.foods?.days[0]?.day ?? null, exported = latest === D.today
  const rows = list.map((x, i) => {
    const last = suppLast(D, x.name), today = last && last.day === D.today
    return { name: x.name, dose: x.dose || '', s: today ? 'Taken · ' + t12(last.t) : last ? 'Last logged ' + fmtDay(last.day) : exported ? 'Not logged today' : 'Not in the log yet',
      c: today ? G : T3, edit, del: () => { SFX.play('toggle'); save(list.filter((_, j) => j !== i)) } }
  })
  const taken = rows.filter(r => r.c === G).length
  const add = () => { const name = f.name.trim(); if (!name) return; SFX.play('toggle'); save([...list, { name, dose: f.dose.trim() }]); this.setState({ suppF: { name: '', dose: '' } }) }
  return {
    supps: rows, suppEdit: edit,
    suppSum: !list.length ? '' : exported ? `${taken} of ${list.length} today` : latest ? `Log through ${fmtDay(latest)}` : 'No MacroFactor log yet', suppSumC: list.length && taken === list.length ? G : T3,
    suppNote: !list.length ? 'No supplements saved yet. Tap Edit to add the ones you take.' : 'Checked against your MacroFactor log by name. Protocol supplements stay in the protocol\'s daily checklist.',
    suppToggle: () => this.setState({ suppEdit: !edit }), suppName: f.name, suppDose: f.dose,
    suppOnName: (e) => this.setState({ suppF: { ...f, name: e.target.value } }), suppOnDose: (e) => this.setState({ suppF: { ...f, dose: e.target.value } }),
    suppAdd: add, suppKey: (e) => { if (e.key === 'Enter') add() },
  }
}

function foodData() {
  const D = this.props.D, F = D.foods
  if (!F) return { foodOn: false, foodTabs: [], foodRows: [], foodPager: null, foodHead: '', foodNote: '', satRows: [], satHead: '', satNote: '' }
  const satCap = D.protocol?.targets.find(t => /saturated/i.test(t.name))?.n ?? null
  const sel = F.days.find(d => d.day === this.state.foodDay) ?? F.days[0]
  // His usual supplements show on the Supplements card instead (the day's totals still include them).
  const supps = (this.state.supps || []).map(x => x.name), hidden = sel.entries.filter(e => supps.some(n => isSupp(n, e.name))).length
  const foodRows = sel.entries.filter(e => !supps.some(n => isSupp(n, e.name))).map(e => ({ t: t12(e.t), name: e.name, amt: e.qty != null ? `${+e.qty.toFixed(2)} ${e.unit ?? ''}`.trim() : '', kcal: e.kcal != null ? Math.round(e.kcal).toLocaleString() : '—',
    p: g1(e.proteinG), sat: e.satFatG == null ? ((e.fatG ?? 0) > 0.5 ? 'no data' : '—') : g1(e.satFatG),
    sc: e.satFatG == null ? T3 : satCap && e.satFatG >= satCap / 4 ? W : T2 }))
  // Nine foods per page so the card stays level with the sat-fat sources beside it.
  const PER = 9, pages = Math.max(1, Math.ceil(foodRows.length / PER)), pg = Math.min(this.state.foodPg || 0, pages - 1)
  const turn = d => () => { SFX.play('nav'); this.setState({ foodPg: pg + d }) }
  const foodPager = pages > 1 ? { label: `${pg * PER + 1}–${Math.min(foodRows.length, (pg + 1) * PER)} of ${foodRows.length}`,
    prev: pg > 0 ? turn(-1) : null, next: pg < pages - 1 ? turn(1) : null, prevO: pg > 0 ? 1 : 0.35, nextO: pg < pages - 1 ? 1 : 0.35 } : null
  const tt = sel.totals, over = satCap != null && tt.satFatG > satCap
  const mx = Math.max(...F.satSources.map(s => s.satFatG), 0.1)
  return {
    foodOn: true,
    foodTabs: this.seg(F.days.map(d => [d.day, d.day === D.today ? 'Today' : d.label]), sel.day, id => this.setState({ foodDay: id, foodPg: 0 })),
    foodRows: foodRows.slice(pg * PER, (pg + 1) * PER), foodPager,
    foodHead: `${num(tt.kcal)} kcal · ${tt.proteinG} g protein · ${tt.fiberG} g fiber`,
    foodSat: `${tt.satFatG} g sat fat` + (satCap != null ? ` of ${satCap} g` : ''), foodSatC: over ? W : satCap != null ? G : T2,
    foodNote: (hidden ? `${hidden} supplement${hidden === 1 ? '' : 's'} listed under Supplements (included in the totals). ` : '') + (tt.noSat ? `${tt.noSat} food${tt.noSat === 1 ? ' has' : 's have'} fat but no saturated-fat data in MacroFactor, so the sat-fat total is a minimum.` : ''),
    satHead: `${F.satTotal} g over ${F.weekDays} logged day${F.weekDays === 1 ? '' : 's'}` + (F.weekDays ? ` · ${(Math.round(F.satTotal / F.weekDays * 10) / 10)} g/day` : ''),
    satRows: F.satSources.map((s, i) => ({ name: s.name, v: s.satFatG + ' g', sub: `${s.n}× · ${s.share}% of the week`, pct: Math.round(s.satFatG / mx * 100) + '%', c: i === 0 ? W : AD })),
    satNote: F.noSat.n ? `Not counted: ${F.noSat.n} entr${F.noSat.n === 1 ? 'y' : 'ies'} with fat but no sat-fat data (` + F.noSat.foods.map(f => f.name).join(', ') + '). Fix them in MacroFactor to make the total exact.' : '',
  }
}

function dietData() {
  const D = this.props.D, R0 = D.diet, P = D.protocol, today = D.today
  if (!R0) return { dietOn: false, diet: [], dietSum: '', dietSumC: T3 }
  const mine = this.state.diet || {}, paused = P && P.status === 'active' ? P.outs : []
  const diet = R0.rules.map(r => {
    const hits = R0.fromLog?.[r.id] || [], base = new Set([...(R0.uses[r.id] || []), ...hits.map(x => x.day)])
    const added = (mine[r.id] || []).filter(d => d <= today), all = [...base, ...added.filter(d => !base.has(d))].sort()
    const lastLog = hits.find(x => x.day === all.at(-1))
    const from = plusDays(today, -(r.windowDays - 1)), used = all.filter(d => d >= from)
    const out = paused.find(o => r.name.toLowerCase().includes(o.item.toLowerCase()))
    const over = used.length > r.count, locked = used.length >= r.count
    const freeOn = locked ? plusDays(used[used.length - r.count], r.windowDays) : null
    const st = out ? 'Out until ' + (P.retestL ?? 'the retest') : over ? `Over · ${used.length} of ${r.count}` : locked ? 'Free ' + fmtDay(freeOn) : `${r.count - used.length} of ${r.count} left`
    const c = out ? W : over ? R : locked ? T3 : G
    const slots = Array.from({ length: Math.max(r.count, used.length) }, (_, i) => ({ c: i < used.length ? (i >= r.count ? R : out ? W : A) : 'oklch(1 0 0 / 0.08)', g: i < used.length && !out && i < r.count ? AGLOW : 'none' }))
    const log = () => { const next = { ...mine, [r.id]: [...(mine[r.id] || []), today] }; try { localStorage.setItem('im4-diet', JSON.stringify(next)) } catch (e) {} SFX.play('toggle'); this.setState({ diet: next }) }
    const undo = () => { if (!added.length) return; const list = [...(mine[r.id] || [])]; list.splice(list.lastIndexOf(added.at(-1)), 1)
      const next = { ...mine, [r.id]: list }; try { localStorage.setItem('im4-diet', JSON.stringify(next)) } catch (e) {} this.setState({ diet: next }) }
    return {
      name: r.name, st, c, rule: `${r.count}× ${per(r.windowDays)}` + (r.amount ? ' · ' + r.amount : '') + (r.note ? ' · ' + r.note : '') + (out ? ` · protocol Out list: ${out.item.toLowerCase()}` : ''),
      slots, last: all.length ? 'Last ' + fmtDay(all.at(-1)) + (lastLog ? ' · ' + lastLog.foods[0] : '') : 'Not logged yet',
      bc: over ? 'oklch(0.7 0.18 25 / 0.45)' : out ? 'oklch(0.82 0.14 80 / 0.3)' : LINE_C, bg: over ? 'oklch(0.7 0.18 25 / 0.06)' : 'oklch(1 0 0 / 0.02)',
      log, undo, uo: added.length ? 1 : 0.35, lbc: locked || out ? 'oklch(0.82 0.14 80 / 0.45)' : AD, lc: locked || out ? W : A,
      _s: out ? 'out' : over ? 'over' : locked ? 'locked' : 'free',
    }
  })
  // Available first, then used up (locked / over the limit), then blocked by the protocol's Out list.
  const rank = { free: 0, locked: 1, over: 1, out: 2 }
  diet.sort((a, b) => rank[a._s] - rank[b._s])
  const n = (s) => diet.filter(d => d._s === s).length
  const parts = [n('free') + ' available', n('locked') ? n('locked') + ' locked' : null, n('over') ? n('over') + ' over' : null, n('out') ? n('out') + ' out for the protocol' : null].filter(Boolean)
  return { dietOn: true, diet, dietSum: parts.join(' · '), dietSumC: n('over') ? R : T3, dietNote: n('out') ? ' Items on the protocol\'s Out list are paused until the retest.' : '' }
}

/** The per-sport table; on phones only date, name and three key columns (time only where there's no distance, or
 *  for strength no weight lifted). */
function sportTable(S, phone) {
  const KEEP = new Set(['Date', 'Swim', 'Ride', 'Session', 'Walk', 'Run', 'Yards', '/100yd', 'Miles', 'mph', 'Pace', 'Lifted', 'Avg HR', 'HR', 'Strain'])
  const hasDist = S.cols.some(c => /Miles|Yards|Lifted/.test(c[0]))
  const idx = S.cols.map((c, i) => (!phone || KEEP.has(c[0]) || (c[0] === 'Time' && !hasDist) ? i : -1)).filter(i => i >= 0)
  const widths = S.grid.split(' ')
  return { sportGrid: idx.map(i => widths[i]).join(' '), sportCols: idx.map(i => ({ t: S.cols[i][0], a: S.cols[i][1] || 'left' })), sportRows: S.rows.map((cs, k) => ({ cells: idx.map(i => cs[i]), go: S.go?.[k] ?? undefined, cur: S.go?.[k] ? 'pointer' : 'default', cls: S.go?.[k] ? 'sport-row sport-row-go' : 'sport-row' })) }
}

// ---- Training ------------------------------------------------------------------------------------
const SWIMC = 'oklch(0.76 0.13 250)' // swim blue (PersonalBests), marks swims that open the swim view
const RUNC = 'oklch(0.82 0.13 210)' // run cyan (PersonalBests), marks runs that open the run view
function training() {
  const t = this.props.D.training
  if (!t) return { weeks: [], tMetricNote: 'No Strava data yet', tMetric: [], heat: [], tod: [], gear: [], sportOpts: [], sportTiles: [], sportChartLabel: '', sportBars: [], sportGrid: '1fr', sportCols: [], sportRows: [] }
  const MET = { endH: ['Swim · bike · run', 'Hours of swim, bike and run per week.'], runMi: ['Run', 'Run miles per week.'], strH: ['Strength', 'Strength hours per week.'] }
  const m = MET[this.state.tMet] ? this.state.tMet : 'endH', vals = t.weeks.map(w => w[m]), mx = Math.max(...vals, 0.1)
  const weeks = t.weeks.map((w, i) => ({ v: n1(w[m]), l: w.l, h: Math.max(2, Math.round(w[m] / mx * 84)) + '%', c: i === t.weeks.length - 2 ? A : AD, glow: i === t.weeks.length - 2 ? AGLOW : 'none' }))
  const heat = t.heat.map(h => { const o = h.future ? 0 : h.min === 0 ? 0 : h.min < 45 ? 0.25 : h.min < 90 ? 0.55 : 1
    return { t: h.l + (h.future ? '' : ' · ' + h.min + ' min'), c: h.future ? 'transparent' : o ? 'oklch(0.82 0.13 210 / ' + o + ')' : 'oklch(1 0 0 / 0.05)', g: o === 1 ? '0 0 8px oklch(0.82 0.13 210 / 0.5)' : 'none', b: h.future ? '1px solid oklch(1 0 0 / 0.04)' : h.walkOnly ? '1px dashed oklch(1 0 0 / 0.2)' : '1px solid transparent' } })
  const tt = t.tod.reduce((a, b) => a + b, 0) || 1
  const tod = ['Morning · before 11', 'Midday · 11–3', 'Evening · 3–8', 'Night · after 8'].map((name, i) => ({ name, done: t.tod[i], goal: tt + ' sessions', pct: Math.round(t.tod[i] / tt * 100) + '%' }))
  const gear = t.gear.map(g => ({ name: g.name, mi: n1(g.mi), sub: (g.kind === 'bike' ? 'Bike' : 'Shoes') + ' · ' + g.n + ' activities' + (g.retired ? ' · retired' : ''), note: g.kind === 'shoe' ? (g.mi > 300 ? 'Near replacement' : Math.round(400 - g.mi) + ' mi to 400') : '', nc: g.kind === 'shoe' && g.mi > 300 ? W : T3 }))
  const sp = this.state.sport, tl = (k, v, u, note, c) => ({ k, v, u, note, nc: T3, c: c || T1, go: null, cur: 'default' })
  const cell = (x, a, c, b) => ({ t: x == null ? '—' : String(x), a: a || 'left', c: c || T1, b: b || null })
  // The sport's best activity gets a badge; when it's older than the list it's pinned on top (replacing the oldest row).
  const pin = (list, best, n) => { const L = list.slice(0, n); return !best || L.some(x => x.id === best.id) ? L : [best, ...L.slice(0, n - 1)] }
  const bestOf = (s, x) => (s.bestRow && x.id === s.bestRow.id ? s.bestWhy : null)
  const lastBars = (list, key, f) => { const L = list.slice(0, 12).reverse(), mxx = Math.max(...L.map(x => +x[key] || 0), 0.1)
    return L.map((x, i) => ({ v: f(x), l: x.d, h: Math.max(4, Math.round((+x[key] || 0) / mxx * 84)) + '%', c: i === L.length - 1 ? A : AD, glow: i === L.length - 1 ? AGLOW : 'none' })) }
  let S
  if (sp === 'swim') { const s = t.swim; S = { tiles: [tl('Swims', s.n, '', s.first ? 'Since ' + fmtDay(s.first) : t.year), tl('Distance', s.yd.toLocaleString(), 'yd', t.year), tl('Longest', t.longest.swim ? t.longest.swim.v.toLocaleString() : '—', 'yd', t.longest.swim ? fmtDay(t.longest.swim.day) : ''), tl('Best pace', s.best?.pace ?? '—', '/100yd', s.best ? s.best.d : ''), tl('Avg heart rate', s.hr ?? '—', 'bpm', s.mhr ? 'Max ' + s.mhr : ''), tl('Swims', s.list.length, '', 'Shown below')],
    label: 'Yards per swim', bars: lastBars(s.list, 'yd', x => x.yd.toLocaleString()), grid: '50px minmax(0,1.4fr) 50px 52px 62px 48px 48px', cols: [['Date'], ['Swim'], ['Yards', 'right'], ['Time', 'right'], ['/100yd', 'right'], ['Avg HR', 'right'], ['Max HR', 'right']],
    // Swims with FORM lengths open the swim view (src/app/SwimDetail.tsx); their names read as links.
    rows: pin(s.list, s.bestRow, 12).map(x => [cell(x.d, 0, T3), cell(x.detail ? x.name + ' ›' : x.name, 0, x.detail ? SWIMC : T1, bestOf(s, x)), cell(x.yd.toLocaleString(), 'right'), cell(x.min + ' min', 'right', T2), cell(x.pace, 'right'), cell(x.hr, 'right', T2), cell(x.mhr, 'right', T2)]),
    go: pin(s.list, s.bestRow, 12).map(x => (x.detail ? () => this.setState({ swimOpen: x.id }) : null)) } }
  else if (sp === 'bike') { const s = t.ride, lr = t.kpis.lastRide; S = { tiles: [tl('Rides', s.n, '', t.year + ' · over 1 mile'), tl('Distance', s.mi, 'mi', t.year), tl('Average speed', s.mph ?? '—', 'mph', ''), tl('Longest', t.longest.ride?.v ?? '—', 'mi', t.longest.ride ? fmtDay(t.longest.ride.day, { month: 'short', day: 'numeric', year: 'numeric' }) : ''), tl('Elevation', s.ft.toLocaleString(), 'ft', 'Total gain'), tl('Last ride', lr ? fmtDay(lr.day) : '—', '', lr ? lr.daysAgo + ' days ago' : '', lr && lr.daysAgo > 14 ? R : T1)],
    label: 'Miles per ride · last 12 rides', bars: lastBars(s.list, 'mi', x => x.mi), grid: '50px minmax(0,1.6fr) 50px 56px 44px 52px 52px', cols: [['Date'], ['Ride'], ['Miles', 'right'], ['Time', 'right'], ['mph', 'right'], ['Elev', 'right'], ['Avg HR', 'right']],
    rows: pin(s.list, s.bestRow, 10).map(x => [cell(x.d, 0, T3), cell(x.name, 0, T1, bestOf(s, x)), cell(x.mi, 'right'), cell(x.min + ' min', 'right', T2), cell(x.mph, 'right'), cell(x.ft, 'right', T2), cell(x.hr, 'right', T2)]) } }
  else if (sp === 'str') { const s = t.strength; S = { tiles: [tl('Sessions', s.n, '', t.year), tl('Time', s.h, 'h', t.year), tl('Last 30 days', s.n30, 'sessions', s.avgMin + ' min average'), tl('Avg heart rate', s.hr ?? '—', 'bpm', 'Last 30 days'), tl('WHOOP strain', s.strain ?? '—', '', 'Avg per session'), tl('Calories', s.cal ?? '—', 'kcal', 'Avg per session')],
    label: 'Strength sessions per week', bars: t.weeks.map((w, i) => ({ v: String(w.strN), l: w.l, h: Math.max(4, Math.round(w.strN / Math.max(1, ...t.weeks.map(x => x.strN)) * 84)) + '%', c: i === t.weeks.length - 2 ? A : AD, glow: 'none' })),
    grid: '50px minmax(0,1.6fr) 72px 56px 52px 52px 48px 48px', cols: [['Date'], ['Session'], ['Lifted', 'right'], ['Time', 'right'], ['Avg HR', 'right'], ['Max HR', 'right'], ['Strain', 'right'], ['kcal', 'right']],
    rows: pin(s.list, s.bestRow, 12).map(x => [cell(x.d, 0, T3), cell(x.name, 0, T1, bestOf(s, x)), cell(x.lb == null ? null : x.lb.toLocaleString() + ' lb', 'right'), cell(x.min + ' min', 'right', T2), cell(x.hr, 'right'), cell(x.mhr, 'right', T2), cell(x.strain == null ? null : n1(x.strain), 'right'), cell(x.cal == null ? null : Math.round(x.cal), 'right', T2)]) } }
  else if (sp === 'walk') { const s = t.walk; S = { tiles: [tl('Walks', s.n, '', t.year), tl('Distance', s.mi, 'mi', s.perDay30 + ' mi/day last 30'), tl('Time', s.h, 'h', t.year), tl('Elevation', s.ft.toLocaleString(), 'ft', 'Total gain'), tl('Avg heart rate', s.hr ?? '—', 'bpm', ''), tl('Calories', s.cal ? s.cal.toLocaleString() : '—', 'kcal', t.year)],
    label: 'Walking miles per week', bars: t.weeks.map((w, i) => ({ v: n1(w.walkMi), l: w.l, h: Math.max(4, Math.round(w.walkMi / Math.max(1, ...t.weeks.map(x => x.walkMi)) * 84)) + '%', c: i === t.weeks.length - 2 ? A : AD, glow: 'none' })),
    grid: '50px minmax(0,1.6fr) 48px 56px 50px 52px 52px', cols: [['Date'], ['Walk'], ['Miles', 'right'], ['Time', 'right'], ['Pace', 'right'], ['Elev', 'right'], ['Avg HR', 'right']],
    rows: s.list.map(x => [cell(x.d, 0, T3), cell(x.name), cell(x.mi, 'right'), cell(x.min + ' min', 'right', T2), cell(x.pace, 'right'), cell(x.ft, 'right', T2), cell(x.hr, 'right', T2)]) } }
  else { const s = t.run; S = { tiles: [tl('Runs', s.n, '', t.year + ' · over 1 mile'), tl('Distance', s.mi, 'mi', `${fmtDay(t.today ?? this.props.D.today, { month: 'short' })} ${t.kpis.runMonth.mi} · last month ${t.kpis.runMonth.prevMi}`), tl('Average pace', s.avgPace ?? '—', '/mi', 'Moving time'), tl('Fastest 3 mi+', s.fastest3?.pace ?? '—', '/mi', s.fastest3 ? s.fastest3.d + ' · ' + s.fastest3.mi + ' mi' : ''), tl('Longest', t.longest.run?.v ?? '—', 'mi', t.longest.run ? fmtDay(t.longest.run.day) : ''), tl('Elevation', s.ft.toLocaleString(), 'ft', 'Total gain')],
    label: 'Distance per run (mi) · last 12 runs', bars: lastBars(s.list, 'mi', x => x.mi), grid: '50px minmax(0,1.6fr) 44px 48px 54px 44px 44px 140px', cols: [['Date'], ['Run'], ['Miles', 'right'], ['Pace', 'right'], ['Time', 'right'], ['Elev', 'right'], ['HR', 'right'], ['Shoes', 'right']],
    // Every run opens the run view (src/app/RunDetail.tsx); its name reads as a link.
    go: pin(s.list, s.bestRow, 10).map(x => () => this.setState({ runOpen: x.id })),
    rows: pin(s.list, s.bestRow, 10).map(x => [cell(x.d, 0, T3), cell(x.name + ' ›', 0, RUNC, bestOf(s, x)), cell(x.mi, 'right'), cell(x.pace, 'right'), cell(x.min + ' min', 'right', T2), cell(x.ft, 'right', T2), cell(x.hr, 'right', T2), cell(x.gear, 'right', T2)]) } }
  return {
    weeks, tMetricNote: MET[m][1] + ' Highlighted bar is the last full week. Each sport from the app chosen in Settings → Activity sources (by default swims from FORM, else Strava; runs from Strava; lifts from FitnessAI; everything else from WHOOP); heart rate and strain from WHOOP. Each workout counts once.', tMetric: this.seg(Object.keys(MET).map(k => [k, MET[k][0]]), m, id => this.setState({ tMet: id })),
    heat, tod, gear, sportOpts: this.seg([['run', 'Run'], ['swim', 'Swim'], ['bike', 'Bike'], ['str', 'Strength'], ['walk', 'Walk']], sp, id => this.setState({ sport: id })),
    sportTiles: S.tiles, sportChartLabel: S.label, sportBars: S.bars, ...sportTable(S, (this.state.vw ?? 1280) < 600),
    swimOpen: this.state.swimOpen ?? null, swimClose: this._swimClose ??= () => this.setState({ swimOpen: null }),
    runOpen: this.state.runOpen ?? null, runClose: this._runClose ??= () => this.setState({ runOpen: null }),
  }
}

// ---- Body ----------------------------------------------------------------------------------------
// WHOOP day strain for the Body page: today so far, recent averages, and the last 30 days as bars.
// Levels are WHOOP's: light <10, moderate 10–13.9, high 14–17.9, all out 18–21.
// Effort, not a warning: shades of the accent (brighter = harder) instead of status colors.
const strainLevel = (x) => (x == null ? ['No data', T3, 0] : x >= 18 ? ['All out', A, 1] : x >= 14 ? ['High', A, 0.75] : x >= 10 ? ['Moderate', A, 0.5] : ['Light', T2, 0.28])
function strainData() {
  const w = this.props.D.whoop
  if (!w) return { strainOn: false, strain: null }
  const L = w.latest, [word, c] = strainLevel(L.strainToday), ds = w.days30.filter(d => d.st != null)
  const loadC = w.load7 > w.load30 * 1.3 ? R : w.load7 > w.load30 * 1.1 ? W : T3
  return { strainOn: true, strain: {
    v: f1(L.strainToday), word, c, fill: Math.round(Math.min(L.strainToday ?? 0, 21) / 21 * 100) + '%',
    sub: 'WHOOP · ' + fmtDay(L.day) + ' so far' + (L.day === this.props.D.today ? ', builds until you sleep' : ''),
    tiles: [
      { k: L.strainYesterday ? fmtDay(L.strainYesterday.day) : 'Yesterday', v: L.strainYesterday ? n1(L.strainYesterday.v) : '—', note: L.strainYesterday ? strainLevel(L.strainYesterday.v)[0] : '', nc: T3 },
      { k: '7-day avg', v: n1(w.load7), note: w.load30 ? sign(pctOf(w.load7, w.load30)) + '% vs 30 days' : '', nc: loadC },
      { k: '30-day avg', v: n1(w.load30), note: ds.length + ' days with data', nc: T3 },
    ],
    bars: ds.map((d, i) => { const last = i === ds.length - 1, op = strainLevel(d.st)[2]
      return { t: fmtDay(d.day) + ' · ' + n1(d.st) + ' ' + strainLevel(d.st)[0].toLowerCase() + (last && d.day === this.props.D.today ? ' (so far)' : ''), h: Math.max(3, Math.round(d.st / 21 * 100)) + '%',
        c: last ? A : 'oklch(0.82 0.13 210 / ' + op + ')', g: last ? AGLOW : 'none', o: last ? '1px solid oklch(0.96 0.005 250 / 0.6)' : 'none' } }),
    ax: ds.length ? [fmtDay(ds[0].day), fmtDay(ds.at(-1).day)] : ['', ''],
  } }
}

function liftData() {
  const b = this.props.D.body
  return { lifts: (b?.lifts ?? []).map(x => { const vals = x.mo.filter(n => n != null), mx = Math.max(...vals, 1), first = vals[0], now = vals.at(-1)
    const d = now != null && first != null ? now - first : null, pct = d != null && first ? Math.round(d / first * 100) : null
    return { k: x.label, e1: now == null ? '—' : String(now), delta: d == null ? '' : sign(d) + ' lb · ' + sign(pct) + '%', dc: d > 0 ? G : T3, sub: x.best ? 'Best set ' + x.best : 'Last ' + x.last,
      bars: x.mo.map((n, i) => ({ t: x.months[i] + (n ? ' · ' + n + ' lb' : ' · no sets'), h: n ? Math.round(n / mx * 100) + '%' : '3px', c: n == null ? 'oklch(1 0 0 / 0.06)' : i === x.mo.length - 1 ? A : AD, g: i === x.mo.length - 1 ? AGLOW : 'none' })) } }) }
}

function injData() {
  const TODAY = this.props.D.today, F = this.state.injF, list = this.state.inj || []
  const setF = (k, val) => this.setState(s => ({ injF: Object.assign({}, s.injF, { [k]: val }) }))
  const save = n => { this.saveLS('im4-inj', n); this.setState({ inj: n }) }
  const pills = (opts, key) => opts.map(o => { const on = F[key] === o, col = key === 'sev' ? (o === 'Severe' ? R : o === 'Moderate' ? W : G) : A
    return { label: o, pick: () => setF(key, o), bc: on ? col.replace(')', ' / 0.5)') : LINE_C, bg: on ? col.replace(')', ' / 0.14)') : 'transparent', fg: on ? col : T2 } })
  const days = s => Math.max(0, daysBetween(TODAY, s))
  const active = list.filter(x => x.status !== 'Resolved')
  const sorted = list.slice().sort((a, b) => (a.status === 'Resolved') - (b.status === 'Resolved') || b.date.localeCompare(a.date))
  return {
    injAreas: ['Knee', 'Ankle / foot', 'Calf / Achilles', 'Shin', 'Hamstring', 'Quad', 'Hip / glute', 'Hip flexor / groin', 'Lower back', 'Upper back', 'Shoulder', 'Chest', 'Abs', 'Neck', 'Biceps', 'Triceps', 'Elbow / forearm', 'Wrist / hand', 'Illness', 'Other'],
    injF: { ...F, date: F.date || TODAY }, injSides: pills(['Left', 'Right', 'Both', 'n/a'], 'side'), injSevs: pills(['Mild', 'Moderate', 'Severe'], 'sev'),
    injSetArea: e => setF('area', e.target.value), injSetDate: e => setF('date', e.target.value), injSetNote: e => setF('note', e.target.value),
    injOpen: !!this.state.injOpen, injToggle: () => this.setState(s => ({ injOpen: !s.injOpen })),
    injAdd: () => { save(list.concat([{ id: Date.now(), area: F.area, side: F.side, sev: F.sev, date: F.date || TODAY, note: F.note, status: 'Active' }])); setF('note', ''); this.setState({ injOpen: false }) },
    injEmpty: list.length === 0, injSum: active.length ? active.length + ' active · ' + (list.length - active.length) + ' resolved' : list.length ? 'All resolved' : 'Nothing logged',
    injSumC: active.some(x => x.sev !== 'Mild') ? R : active.length ? W : G,
    injList: sorted.map(x => { const c = x.status === 'Resolved' ? T3 : x.sev === 'Severe' ? R : x.sev === 'Moderate' ? W : G
      const set = st => () => save(list.map(y => y.id === x.id ? Object.assign({}, y, { status: st, resolved: st === 'Resolved' ? TODAY : null }) : y))
      return { c, title: x.area + (x.side && x.side !== 'n/a' ? ' · ' + x.side.toLowerCase() : '') + ' · ' + x.sev.toLowerCase(), note: x.note || 'No notes', st: x.status,
        when: x.status === 'Resolved' ? fmtDay(x.date) + ' → ' + fmtDay(x.resolved || TODAY) : 'Since ' + fmtDay(x.date) + ' · day ' + (days(x.date) + 1),
        acts: (x.status === 'Resolved' ? [{ t: 'Reopen', go: set('Active') }] : [{ t: x.status === 'Active' ? 'Recovering' : 'Active', go: set(x.status === 'Active' ? 'Recovering' : 'Active') }, { t: 'Resolved', go: set('Resolved') }]).concat([{ t: 'Delete', go: () => save(list.filter(y => y.id !== x.id)) }]).map(a => Object.assign(a, { bg: 'transparent', fg: a.t === 'Delete' ? T3 : T2 })) } }),
  }
}

function scans() {
  const S = this.props.D.body?.scans ?? []
  if (!S.length) return { sNodes: [], sCmpOpts: [], sTiles: [], sRegions: [], sIsOct: false, sDetail: [] }
  const ids = S.map(s => s.day), sel = ids.includes(this.state.sDate) ? this.state.sDate : ids.at(-1)
  const cmp = this.state.sCmp === undefined ? (ids.length > 1 ? ids.at(-2) : null) : (ids.includes(this.state.sCmp) && this.state.sCmp !== sel ? this.state.sCmp : null)
  const s = S.find(x => x.day === sel), c = cmp ? S.find(x => x.day === cmp) : null
  const nodes = S.map(x => [x.day, x.label, x.year])
  const dl = (a, b, lowerBetter, dp = 1) => { if (a == null || b == null) return { t: '', c: T3 }; const x = a - b; if (Math.abs(x) < 0.05) return { t: '±0', c: T3 }
    return { t: (x > 0 ? '+' : '−') + Math.abs(x).toFixed(dp), c: lowerBetter == null ? T2 : (lowerBetter ? x < 0 : x > 0) ? G : R } }
  const st = (k, v, u, b, lb, dp = 1) => { const d = dl(v, b, lb, dp); return { k, v: v == null ? '—' : v.toFixed(dp), u, c: T1, note: c ? d.t + ' vs ' + c.label : s.label + ' ' + s.year, nc: c ? d.c : T3, go: null, cur: 'default' } }
  const det = (k, v, u, note, col = T1) => ({ k, v, u, c: col, note, nc: T3, go: null, cur: 'default' })
  const L = s.regions
  return {
    sNodes: this.nodes(nodes, sel, cmp, id => this.setState(st0 => ({ sDate: id, sCmp: st0.sCmp === id ? null : st0.sCmp }))),
    sCmpOpts: this.seg([['none', 'None']].concat(nodes.filter(d => d[0] !== sel).map(d => [d[0], d[1]])), cmp || 'none', id => this.setState({ sCmp: id === 'none' ? null : id })),
    sTiles: [st('Body fat', s.bodyFatPct, '%', c?.bodyFatPct, true), st('Fat mass', s.fatLb, 'lb', c?.fatLb, true), st('Lean mass', s.leanLb, 'lb', c?.leanLb, false), st('Total mass', s.totalLb, 'lb', c?.totalLb, null), st('Visceral fat', s.vatLb, 'lb', c?.vatLb, true, 2)],
    sRegions: ['Arms', 'Trunk', 'Legs'].filter(k => L[k]).map(k => { const a = L[k], b = c?.regions?.[k], fd = dl(a.fatLb, b?.fatLb, true), ld = dl(a.leanLb, b?.leanLb, false)
      return { k, fat: a.fatLb.toFixed(1) + ' lb', lean: a.leanLb.toFixed(1) + ' lb', fd: fd.t, fc: fd.c, ld: ld.t, lc: ld.c } }),
    sIsOct: sel === ids.at(-1),
    sDetail: [
      s.bmd ? det('Bone density', s.bmd.zScore != null ? sign(s.bmd.zScore, 1) : '—', 'Z-score', `${s.bmd.gcm2} g/cm²` + (s.bmd.centile != null ? ` · ${s.bmd.centile}th centile` : ''), s.bmd.zScore < -1 ? W : T1) : null,
      s.rsmi != null ? det('Muscle index (RSMI)', s.rsmi.toFixed(2), 'kg/m²', '', T1) : null,
      s.rmrKcal != null ? det('Resting metabolic rate', s.rmrKcal.toLocaleString(), 'kcal', 'From the scan report') : null,
    ].filter(Boolean),
  }
}

// ---- Tests ---------------------------------------------------------------------------------------
const parseV = (x) => (x ? { v: x.v, f: x.f || '', t: x.t } : null)
const posOf = (x, lo, hi) => { const a = lo ?? (hi != null ? 0 : x * 0.5), b = hi ?? (lo != null ? lo * 2 : x * 1.5); return Math.max(3, Math.min(97, 20 + 60 * (x - a) / ((b - a) || 1))).toFixed(1) + '%' }
const flagC = f => f === 'H' ? R : f === 'L' ? W : T1, dotC = f => f === 'H' ? R : f === 'L' ? W : G

function blood() {
  const T = this.props.D.tests, draws = T?.draws ?? []
  if (!draws.length) return { bNodes: [], bCmpOpts: [], bFilterOpts: [], bMore: null, bPanels: [], bSelLabel: '', bCmpLabel: '', bChgLabel: '', bSummary: 'No lab reports yet', bFlagged: [] }
  const ids = draws.map(d => d.id), sel = ids.includes(this.state.bDate) ? this.state.bDate : ids.at(-1)
  const cmp = this.state.bCmp === undefined ? (ids.length > 1 ? ids.at(-2) : null) : (ids.includes(this.state.bCmp) && this.state.bCmp !== sel ? this.state.bCmp : null)
  const flt = this.state.bFilter, lab = id => draws.find(d => d.id === id)?.label ?? ''
  const trend = (m) => { const ps = ids.map(id => parseV(m.values[id])), mx = Math.max(...ps.filter(Boolean).map(p => p.v ?? 0), 0.0001)
    return ids.map((id, i) => { const p = ps[i]; return { h: p && p.v != null ? Math.max(14, p.v / mx * 100).toFixed(0) + '%' : '8%', c: !p ? 'oklch(1 0 0 / 0.08)' : id === sel ? A : id === cmp ? 'oklch(0.82 0.13 210 / 0.55)' : 'oklch(0.82 0.13 210 / 0.22)' } }) }
  const allRows = T.markers.map(m => {
    const s = parseV(m.values[sel]), c = cmp ? parseV(m.values[cmp]) : null
    let d = '', dc = T3
    // A result reported as "<30" or ">1000" is a detection limit, not a measurement: there's no change to work out.
    if (/^[<>]/.test(s?.t ?? '') || /^[<>]/.test(c?.t ?? '')) { if (s && c) d = '—' }
    else if (s?.v != null && c?.v != null) { const pct = (s.v - c.v) / Math.abs(c.v || 1) * 100; if (Math.abs(pct) < 3) d = '→'; else { d = (s.v > c.v ? '↑ ' : '↓ ') + Math.abs(Math.round(pct)) + '%'
      // Green when the later of the two draws is better, red when it's worse, grey when neither is clear.
      const [older, newer] = sel > cmp ? [c.v, s.v] : [s.v, c.v], g = labVerdict(m, older, newer); dc = g > 0 ? G : g < 0 ? R : T2 } }
    const draw = draws.find(x => x.id === sel)
    return { panel: m.group, flag: s?.f, name: m.name, u: m.unit ?? '', ref: m.range ?? '',
      v: s ? s.t : (draw?.status === 'PARTIAL' ? 'Pending' : 'Not tested'), c: s ? flagC(s.f) : T3,
      cv: cmp ? (c ? c.t : '—') : '', cc: c ? (c.f ? flagC(c.f) : T2) : T3, d, dc,
      p: s?.v != null ? posOf(s.v, m.low, m.high) : '0%', po: s?.v != null ? 1 : 0, pc: c?.v != null ? posOf(c.v, m.low, m.high) : '0%', pco: c?.v != null ? 1 : 0,
      dot: s ? dotC(s.f) : T3, trend: trend(m), both: !!(s && c) } })
  // Comparing two draws: only the markers both reports have (an untested one has nothing to compare against).
  const rows = cmp ? allRows.filter(r => r.both) : allRows
  const order = ['Lipids', 'Iron & blood', 'Metabolic', 'Liver & kidney', 'Hormones', 'Inflammation & vitamins', 'Other']
  // Default view: only the out-of-range markers (the full list is long); everything when nothing is flagged.
  const onlyFlagged = flt === 'flagged' && rows.some(r => r.flag)
  const shown = (onlyFlagged ? rows.filter(r => r.flag) : rows).sort((a, b) => order.indexOf(a.panel) - order.indexOf(b.panel))
  const panels = []
  shown.forEach(r => { let p = panels.find(x => x.name === r.panel); if (!p) { p = { name: r.panel, rows: [] }; panels.push(p) } p.rows.push(r) })
  const flagged = rows.filter(r => r.flag), tested = rows.filter(r => r.po).length, allFlagged = allRows.filter(r => r.flag)
  return {
    bNodes: this.nodes(draws.map(d => [d.id, d.dayL ?? d.label, d.year]), sel, cmp, id => this.setState(s => ({ bDate: id, bCmp: s.bCmp === id ? null : s.bCmp }))),
    bCmpOpts: this.seg([['none', 'None']].concat(draws.filter(d => d.id !== sel).map(d => [d.id, d.label])), cmp || 'none', id => this.setState({ bCmp: id === 'none' ? null : id })),
    bFilterOpts: flagged.length ? this.seg([['flagged', `Out of range · ${flagged.length}`], ['all', `All · ${tested}`]], flt, id => this.setState({ bFilter: id })) : [],
    bMore: onlyFlagged ? { label: `Show all ${tested} markers`, go: () => this.setState({ bFilter: 'all' }) } : flt === 'all' && flagged.length ? { label: 'Show only out of range', go: () => this.setState({ bFilter: 'flagged' }) } : null,
    bPanels: panels, bSelLabel: lab(sel), bCmpLabel: cmp ? lab(cmp) : '', bChgLabel: cmp ? 'Change' : '',
    bSummary: allFlagged.length + ' of ' + allRows.filter(r => r.po).length + ' out of range on ' + lab(sel) + (cmp ? ` · ${rows.length} marker${rows.length === 1 ? '' : 's'} in both reports` : ''),
    bFlagged: allFlagged.map(r => ({ name: r.name, v: r.v, c: dotC(r.flag) })),
  }
}

// Is a lab change an improvement? Moving into (or toward) the reference range is better and moving away is worse; with
// both values in range, the markers where lower or higher is plainly better decide; anything else is neutral (0).
const LAB_LOWER = /^(Glucose|Cholesterol, Total|Triglycerides|LDL|Chol\/Hdlc|Non HDL|Apolipoprotein B|Insulin|Lipoprotein \(A\)|HS CRP|Homocysteine|Hemoglobin A1c)/i
const LAB_HIGHER = /^HDL Cholesterol/i
function labVerdict(m, older, newer) {
  const off = v => (m.low != null && v < m.low ? m.low - v : m.high != null && v > m.high ? v - m.high : 0)
  const a = off(older), b = off(newer)
  if (a !== b) return b < a ? 1 : -1
  if (LAB_LOWER.test(m.name)) return newer < older ? 1 : -1
  if (LAB_HIGHER.test(m.name)) return newer > older ? 1 : -1
  return 0
}

function vo2Data() {
  const v = this.props.D.tests?.vo2?.at(-1)
  if (!v) return { vNodes: [], vTiles: [], vStages: [], zones: [], vNotes: [noteRow(T3, 'No VO₂ test yet. Upload the report on Settings.')] }
  const lo = 90, hi = Math.max(200, v.maxHr ?? 200)
  return {
    vNodes: [{ label: v.label, sub: 'Viewing', sc: A, pick: null, border: '1.5px solid ' + A, fill: A, glow: '0 0 14px oklch(0.82 0.13 210 / 0.7)', fg: T1 }, { label: 'Next test', sub: 'Not scheduled', sc: T3, pick: null, border: '1px dashed oklch(1 0 0 / 0.25)', fill: 'transparent', glow: 'none', fg: T3 }],
    vTiles: [tile('VO₂ max', v.vo2max ?? '—', 'ml/kg/min', ''), tile('Max heart rate', v.maxHr ?? '—', 'bpm', ''),
      tile('Anaerobic threshold', v.anaerobicThreshold?.hr ?? '—', 'bpm', v.anaerobicThreshold?.vo2 ? v.anaerobicThreshold.vo2 + ' ml/kg/min' : ''),
      tile('Aerobic threshold', v.aerobicThreshold?.hr ?? '—', 'bpm', v.aerobicThreshold?.vo2 ? v.aerobicThreshold.vo2 + ' ml/kg/min' : ''), tile('Resting', v.restingHr ?? '—', 'bpm', 'Start of test')],
    // Fuel mix by stage (the report's stage averages): bar height = VO₂ at the stage, split carbs (top) / fat (bottom).
    vStages: (() => { const st = v.stages ?? [], mx = Math.max(1, ...st.map(x => x.vo2))
      return st.map(x => ({ fatPct: Math.round(x.fatPct) + '% fat', h: Math.max(18, Math.round(x.vo2 / mx * 100)) + '%', cho: x.choPct, fat: x.fatPct, hr: x.hr + ' bpm' })) })(),
    zones: v.zones.map((z, i) => { const a = z.lowHr ?? lo, b = z.highHr ?? hi
      return { z: z.zone, hr: z.lowHr == null ? '< ' + z.highHr : z.highHr == null ? '> ' + z.lowHr : z.lowHr + '–' + z.highHr, o: (0.3 + i * 0.175).toFixed(2), l: ((a - lo) / (hi - lo) * 100).toFixed(1) + '%', w: ((b - a) / (hi - lo) * 100).toFixed(1) + '%' } }),
    vNotes: v.recovery?.peak ? [noteRow(A, `Heart-rate recovery: ${v.recovery.peak} at peak, ${v.recovery.after1m} after 1 minute, ${v.recovery.after2m} after 2.`)] : [],
  }
}

// ---- Headlines (generated from data, spec 09) ----------------------------------------------------
function headline(id, D, extra) {
  const w = D.whoop, t = D.training, f = D.fuel, b = D.body, h = new Date().getHours()
  switch (id) {
    case 'command': return `Good ${h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'}, ${D.name}.`
    case 'week': { if (!t) return D.weekPlans?.this ? 'Your plan for this week. Connect WHOOP or Strava to check sessions off automatically.' : 'No activity data yet. Ask your coach to plan the week, or edit a day below.'; const c = t.weekCounts.now; return `This week so far: ${c.activeDays} active day${c.activeDays === 1 ? '' : 's'}, ${c.strength} strength, ${c.runs} run${c.runs === 1 ? '' : 's'}.` }
    case 'training': { if (!t) return 'No Strava data yet. Upload an export or connect Strava on Settings.'; const k = t.kpis
      return (t.streak ? `${t.streak} straight active days. ` : '') + `${k.runMonth.mi} run miles this month` + (k.runMonth.prevMi ? ` vs ${k.runMonth.prevMi} last month.` : '.') + (k.lastRide && k.lastRide.daysAgo > 14 ? ` No ride since ${fmtDay(k.lastRide.day)}.` : '') }
    case 'body': { const s = b?.scans ?? []; if (s.length >= 2) { const a = s[0], z = s.at(-1), df = z.fatLb - a.fatLb, dl = z.leanLb - a.leanLb
        return `${df <= 0 ? 'Down' : 'Up'} ${Math.abs(df).toFixed(1)} lb of fat and ${dl >= 0 ? 'up' : 'down'} ${Math.abs(dl).toFixed(1)} lb of lean since ${a.label}.` }
      return extra?.top ? `Most trained in 30 days: ${extra.top.toLowerCase()}.` : 'No body data yet.' }
    case 'recovery': return w ? `Recovery is ${w.latest.rec}% with HRV at ${w.latest.hrv} ms` + (w.latest.sleepMin ? ` after ${hm(w.latest.sleepMin)} of sleep.` : '.') : 'No WHOOP data yet.'
    case 'fuel': return f ? `Trend weight ${f.trend?.now.toFixed(1) ?? '—'} lb. Food logged on ${f.logged30.length} of the last 30 days.` : 'No MacroFactor data yet.'
    case 'blood': { const d = D.tests?.draws?.at(-1); if (!d) return 'No lab reports yet.'; const fl = D.tests.markers.filter(m => m.values[d.id]?.f).length
      return `${fl} marker${fl === 1 ? '' : 's'} out of range on the ${d.label} draw` + (d.status === 'PARTIAL' ? ' (some results still pending).' : '.') }
    case 'roadmap': { const p = D.plan; if (!p) return 'No roadmap yet.'; const nr = p.nextRace && p.nextRace.name !== p.goal.event ? ` ${p.nextRace.name} in ${p.nextRace.daysTo} days.` : ''
      return `${p.goal.daysTo} days to ${p.goal.event}.${nr}` }
    case 'calendar': { const up = (D.calendar ?? []).filter(i => i.daysTo >= 0); if (!up.length) return 'Nothing coming up. Add an appointment or anything you want to count down to.'
      const n = up.filter(i => i.daysTo <= 14).length, x = up[0]; return `${x.title} ${x.daysTo === 0 ? 'today' : x.daysTo === 1 ? 'tomorrow' : `in ${x.daysTo} days`}.` + (n > 1 ? ` ${n} things in the next 2 weeks.` : '') }
    case 'journal': { const j = D.journal ?? []; if (!j.length) return 'Write an entry, or paste what your doctor sent.'
      const docs = j.filter(e => e.doc).length; return `${j.length} entr${j.length === 1 ? 'y' : 'ies'}` + (docs ? `, ${docs} from your care team.` : '.') }
    case 'settings': { const n = Object.keys(D.lastData).length; return `${n} source${n === 1 ? '' : 's'} with data.` }
    default: return ''
  }
}

// ---- Brief / chat glue ---------------------------------------------------------------------------
function briefFallback(D) {
  const w = D.whoop, sig = signalsOf(D)
  if (!w) return { changed: 'No WHOOP data yet.', today: 'Upload or connect your sources on Settings.', focus: 'Get your data in.' }
  const hp = pctOf(w.latest.hrv, w.avg30.hrv), reds = sig.filter(s => s.c === R).length, call = (w.latest.rec < 34 || reds >= 2) ? 'Rest' : (w.latest.rec >= 67 && reds === 0) ? 'Train hard' : 'Train easy'
  return { changed: `Recovery ${w.latest.rec}%, HRV ${w.latest.hrv} ms (${sign(hp)}% vs average), slept ${hm(w.latest.sleepMin)}.`, today: `${call}, per the daily call.`, focus: call === 'Rest' ? 'Rest and sleep early.' : 'Keep easy efforts truly easy.' }
}

// ---- renderVals ----------------------------------------------------------------------------------
function renderVals() {
  const D = this.props.D, h = React.createElement
  const page = PAGES.some(p => p.id === this.state.page) ? this.state.page : 'command'
  const P = PAGES.find(p => p.id === page)
  SFX.on = !this.state.muted && (this.props.sound ?? 'On') !== 'Off'; SFX.setVol(this.props.volume ?? 0.5)
  const mo = this.state.boot === 'done' ? this.motion() : 'Off'
  const sn = this.state.scanN || 0, scanOn = sn > 0 && page === 'body' && mo === 'Full'
  const bootFx = this.state.boot === 'on' ? h(BootFx, { key: 'boot', onReveal: () => { this._revealed = true; this.after(() => this.enter(true)) }, onDone: () => this.bootDone() }) : this.state.boot === 'pending' ? h('div', { key: 'cover', style: { position: 'fixed', inset: 0, zIndex: 100, background: 'oklch(0.13 0.016 262)' } }) : null
  const pageFx = mo === 'Full' && this.state.fxN > 0 ? h('div', { key: 'fx' + this.state.fxN, style: { position: 'fixed', inset: 0, zIndex: 60, pointerEvents: 'none', overflow: 'hidden' } },
    h('div', { style: { position: 'absolute', inset: 0, background: 'linear-gradient(oklch(0.82 0.13 210 / 0.05) 1px, transparent 1px) 0 0 / 100% 4px', animation: 'imFlash .5s ease-out forwards' } }),
    h('div', { style: { position: 'absolute', left: 0, right: 0, top: 0, height: '12vh', background: 'linear-gradient(transparent, oklch(0.82 0.13 210 / 0.10) 80%, oklch(0.9 0.1 210 / 0.7) 99%, transparent)', animation: 'imScan .7s cubic-bezier(.3,.6,.3,1) forwards' } })) : null
  const go = Object.fromEntries(PAGES.map(p => [p.id, () => this.go(p.id)]))
  const draw = D.tests?.draws?.at(-1), flaggedN = draw ? D.tests.markers.filter(m => m.values[draw.id]?.f).length : 0
  const t = D.training, badges = { blood: flaggedN ? [String(flaggedN), R] : ['', T3], week: t ? [t.weekCounts.now.activeDays + '/7', A] : ['', T3], roadmap: D.plan?.goal.weeksTo != null ? [D.plan.goal.weeksTo + 'w', A] : ['', T3], calendar: (D.calendar ?? []).filter(i => i.daysTo >= 0 && i.daysTo <= 14).length ? [String((D.calendar ?? []).filter(i => i.daysTo >= 0 && i.daysTo <= 14).length), A] : ['', T3] }

  // Muscle map
  const rangeMap = { '30D': 'd30', '90D': 'd90', 'All time': 'all' }, range = this.state.range ?? (this.props.defaultRange ?? '30D')
  const d = D.body?.load?.[rangeMap[range]] ?? { n: 0, sets: 0, m: {}, g: {} }
  const dv = {}
  for (const s of FRONT_S.concat(BACK_S)) if (s.m && !(s.m in dv)) { const parts = COMBO[s.m]; dv[s.m] = Math.round(parts ? parts.reduce((a, k) => a + (d.m[k] ?? 0), 0) / parts.length : (d.m[s.m] ?? 0)) }
  const max = Math.max(1, ...Object.values(dv)), ranked = Object.entries(dv).sort((a, b) => b[1] - a[1]), hover = this.state.hover
  const isRender = false, vm = () => ({ r: false, blend: 'normal', slotOp: 0, hint: '' }), fv = vm(), bv = vm()
  const INJMAP = { Shoulder: ['Front Shoulder', 'Back Shoulder'], Chest: ['Chest'], 'Upper back': ['Upper Back', 'Lats'], 'Lower back': ['Lower Back'], Abs: ['Abs', 'Obliques'], 'Hip / glute': ['Glutes'], 'Hip flexor / groin': ['Inner Thigh'], Quad: ['Quads'], Hamstring: ['Hamstrings'], 'Calf / Achilles': ['Calves'], Shin: ['Calves'], Biceps: ['Biceps'], Triceps: ['Triceps'], 'Elbow / forearm': ['Forearms'] }
  const injSet = new Set([].concat(...(this.state.inj || []).filter(x => x.status !== 'Resolved').map(x => INJMAP[x.area] || [])))
  const mk = s => {
    if (!s.m) return Object.assign({}, s, { fill: 'oklch(0.27 0.02 255)', stroke: 'oklch(0.27 0.02 255)', fo: 1, pe: 'none', op: hover ? 0.5 : 1, glow: 'none', enter: null })
    const tt = Math.pow(dv[s.m] / max, 1.6), c = this.heat(tt)
    const o = Object.assign({}, s, { fill: c, stroke: hover === s.m ? T1 : c, fo: 1, pe: 'auto', op: hover && hover !== s.m ? 0.35 : 1, glow: tt > 0.7 ? 'drop-shadow(0 0 3px ' + c + ')' : 'none', enter: () => this.setState({ hover: s.m }) })
    if (injSet.has(s.m)) { o.stroke = R; o.glow = 'drop-shadow(0 0 5px ' + R + ')'; o.op = 1 }
    return o
  }
  const fname = hover ?? ranked[0]?.[0], fval = dv[fname] ?? 0, rank = ranked.findIndex(r => r[0] === fname) + 1
  const gMax = Math.max(1, ...Object.values(d.g))
  const weak = ranked.filter(([, v]) => v < 10).map(([k]) => k)
  const w = D.whoop, L = w?.latest, scansL = D.body?.scans ?? [], lastScan = scansL.at(-1), firstScan = scansL[0]
  const fmtNowTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  const runMonth = t?.kpis.runMonth, f = D.fuel
  const recC = x => x >= 67 ? G : x >= 34 ? W : R

  // Watchlist: out-of-range markers on the latest draw (else the first few), trend across draws.
  const ids = (D.tests?.draws ?? []).map(x => x.id)
  const watchM = draw ? (D.tests.markers.filter(m => m.values[draw.id]?.f).slice(0, 6)) : []
  const watch = watchM.map(m => { const lastId = [...ids].reverse().find(id => m.values[id]), p = m.values[lastId], mx = Math.max(...ids.map(id => m.values[id]?.v ?? 0), 0.0001)
    return { name: m.name, v: p.t + (lastId !== draw.id ? ' (' + (D.tests.draws.find(x => x.id === lastId)?.label ?? '') + ')' : ''), c: p.f ? flagC(p.f) : T1,
      trend: ids.map(id => { const q = m.values[id]; return { h: q?.v != null ? Math.max(14, q.v / mx * 100).toFixed(0) + '%' : '8%', c: !q ? 'oklch(1 0 0 / 0.08)' : id === lastId ? A : 'oklch(0.82 0.13 210 / 0.22)' } }) } })

  setBootSteps([
    ['WHOOP', w ? `${D.lastData.whoop ? 'Through ' + fmtDay(D.lastData.whoop) : ''}` : 'No data'], ['Strava', t ? `${t.run.n + t.ride.n + t.swim.n} runs, rides and swims this year` : 'No data'],
    ['FitnessAI', D.body?.asOf ? 'Through ' + D.body.asOf : 'No data'], ['MacroFactor', f ? `${f.weighIns30} weigh-ins in 30 days` : 'No data'],
    ['Labs', D.tests?.draws?.length ? D.tests.draws.map(x => x.label).join(' · ') : 'No data'], ['DEXA', scansL.length ? scansL.length + ' scans' : 'No data'],
  ])

  const T = {
    now: D.todayLabel + ' · ' + fmtNowTime, mobDate: fmtDay(D.today, { weekday: 'short', month: 'short', day: 'numeric' }),
    callTitle: "Today's call · " + fmtDay(D.today, { weekday: 'long', month: 'short', day: 'numeric' }) + (L && L.day !== D.today ? ' · WHOOP from ' + fmtDay(L.day) : ''),
    drawSeq: (D.tests?.draws ?? []).map(x => x.label.split(' ')[0]).join(' → '),
    bf: lastScan ? lastScan.bodyFatPct.toFixed(1) : '—', bfDelta: lastScan && firstScan && lastScan !== firstScan ? sign(lastScan.bodyFatPct - firstScan.bodyFatPct, 1) + ' since ' + firstScan.label.split(' ')[0] : '',
    weekTitle: t ? fmtDay(t.weekStart) + ' – ' + fmtDay(new Date(Date.parse(t.weekStart + 'T12:00:00Z') + 6 * 864e5).toISOString().slice(0, 10)) + (D.plan ? ' · plan vs actual' : ' · actual activity') : 'This week',
    weekNote: D.plan?.deload?.active ? `Deload week · ${Math.round(D.plan.deload.fraction * 100)}% weights` : D.plan ? 'Plan vs actual' : 'Compared with your 4-week average',
    todTitle: t ? 'When you train · ' + t.year + ', excluding walks' : 'When you train', sportTitle: t ? 'By sport · ' + t.year : 'By sport',
    liftsSub: D.body?.lifts?.length ? 'Best set per month · ' + D.body.lifts[0].months[0] + ' → ' + D.body.lifts[0].months.at(-1) + ' · FitnessAI' : 'No FitnessAI data yet',
    scanOnly: lastScan ? 'Only in the ' + lastScan.label + ' report' : '',
    woke: L ? 'Woke ' + fmtDay(L.day) + (L.woke ? ' · ' + L.woke : '') : 'No WHOOP data',
    rAx: w ? [w.days30[0]?.l ?? '', w.days30[Math.floor(w.days30.length / 2)]?.l ?? '', w.days30.at(-1)?.l ?? ''] : ['', '', ''],
    sleepSpan: L?.asleepAt ? L.asleepAt + ' – ' + L.woke : '', ...(L?.performance != null
      ? { sleepDur: L.performance + '%', sleepNeed: hm(L.sleepMin) + ' asleep · needed ' + hm(L.needMin), sleepPerf: 'Sleep performance' }
      : { sleepDur: hm(L?.sleepMin), sleepNeed: L ? 'asleep · needed ' + hm(L.needMin) : '', sleepPerf: '' }),
    fAx: f ? [f.days30[0].l, f.days30[15].l, f.days30.at(-1).l] : ['', '', ''],
    bestTitle: f?.bestStreak ? 'Best logging stretch · ' + fmtDay(f.bestStreak.start) + ' – ' + fmtDay(f.bestStreak.end) : 'Best logging stretch',
    bestSub: f?.bestStreak ? f.bestStreak.len + ' days · vs current target' : '', vo2Sub: '',
  }
  const dial = L ? { k: 'Recovery', v: L.rec, c: recC(L.rec), dash: (L.rec / 100 * 276.46).toFixed(1) + ' 276.5', glow: 'drop-shadow(0 0 6px ' + recC(L.rec).replace(')', ' / 0.8)') + ')', label: L.rec >= 67 ? 'Green · ready to push' : L.rec >= 34 ? 'Yellow · keep it aerobic' : 'Red · recover',
      word: L.rec >= 67 ? 'Green' : L.rec >= 34 ? 'Yellow' : 'Red', advice: L.rec >= 67 ? 'Ready to push' : L.rec >= 34 ? 'Keep it aerobic' : 'Recover today', unit: '%', wash: recC(L.rec).replace(')', ' / 0.10)'),
      synced: [D.synced?.whoop ? 'WHOOP synced ' + clock(D.synced.whoop) : '', L.revisedFrom ? `revised from ${L.revisedFrom.from}% at ${clock(L.revisedFrom.at)}` : ''].filter(Boolean).join(' · ') }
    : { k: 'Recovery', v: '—', c: T3, dash: '0 276.5', glow: 'none', label: 'No data', word: 'No data', advice: '', unit: '', wash: 'transparent', synced: '' }
  // Sleep performance as a ring beside Recovery, in WHOOP's bands (≥85 optimal, 70–84 sufficient, <70 poor).
  const sp = L?.performance, spC = sp == null ? T3 : sp >= 85 ? G : sp >= 70 ? W : R
  const sleepDial = sp != null
    ? { k: 'Sleep', v: sp, unit: '%', c: spC, dash: (Math.min(sp, 100) / 100 * 276.46).toFixed(1) + ' 276.5', glow: 'drop-shadow(0 0 6px ' + spC.replace(')', ' / 0.8)') + ')', wash: spC.replace(')', ' / 0.10)'),
        word: sp >= 85 ? 'Optimal' : sp >= 70 ? 'Sufficient' : 'Poor', advice: hm(L.sleepMin) + ' of ' + hm(L.needMin) + ' needed' }
    : { k: 'Sleep', v: L ? hm(L.sleepMin) : '—', unit: '', c: T3, dash: '0 276.5', glow: 'none', wash: 'transparent', word: L?.sleepMin != null ? 'Asleep' : 'No data', advice: L?.needMin != null ? 'Needed ' + hm(L.needMin) : '' }

  const vd0 = this.verdict(go).vd
  return Object.assign({
    T, dial, sleepDial, coachName: activeCoach().name, lockNow: () => this.props.onLock?.(), D,
    setNav: { bc: page === 'settings' ? 'oklch(0.82 0.13 210 / 0.5)' : LINE_C, bg: page === 'settings' ? 'oklch(0.82 0.13 210 / 0.10)' : 'oklch(1 0 0 / 0.025)', fg: page === 'settings' ? T1 : T2 },
    nav: PAGES.filter(p => p.id !== 'settings').map(p => { const a = p.id === page, b = badges[p.id] || ['', T3]
      return { label: p.label, icon: ICONS[p.id] || ICONS.command, ic: a ? A : T3, go: go[p.id], bg: a ? 'oklch(0.82 0.13 210 / 0.10)' : 'transparent', fg: a ? T1 : T2, bar: a ? A : 'transparent', glow: a ? '0 0 10px ' + A : 'none', badge: b[0], bc: b[1] } }),
    sources: Object.entries(D.lastData).map(([name, last]) => { const age = daysBetween(D.today, last), c = age > 7 ? W : G; return { name, sync: fmtDay(last), dot: c, glow: '0 0 6px ' + c } }),
    srcSummary: Object.keys(D.lastData).length + ' with data · ' + Object.values(D.lastData).filter(x => daysBetween(D.today, x) > 2).length + ' behind',
    pg: { label: P.label, title: headline(page, D, { top: ranked[0]?.[0] }) },
    ...this.layout(page, go, badges),
    vdDot: (() => { const c = vd0.c, ring = (dl) => h('span', { key: dl, style: { position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid ' + c, animation: 'imBeat 2s cubic-bezier(.2,.6,.3,1) ' + dl + 's infinite' } })
      return h('span', { key: 'vdDot', style: { position: 'relative', width: 14, height: 14, flex: 'none' } }, ring(0), ring(0.35), h('span', { style: { position: 'absolute', inset: 0, borderRadius: '50%', background: c, boxShadow: '0 0 0 5px ' + vd0.ring + ', 0 0 22px ' + c, animation: 'imCore 2s ease-in-out infinite' } })) })(),
    ...this.chatData(P), ...this.briefData(),
    bootFx, pageFx, scanFront: scanOn ? h(BodyScan, { key: 'sf' + sn, side: 'front' }) : null, scanBack: scanOn ? h(BodyScan, { key: 'sb' + sn, side: 'back' }) : null,
    show: Object.assign(Object.fromEntries(PAGES.map(p => [p.id, p.id === page])), { performance: page === 'blood' }), go,
    kpis: [
      tile('Recovery', L ? L.rec : '—', '%', L ? (L.rec >= 67 ? 'Green' : L.rec >= 34 ? 'Yellow' : 'Red') + ' · 30-day avg ' + Math.round(w.avg30.rec) + '%' : 'No data', L ? recC(L.rec) : T3, L ? recC(L.rec) : T1, go.recovery),
      tile('HRV', L ? L.hrv : '—', 'ms', L ? sign(Math.round(L.hrv - w.avg30.hrv)) + ' vs 30-day avg' : '', L && pctOf(L.hrv, w.avg30.hrv) <= -8 ? R : T3, null, go.recovery),
      tile('Sleep', L ? hm(L.sleepMin) : '—', '', L?.performance != null ? L.performance + '% performance' : '', null, null, go.recovery),
      tile('Run · ' + fmtDay(D.today, { month: 'long' }), runMonth ? runMonth.mi : '—', 'mi', runMonth ? `${runMonth.n} runs, longest ${runMonth.longest} mi` : '', null, null, go.training),
      tile('Food logged', f ? f.logged30.length : '—', 'of 30 days', f ? 'Weighed in ' + f.weighIns30 + ' of 30' : '', f && f.logged30.length < 15 ? W : T3, null, go.fuel),
      tile('Weight', f?.trend ? f.trend.now.toFixed(1) : lastScan ? lastScan.totalLb.toFixed(1) : '—', 'lb', lastScan ? 'DEXA ' + lastScan.label + ' · ' + lastScan.bodyFatPct + '% fat' : 'Trend weight', null, null, go.body),
    ],
    ...this.verdict(go), ...this.command(go), ...this.weekData(), ...this.injData(), ...this.liftData(), ...this.strainData(),
    bodyNotes: ranked.length && d.sets ? [noteRow(A, 'Most trained: ' + ranked[0][0].toLowerCase() + ', ' + ranked[0][1] + ' weighted sets in ' + (range === 'All time' ? 'all time' : range.replace('D', ' days')) + '.'),
      ...(weak.length ? [noteRow(W, weak.slice(0, 3).join(', ') + ' got under 10 weighted sets in this window.')] : [])] : [noteRow(T3, 'No FitnessAI data yet.')],
    watch, bfBars: scansL.length ? this.bars(scansL.map(s => s.bodyFatPct), scansL.map(s => s.label), scansL.length - 1, v => v.toFixed(1) + '%', Math.min(...scansL.map(s => s.bodyFatPct)) - 3, Math.max(...scansL.map(s => s.bodyFatPct)) + 1) : [],
    trainKpis: t ? [
      tile('Active streak', t.streak, 'days', t.streakSince ? 'Every day since ' + fmtDay(t.streakSince) : 'No active streak', t.streak ? G : T3),
      tile('Swim · bike · run', t.kpis.sbrPerWeek, 'h/wk', 'Avg of last 4 weeks'),
      tile('Run · ' + fmtDay(D.today, { month: 'long' }), runMonth.mi, 'mi', runMonth.prevMi ? sign(pctOf(runMonth.mi, runMonth.prevMi)) + '% vs last month' : ''),
      tile('Swim · ' + t.year, t.kpis.swimYear.yd.toLocaleString(), 'yd', t.kpis.swimYear.n + ' swims'),
      tile('Days since a ride', t.kpis.lastRide ? t.kpis.lastRide.daysAgo : '—', '', t.kpis.lastRide ? 'Last: ' + fmtDay(t.kpis.lastRide.day) + ', ' + (t.kpis.lastRide.mi != null ? t.kpis.lastRide.mi + ' mi' : t.kpis.lastRide.min + ' min indoors') : 'No rides', null, t.kpis.lastRide && t.kpis.lastRide.daysAgo > 14 ? R : T1),
      tile('Strength', t.kpis.strPerWeek, '/wk', t.kpis.strAvgMin + ' min avg · last 4 wks'),
    ] : [],
    ...this.training(),
    isRender, fv, bv, overlayTf: 'none', splitChips: [],
    front: FRONT_S.map(mk), back: BACK_S.map(mk), leave: () => this.setState({ hover: null }),
    ranges: this.seg([['30D', '30 days'], ['90D', '90 days'], ['All time', 'All time']], range, id => this.setRange(id)),
    meta: d.n + ' sessions · ' + d.sets.toLocaleString() + ' sets' + (D.body?.asOf ? ' · through ' + D.body.asOf : ''),
    focus: fname ? { tag: (hover ? 'Selected' : 'Most trained') + (D.body?.asOf ? ' as of ' + D.body.asOf : ''), name: fname, val: fval.toLocaleString(), rank: '#' + rank + ' of ' + ranked.length + ' regions · ' + Math.round(fval / Math.max(1, d.sets) * 100) + '% of set volume' } : { tag: 'No data', name: '—', val: '0', rank: '' },
    groups: Object.entries(d.g).sort((a, b) => b[1] - a[1]).map(e => ({ name: e[0], val: e[1].toLocaleString(), pct: Math.round(e[1] / gMax * 100) + '%', fill: this.heat(Math.pow(e[1] / gMax, 0.85)) })),
    ...this.recovery(), ...this.rwData(), ...this.fuel(), ...this.vo2Data(),
    ...this.voiceVals(),
    ...(page === 'fuel' ? { ...this.protoData(), ...this.dietData(), ...this.foodData(), ...this.suppData() } : { protoOn: false, dietOn: false, foodOn: false, supps: null }),
    ...(page === 'roadmap' ? this.roadmapData() : { rmEmpty: true }),
  }, this.blood(), this.scans())
}

// ---- genBrief / chat, rebound to the data -------------------------------------------------------
async function genBrief(force) {
  const D = this.props.D
  if (this.state.briefBusy || (this.state.brief && !force)) return
  const root = document.querySelector('[data-screen-label="command"]'); if (!root) return
  this.setState({ briefBusy: true })
  const txt = root.innerText.replace(/Morning brief[\s\S]*?(?=Today's call)/, '').replace(/\n{2,}/g, '\n').slice(0, 6000)
  const sys = activeCoach().persona + SAMPLE_NOTE() + '\n\nTASK\nWrite his morning brief for the dashboard, in your voice: only what matters today, no over-explaining. Use only the data given. Give intensity as a heart-rate zone ("Zone 2"), not a bpm range. Return ONLY JSON: {"changed": string, "today": string, "focus": string}. changed = what moved overnight (recovery, HRV, sleep, anything notable) with numbers, max 28 words. today = the plan and why, max 28 words. focus = the single most important action today, max 18 words, imperative. Plain sentences, no markdown, no emoji.' + coachNotesPrompt() + '\n\n' + chatProfile(D)
  let out = null; try { out = await window.claude.complete({ max_tokens: 400, system: sys, messages: [{ role: 'user', content: 'Overview page right now:\n' + txt }] }) } catch (e) {}
  let j = null; try { j = JSON.parse((out || '').replace(/^[^{]*/, '').replace(/[^}]*$/, '')) } catch (e) {}
  const at = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase()
  const b = j && j.changed ? { date: D.today, at, changed: j.changed, today: j.today, focus: j.focus } : { date: D.today, at: '', err: 1, ...briefFallback(D) }
  if (!b.err) try { localStorage.setItem('im4-brief', JSON.stringify(b)) } catch (e) {}
  this.setState({ brief: b, briefBusy: false }); SFX.play('reply')
}

function chatContext() {
  const page = PAGES.some(p => p.id === this.state.page) ? this.state.page : 'command', P = PAGES.find(p => p.id === page)
  const root = document.querySelector('[data-screen-label="' + page + '"]')
  const txt = root ? root.innerText.replace(/\n{2,}/g, '\n').replace(/[ \t]+/g, ' ').slice(0, 7000) : ''
  const inj = (this.state.inj || []).filter(x => x.status !== 'Resolved'), fc = this.state.chatFocus
  return (fc ? 'The athlete is asking about one specific card titled "' + fc.title + '". Card content:\n' + fc.text + '\n\nFocus your answer on that card, using the rest for context.\n\n' : '') + 'Current page: ' + P.label + '. Page headline: ' + headline(page, this.props.D) + '\nActive injuries: ' + (inj.length ? inj.map(x => x.area + ' ' + x.side + ' ' + x.sev + ' since ' + x.date + (x.note ? ' (' + x.note + ')' : '')).join('; ') : 'none') + '.\n\nVisible page content:\n' + txt
}

/** The Coach's system prompt: rules, the athlete's profile from the data, and what's on screen. */
const SAMPLE_NOTE = () => (isSample() ? '\n\nDEMO\nThis dashboard is showing SAMPLE data: a made-up athlete\'s year, so the athlete can see how Halo Labs works before connecting anything. Coach exactly as you would with real data, and if asked, say plainly that the numbers are sample data and that setup (the banner at the top) brings in his own.' : '')

function chatSystem() {
  return activeCoach().persona + SAMPLE_NOTE() + '\n\nRULES\nYou live inside the athlete\'s personal training dashboard. Answer using his real numbers from the profile and the page content below. Lead with the answer, then the supporting points or concrete actions with numbers (distances, grams, times). Give run and ride intensity as a heart-rate zone from his VO2 test ("Zone 2"), not a bpm range; he runs by zone. Aim for about 80 to 200 words; go longer only when the question needs it or he asks for detail. Plain text only: no markdown headers, no bold, no tables; use "• " for bullets. If the data needed isn\'t available, say so briefly. For lab results or pain, give general guidance and suggest a doctor or physio where appropriate; never diagnose.' + coachNotesPrompt() + '\n\n' + chatProfile(this.props.D) + '\n\n' + this.chatContext()
}

async function chatSend(text) {
  const q = (text ?? this.state.chatIn).trim(); if (!q || this.state.chatBusy) return
  const page = PAGES.some(p => p.id === this.state.page) ? this.state.page : 'command', label = PAGES.find(p => p.id === page).label
  const msgs = this.state.chatMsgs.concat([{ role: 'user', content: q, page: label }])
  SFX.play('send'); this.setState({ chatMsgs: msgs, chatIn: '', chatBusy: true }, () => this.chatScroll())
  const system = this.chatSystem(), idx = msgs.length, coach = activeCoach().name
  const fromVoice = this._fromVoice; this._fromVoice = false
  const talk = this.state.voiceOut || fromVoice, after = this._afterSpeak
  // The reply streams in: shown as it's written and, when speaking, voiced from the first sentence.
  let full = '', sess = null
  const show = (content, extra = {}) => this.setState(st => ({ chatMsgs: st.chatMsgs.slice(0, idx).concat([{ role: 'assistant', content, page: label, coach, ...extra }]), typeIdx: -1 }), () => this.chatScroll())
  let out = null, why = ''
  try {
    out = await window.claude.stream({ max_tokens: 700, system, messages: msgs.slice(-12).map(m => ({ role: m.role, content: m.content })), memory: true, page: label, quick: fromVoice }, d => {
      if (!full) { SFX.play('reply'); if (talk && Date.now() >= ttsOff) { this._afterSpeak = null; sess = speechSession.call(this, 'm' + idx, after) } }
      full += d; show(full); sess?.push(d)
    })
  } catch (e) { why = e?.message || '' }
  const final = (out || full || why || 'I couldn\'t reach the coach just now. Try again in a moment.').trim()
  const replaced = !!out && !!full && !out.startsWith(full.trim().slice(0, 40)) // refusal: the server's text replaces the partial one
  if (replaced) { stopSpeech(); sess = null }
  show(final, { err: !out && !full })
  this.setState({ chatBusy: false })
  try { localStorage.setItem('im4-chat', JSON.stringify(this.state.chatMsgs.slice(0, idx).concat([{ role: 'assistant', content: final, page: label, err: !out && !full, coach }]).slice(-40))) } catch (e) {}
  if (sess) sess.end()
  else if (talk && (out || full)) { this._afterSpeak = after; this.speak(final, 'm' + idx) }
}

// iOS doesn't shrink the page for the on-screen keyboard: track the visible area so the phone chat panel sits above
// the keyboard (var(--vvt)/var(--vvh) in its layout) instead of behind it, and drop the bottom safe-area padding then.
if (typeof window !== 'undefined' && window.visualViewport) {
  const vv = window.visualViewport, root = document.documentElement.style
  const update = () => {
    root.setProperty('--vvh', vv.height + 'px'); root.setProperty('--vvt', vv.offsetTop + 'px')
    if (vv.height < window.innerHeight * 0.8) root.setProperty('--vvsb', '8px'); else root.removeProperty('--vvsb')
    window.dispatchEvent(new Event('halolabs:viewport'))
  }
  vv.addEventListener('resize', update); vv.addEventListener('scroll', update); update()
}

/** Restore saved state for today (checklists and the brief only count for the day they were made). */
function componentDidMount() {
  const D = this.props.D
  let saved = null; try { saved = localStorage.getItem('im3-page') } catch (e) {}
  if (saved && PAGES.some(p => p.id === saved)) this.setState({ page: saved })
  const read = k => { try { return JSON.parse(localStorage.getItem(k) || 'null') } catch (e) { return null } }
  this.setState({ pchk: read('im4-pchk'), wchk: read('im4-wchk'), diet: read('im4-diet') || {}, al: read('im4-al') || {}, inj: read('im4-inj') || [], supps: readSupps(), injF: { ...this.state.injF, date: D.today } })
  this._baseMount()
  this._vvScroll = () => { if (this.state.chatOpen) this.chatScroll() }; window.addEventListener('halolabs:viewport', this._vvScroll)
  window.addEventListener('halolabs:coach', () => this.forceUpdate())
  this._vKey = (e) => { if (e.key === 'Escape' && this.state.vOn) this.voiceClose() }; window.addEventListener('keydown', this._vKey)
  const bc = read('im4-brief'); if (bc && bc.date === D.today) this.setState({ brief: bc })
}

Object.assign(Component.prototype, {
  verdict, command, weekData, recovery, rwData, fuel, protoData, dietData, foodData, suppData, chatSystem, training, liftData, strainData, injData, scans, blood, vo2Data, renderVals, genBrief, chatContext, chatSend, componentDidMount,
})

// ---- Voice: ElevenLabs speech-to-text for listening, ElevenLabs (or the device's voice) for replies -------------
// Hold the mic: push-to-talk. Tap it: conversation mode (listen → transcribe → Coach answers out loud → listen
// again), until tapped again or the chat closes. The mic is off while Coach speaks so it doesn't hear itself.

const TAP_MS = 350

// Coach voice via /api/tts (ElevenLabs, the same voice on every device); the device's own voice if that fails
// (no key, no credits left).
// One shared <audio> element, unlocked during a tap (iOS only plays audio started from a gesture).
let coachAudio = null, ttsOff = 0, deviceSince = 0 // deviceSince: when the device voice started speaking (0 = not speaking)
let speechTok = null // the reply being spoken; stopSpeech() clears it so pending parts are dropped
let speechNow = null // the part playing: { before, n } = words spoken before it and words in it (the voice view reveals in step)
const SILENT = (() => { // 0.05 s of silence as a WAV data URI
  const n = 400, b = new DataView(new ArrayBuffer(44 + n * 2)), w = (o, t) => [...t].forEach((c, i) => b.setUint8(o + i, c.charCodeAt(0)))
  w(0, 'RIFF'); b.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); b.setUint32(16, 16, true); b.setUint16(20, 1, true); b.setUint16(22, 1, true)
  b.setUint32(24, 8000, true); b.setUint32(28, 16000, true); b.setUint16(32, 2, true); b.setUint16(34, 16, true); w(36, 'data'); b.setUint32(40, n * 2, true)
  return 'data:audio/wav;base64,' + btoa(String.fromCharCode(...new Uint8Array(b.buffer)))
})()
function unlockAudio() {
  try { if (!coachAudio) coachAudio = new Audio(); coachAudio.src = SILENT; coachAudio.play().catch(() => {}) } catch (e) {}
}
function stopSpeech() {
  deviceSince = 0; speechNow = null; speechTok = null
  try { speechSynthesis.cancel() } catch (e) {}
  try { if (coachAudio) { coachAudio.pause(); coachAudio.onended = coachAudio.onerror = null } } catch (e) {}
}

function deviceSpeak(text, id, after) {
  try {
    const ss = window.speechSynthesis
    if (!ss) { after?.(); return }
    ss.cancel()
    const u = new SpeechSynthesisUtterance(text.replace(/•/g, '').replace(/\s+/g, ' '))
    u.rate = 1.04; u.pitch = 0.95
    const vs = ss.getVoices(), pick = vs.find(x => /en-GB/.test(x.lang) && /Daniel|Male|Arthur|George/i.test(x.name)) || vs.find(x => /en-GB/.test(x.lang)) || vs.find(x => /^en/.test(x.lang))
    if (pick) u.voice = pick
    u.onend = u.onerror = () => { this.setState(s => (s.speaking === id ? { speaking: null } : null)); after?.() }
    this.setState({ speaking: id })
    deviceSince = performance.now(); const end0 = u.onend; u.onend = u.onerror = (e) => { deviceSince = 0; end0(e) }
    ss.speak(u)
  } catch (e) { after?.() }
}

/** Parts of a reply for text-to-speech. Each part is synthesized while the one before it plays, so the first part is
 *  short (speech starts in a second or two) and each later part may be a bit longer than the one before it. Breaks
 *  only at sentence ends or commas followed by a space ("74.4" stays whole); tiny pieces join the next one. */
function speechParts(t) {
  const units = []
  for (const s of t.split(/(?<=[.!?]["')\]]?)\s+/).filter(Boolean)) {
    if (s.length <= 90) { units.push(s); continue }
    let x = s // long sentence: break at commas
    while (x.length > 90) { const k = x.lastIndexOf(', ', 90); if (k < 25) break; units.push(x.slice(0, k + 1)); x = x.slice(k + 2) }
    units.push(x)
  }
  const out = []; let carry = ''
  for (const u0 of units) {
    const u = carry ? carry + ' ' + u0 : u0
    if (u.length < 25) { carry = u; continue } // "Today." goes with what follows it
    carry = ''
    const last = out.at(-1), grow = out.length >= 2 && last.length + u.length + 1 <= Math.min(400, Math.round(out.at(-2).length * 1.15) + 20)
    if (grow) out[out.length - 1] = last + ' ' + u; else out.push(u)
  }
  if (carry) { if (out.length) out[out.length - 1] += ' ' + carry; else out.push(carry) }
  return out
}

async function ttsAudio(text) {
  try {
    const r = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, coach: activeCoach().id }) })
    if (!r.ok) throw new Error(String(r.status))
    return URL.createObjectURL(await r.blob())
  } catch (e) { return null }
}

const wordCount = (t) => t.split(/\s+/).filter(Boolean).length

/** Speak a reply while it is still being written: push(text) adds what has arrived, end() marks the end. Complete
 *  sentences become parts; each part's audio is made while the previous one plays, so speech starts after the first
 *  sentence. ElevenLabs voices get one part when the whole text is known up front (better phrasing). If the server
 *  has no voice, the device voice says the rest once the text is complete. */
function speechSession(id, after) {
  stopSpeech()
  if (!coachAudio) coachAudio = new Audio()
  const tok = speechTok = {}, live = () => speechTok === tok
  this.setState({ speaking: id })
  const S = { buf: '', parts: [], got: [], chain: Promise.resolve(null), ended: false, next: 0, waiting: false, before: 0, deviceFrom: -1, done: false }
  const finish = () => { if (S.done) return; S.done = true; speechNow = null; if (live()) speechTok = null; this.setState(st => (st.speaking === id ? { speaking: null } : null)); after?.() }
  const toDevice = (k) => {
    S.got.slice(k + 1).forEach(g => g.then(u => u && URL.revokeObjectURL(u)))
    S.deviceFrom = k; speechNow = null
    if (S.ended) { S.done = true; deviceSpeak.call(this, (S.parts.slice(k).join(' ') + ' ' + S.buf).trim(), id, after) }
  }
  const play = async (k) => {
    S.waiting = false
    const url = await S.got[k]
    if (!live()) { if (url) URL.revokeObjectURL(url); return }
    if (!url) { if (k === 0) ttsOff = Date.now() + 5 * 60_000; return toDevice(k) }
    const n = wordCount(S.parts[k]); speechNow = { before: S.before, n }
    coachAudio.onended = coachAudio.onerror = () => { URL.revokeObjectURL(url); coachAudio.onended = coachAudio.onerror = null; S.before += n; advance(k + 1) }
    coachAudio.src = url
    coachAudio.play().catch(() => { coachAudio.onended = coachAudio.onerror = null; URL.revokeObjectURL(url); toDevice(k) })
  }
  const advance = (k) => {
    if (!live()) return
    S.next = k
    if (k < S.parts.length) play(k); else if (S.ended) finish(); else S.waiting = true
  }
  const add = (p) => {
    const k = S.parts.length; S.parts.push(p)
    S.got[k] = S.chain = S.chain.then(() => (live() && S.deviceFrom < 0 ? ttsAudio(p) : null))
    if (k === 0) advance(0); else if (S.waiting && S.next === k) play(k)
  }
  const cut = (final) => {
    let end = -1; const re = /[.!?]["')\]]?\s+/g; let m
    while ((m = re.exec(S.buf))) end = m.index + m[0].length
    if (final) end = S.buf.length
    const chunk = S.buf.slice(0, Math.max(0, end)).replace(/\s+/g, ' ').trim()
    if (!chunk || (!final && chunk.length < 25)) return // short heads ("Today.") wait for what follows
    S.buf = S.buf.slice(end)
    if (final && !S.parts.length) return add(chunk)
    for (const p of speechParts(chunk)) add(p)
  }
  return {
    push: (d) => { if (!live() || S.ended) return; S.buf += d.replace(/•/g, ''); if (S.deviceFrom < 0) cut(false) },
    end: () => {
      if (S.ended) return; S.ended = true
      if (!live()) return
      if (S.deviceFrom >= 0) return toDevice(S.deviceFrom)
      cut(true)
      if (!S.parts.length) finish(); else if (S.waiting && S.next >= S.parts.length) finish()
    },
  }
}

function speakText(text, id, after) {
  const clean = text.replace(/•/g, '').replace(/\s+/g, ' ').trim()
  if (Date.now() < ttsOff || !clean) { stopSpeech(); return deviceSpeak.call(this, text, id, after) }
  const s = speechSession.call(this, id, after); s.push(clean); s.end()
}

function speak(text, id) {
  if (this.state.speaking === id) { stopSpeech(); this.setState({ speaking: null }); return }
  unlockAudio()
  const after = this._afterSpeak; this._afterSpeak = null
  speakText.call(this, text, id, after)
}

async function voiceTurn(text) {
  if (!text) { if (this.state.convo) this.listenTurn(); return }
  this._fromVoice = true
  if (this.state.convo) this._afterSpeak = () => { if (this.state.convo && this.state.chatOpen) this.listenTurn() }
  await this.chatSend(text)
  // chatSend speaks the reply (fromVoice) and _afterSpeak resumes listening; if nothing was spoken, resume now.
  if (this.state.convo && this._afterSpeak && !this.state.speaking) { const f = this._afterSpeak; this._afterSpeak = null; f() }
}

async function finishRecording() {
  const rec = this._rec; this._rec = null
  if (!rec) return
  this.setState({ listening: false, heard: '' })
  const wav = await rec.stop()
  if (!wav) { if (this.state.convo) this.listenTurn(); return }
  this.setState({ transcribing: true })
  try {
    const text = await transcribe(wav)
    this.setState({ transcribing: false })
    await this.voiceTurn(text.trim())
  } catch (e) {
    this.setState({ transcribing: false, convo: false, micErr: e.message })
    if (/ElevenLabs API key/.test(e.message)) { this._voiceReady = false; this.voiceUnavailable() }
  }
}

async function listenTurn() {
  if (this._rec || this.state.chatBusy) return
  if (!(await this.ensureVoice())) return
  try {
    SFX.play('micOn')
    this._rec = await startRecording({ endOnSilenceMs: END_OF_TURN_MS, onEnd: () => this.finishRecording() })
    this.setState({ listening: true, heard: 'Listening…', micErr: null })
  } catch (e) {
    this.setState({ listening: false, convo: false, micErr: e.name === 'NotAllowedError' ? 'Microphone access was blocked. Allow it in your browser settings to talk to Coach.' : 'Couldn\'t start the microphone.' })
  }
}

const VOICE_DOWN = 'Voice isn\'t set up yet: add an ElevenLabs API key in Settings → APIs. You can still type your question.'

/** Say why voice can't work, as a Coach message in the chat (the footer is easy to miss). */
function voiceUnavailable() {
  const msgs = this.state.chatMsgs, last = msgs[msgs.length - 1]
  if (last?.content === VOICE_DOWN) return
  SFX.play('micOff')
  this.setState({ chatMsgs: msgs.concat([{ role: 'assistant', content: VOICE_DOWN, page: 'Voice', err: true }]), micErr: VOICE_DOWN, convo: false, listening: false }, () => this.chatScroll())
}

async function ensureVoice() {
  if (this._voiceReady !== true) this._voiceReady = await voiceReady()
  if (!this._voiceReady) this.voiceUnavailable()
  return this._voiceReady
}

async function micStart() {
  this._pressAt = performance.now()
  if (this.state.convo || this._rec) return // a tap while conversing ends it (handled on release)
  stopSpeech(); unlockAudio()
  if (!(await this.ensureVoice())) { this._pressAt = null; return }
  if (this._pressAt == null) return // already released: it was a tap, handled in micStop
  startRecording({}).then(rec => {
    if (this._pressAt == null && !this._pushToTalk) { rec.cancel(); return } // released while the mic was starting
    this._rec = rec; this._pushToTalk = true; SFX.play('micOn'); this.setState({ listening: true, heard: 'Listening… release to send', micErr: null })
  }).catch(e => this.setState({ micErr: e.name === 'NotAllowedError' ? 'Microphone access was blocked. Allow it in your browser settings to talk to Coach.' : 'Couldn\'t start the microphone.' }))
}

function micStop() {
  if (this._pressAt == null) return // release already handled (pointerup and pointerleave both fire)
  const tap = performance.now() - this._pressAt < TAP_MS
  this._pressAt = null
  if (this.state.convo) { this.stopConversation(); return }
  if (tap) {
    // Tap: start a conversation. Unlock speech output inside this gesture (iOS needs that).
    if (this._rec) { this._rec.cancel(); this._rec = null }
    try { speechSynthesis.speak(new SpeechSynthesisUtterance('')) } catch (e) {}
    unlockAudio()
    this.setState({ convo: true, listening: false, micErr: null }, () => this.listenTurn())
    return
  }
  if (this._pushToTalk) { this._pushToTalk = false; SFX.play('micOff'); this.finishRecording() }
}

function stopConversation() {
  if (this._rec) { this._rec.cancel(); this._rec = null }
  this._afterSpeak = null
  stopSpeech()
  SFX.play('micOff')
  this.setState({ convo: false, listening: false, heard: '', speaking: null })
}

const baseChatData = Component.prototype.chatData
function chatData(P) {
  const o = baseChatData.call(this, P), c = o.chat, s = this.state
  if (s.chatOpen === false && s.convo) setTimeout(() => this.stopConversation())
  const on = s.convo || s.listening
  c.micTitle = s.convo ? 'End conversation' : 'Hold to talk, tap for a conversation'
  c.micBc = on ? 'oklch(0.82 0.13 210 / 0.8)' : c.micBc; c.micBg = on ? 'oklch(0.82 0.13 210 / 0.2)' : c.micBg; c.micFg = on ? A : c.micFg
  c.foot = s.micErr || (s.transcribing ? 'Transcribing…' : s.convo ? (s.speaking ? activeCoach().name + ' is speaking · tap the mic to end' : s.chatBusy ? activeCoach().name + ' is thinking…' : 'Conversation on · just talk · tap the mic to end')
    : s.listening ? 'Release to send' : 'Hold the mic to talk · tap it for a conversation · ' + activeCoach().name + ' can be wrong. Not medical advice.')
  return o
}

Object.assign(Component.prototype, { speak, voiceTurn, finishRecording, listenTurn, micStart, micStop, stopConversation, chatData, voiceUnavailable, ensureVoice })

// ---- Voice mode (full-screen): listen and speak with ElevenLabs, answer briefly ---------------------------------
const VOICE_RULES = '\n\nVOICE MODE: your reply will be spoken aloud. Answer in 2 to 4 short conversational sentences, under 70 words. No bullets, no lists, no symbols. Say numbers naturally.'

function voiceSetMode(m) { VOICE.mode = m; if (m !== 'listening') VOICE.level = 0; this.setState({ vMode: m }) }

async function voiceOpen() {
  unlockAudio() // inside the tap: iOS only plays audio started from a gesture
  if (this.state.convo) this.stopConversation()
  stopSpeech(); SFX.play('open')
  this._vClosed = false
  this.setState({ vOn: true, vHeard: '', vReply: '', vErr: null, vMuted: false })
  if (!(await voiceReady())) { this.voiceSetMode('idle'); this.setState({ vErr: 'Voice isn\'t set up: add an ElevenLabs API key in Settings → APIs.' }); return }
  this.voiceListen()
}

function voiceClose() {
  this._vClosed = true
  if (this._vRec) { this._vRec.cancel(); this._vRec = null }
  clearInterval(this._vTick); stopSpeech()
  SFX.play('close'); this.voiceSetMode('idle'); this.setState({ vOn: false, speaking: null })
}

async function voiceListen() {
  if (this._vClosed || !this.state.vOn || this._vRec) return
  if (this.state.vMuted) { this.voiceSetMode('idle'); return }
  try {
    this._vRec = await startRecording({ endOnSilenceMs: END_OF_TURN_MS, onLevel: l => { VOICE.level = l }, onEnd: () => this.voiceFinish() })
    if (this._vClosed) { this._vRec.cancel(); this._vRec = null; return }
    this.voiceSetMode('listening'); this.setState({ vHeard: '', vErr: null })
  } catch (e) {
    this._vRec = null; this.voiceSetMode('idle')
    this.setState({ vErr: e.name === 'NotAllowedError' ? 'Microphone access is blocked. Allow it in your browser settings to talk to Coach.' : 'Couldn\'t start the microphone.' })
  }
}

async function voiceFinish() {
  const rec = this._vRec; this._vRec = null
  if (!rec) return
  const wav = await rec.stop()
  if (this._vClosed) return
  if (!wav) { this.voiceListen(); return } // nothing said: keep listening
  this.voiceSetMode('thinking'); this.setState({ vHeard: '…' })
  let q = ''
  try { q = (await transcribe(wav)).trim() } catch (e) { this.voiceSetMode('idle'); this.setState({ vErr: e.message, vHeard: '' }); return }
  if (this._vClosed) return
  if (!q) { this.setState({ vHeard: '' }); this.voiceListen(); return }
  this.setState({ vHeard: q }); this.voiceAsk(q)
}

async function voiceAsk(q) {
  const page = PAGES.some(p => p.id === this.state.page) ? this.state.page : 'command', label = PAGES.find(p => p.id === page).label
  const msgs = this.state.chatMsgs.concat([{ role: 'user', content: q, page: label }])
  SFX.play('send'); this.voiceSetMode('thinking'); this.setState({ vReply: '', chatMsgs: msgs })
  // Streamed: speech starts after Claude's first sentence while the rest is still being written.
  let full = '', sess = null, reveal = null
  const gone = () => this._vClosed || !this.state.vOn
  const afterSpeak = () => { reveal?.(); if (!this._vClosed && this.state.vOn && this.state.vMode === 'speaking') this.voiceListen() }
  let out = null, why = ''
  try {
    out = await window.claude.stream({ max_tokens: 300, system: this.chatSystem() + VOICE_RULES, messages: msgs.slice(-12).map(m => ({ role: m.role, content: m.content })), memory: true, page: label, quick: true }, d => {
      if (gone()) return
      if (!full && Date.now() >= ttsOff) { this.voiceSetMode('speaking'); reveal = this.voiceReveal(() => full); sess = speechSession.call(this, 'voice', afterSpeak) }
      full += d; sess?.push(d)
    })
  } catch (e) { why = e?.message || '' }
  if (gone()) { stopSpeech(); return }
  const text = (out || full || why || 'Sorry, I couldn\'t reach the coach just now. Try again in a moment.').trim()
  const next = msgs.concat([{ role: 'assistant', content: text, page: label, err: !out && !full, coach: activeCoach().name }])
  try { localStorage.setItem('im4-chat', JSON.stringify(next.slice(-40))) } catch (e) {}
  this.setState({ chatMsgs: next, typeIdx: -1 })
  const replaced = !!out && !!full && !out.startsWith(full.trim().slice(0, 40)) // refusal: the server's text replaces the partial one
  if (sess && !replaced) { full = text; sess.end(); return }
  stopSpeech(); this.voiceSay(text)
}

/** Reveal the reply word by word in step with the voice; text() is what has arrived so far. Returns "show it all". */
function voiceReveal(text) {
  let shown = 0
  clearInterval(this._vTick)
  this._vTick = setInterval(() => {
    const words = text().split(/\s+/).filter(Boolean), a = coachAudio, p = speechNow
    let n = shown
    if (p && a && !a.paused && Number.isFinite(a.duration) && a.duration > 0) n = Math.ceil(p.before + a.currentTime / a.duration * p.n)
    else if (deviceSince) n = Math.ceil((performance.now() - deviceSince) / 1000 * 2.7) // device voice: ~2.7 words/s
    if (n > shown) { shown = Math.min(words.length, n); VOICE.pulse = performance.now(); this.setState({ vReply: words.slice(0, shown).join(' ') }) }
  }, 120)
  return () => { clearInterval(this._vTick); this.setState({ vReply: text() }) }
}

/** Speak a complete reply (errors, refusals) with the same word-by-word reveal. */
function voiceSay(text) {
  this.voiceSetMode('speaking'); this.setState({ vReply: '' })
  const reveal = this.voiceReveal(() => text)
  speakText.call(this, text, 'voice', () => { reveal(); if (!this._vClosed && this.state.vOn && this.state.vMode === 'speaking') this.voiceListen() })
}

function voiceTap() {
  const m = this.state.vMode
  if (m === 'speaking') { clearInterval(this._vTick); stopSpeech(); this.setState({ speaking: null }); this.voiceSetMode('idle'); this.voiceListen() }
  else if (m === 'listening') this.voiceFinish() // send now
  else if (m === 'idle') { unlockAudio(); this.setState({ vMuted: false, vErr: null }, () => this.voiceListen()) }
}

function voiceMute() {
  const muted = !this.state.vMuted
  this.setState({ vMuted: muted }, () => {
    // Muting while you talk sends what was said (people tap Mute when they're done); the mic stays off afterwards.
    if (muted) { if (this._vRec) this.voiceFinish(); else if (this.state.vMode === 'listening') this.voiceSetMode('idle') }
    else if (this.state.vMode === 'idle') this.voiceListen()
  })
}

function voiceVals() {
  const m = this.state.vMode || 'idle', muted = this.state.vMuted
  const ST = { listening: ['Listening', A], thinking: ['Thinking', W], speaking: ['Speaking', G], idle: [muted ? 'Mic off' : 'Paused', T3] }[m]
  const page = PAGES.some(p => p.id === this.state.page) ? this.state.page : 'command'
  const mic = React.createElement('svg', { key: 'mic', width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' },
    React.createElement('rect', { x: 9, y: 3, width: 6, height: 11, rx: 3 }), React.createElement('path', { d: 'M5 11a7 7 0 0 0 14 0M12 18v3' }), muted ? React.createElement('path', { d: 'M4 4l16 16' }) : null)
  return {
    vOn: !!this.state.vOn, vSt: { t: ST[0], c: ST[1] }, vPage: PAGES.find(p => p.id === page).label,
    vBlob: React.createElement(VoiceBlob, { key: 'vblob' }),
    vYou: this.state.vHeard && this.state.vHeard !== '…' ? '“' + this.state.vHeard + '”' : m === 'listening' ? 'Go ahead, I\'m listening…' : this.state.vHeard === '…' ? 'Transcribing…' : '',
    vCoach: this.state.vReply || (m !== 'thinking' && m !== 'speaking' && !this.state.vHeard ? 'Ask anything about today, your training, labs or the plan.' : ''),
    vErr: this.state.vErr || '',
    vHint: m === 'speaking' ? 'Tap the orb to interrupt' : m === 'listening' ? 'Pause when you\'re done, or tap the orb to send' : m === 'thinking' ? 'Working on it…' : 'Tap the orb to talk',
    vMicIcon: mic, vMuteT: muted ? 'Turn mic on' : 'Turn mic off',
    vMuteB: muted ? 'oklch(1 0 0 / 0.25)' : 'oklch(1 0 0 / 0.12)', vMuteBg: muted ? 'oklch(1 0 0 / 0.14)' : 'oklch(1 0 0 / 0.04)', vMuteC: muted ? T1 : T2,
    voiceOpen: () => this.voiceOpen(), voiceClose: () => this.voiceClose(), voiceTapOrb: () => this.voiceTap(), voiceMute: () => this.voiceMute(),
  }
}

Object.assign(Component.prototype, { voiceSetMode, voiceOpen, voiceClose, voiceListen, voiceFinish, voiceAsk, voiceReveal, voiceSay, voiceTap, voiceMute, voiceVals })

// ---- Roadmap (v4 layout in src/app/RoadmapView.tsx) ------------------------------------------------------------
const RM_ST = { completed: ['Done', G], started: ['Started', A], in_progress: ['In progress', A], upcoming: ['Upcoming', W], planned: ['Planned', T3],
  researching: ['Researching', T3], goal: ['Goal', A], optional: ['Optional', W], registered: ['Registered', G] }
const rmSt = (s) => RM_ST[s] ?? [String(s).replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()), T3]
const chipB = (c) => (c === T3 ? 'oklch(1 0 0 / 0.12)' : c.replace(')', ' / 0.4)'))
const BIG = (m) => m.big
const laneOf = (name) => (/swim/i.test(name) ? 'Swim' : /bike|cycl|trainer|zwift|ride|brick/i.test(name) ? 'Bike' : /\b5k\b|10k|run|marathon/i.test(name) ? 'Run' : /75 hard|strength|lift|deload/i.test(name) ? 'Strength' : 'Phase')

// A target in one line: "Target ≥ 47 ml/kg/min · now 46 (you entered, Nov 1, 2026)" / "Reached: 47 …".
const tgtLine = (t) => (t.reached ? `Reached: ${t.current.valueL} (target ${t.sym ? t.sym + ' ' : ''}${t.valueL}).`
  : `Target ${t.sym ? t.sym + ' ' : ''}${t.valueL} · ` + (t.current ? `now ${t.current.valueL} (${t.current.source}, ${t.current.dayL})` : 'no current value yet') + '.')
const PACE = { reached: ['Reached', G], on_pace: ['On pace', G], behind: ['Behind pace', W], no_data: ['No data yet', T3], unknown: ['', T3] }

function roadmapData() {
  const D = this.props.D, p = D.plan, t = D.training
  if (!p) return { rmEmpty: true }
  const today = D.today, g = p.goal
  const dated = p.milestones.filter(m => m.start)
  const startDay = (dated.reduce((a, m) => (m.start < a ? m.start : a), today)).slice(0, 7) + '-01'
  const endDay = g.date ?? dated.at(-1)?.end ?? today
  const t0 = Date.parse(startDay + 'T12:00:00Z'), span = Date.parse(endDay + 'T12:00:00Z') - t0 || 1
  const x = (day) => ((Date.parse(day + 'T12:00:00Z') - t0) / span) * 100
  const pct = (v) => Math.max(0, Math.min(100, v)).toFixed(2) + '%'
  const bar = (a, b, label, kind) => ({ _a: Math.max(0, x(a)), _b: Math.min(100, x(b)), pad: '0 8px', t: label, l: pct(x(a)), w: pct(Math.max(0.8, Math.min(100, x(b)) - Math.max(0, x(a)))), // clipped to the season
    bg: kind === 'done' ? 'oklch(0.78 0.15 160 / 0.22)' : kind === 'now' ? 'oklch(0.82 0.13 210 / 0.32)' : kind === 'tbd' ? 'transparent' : kind === 'race' ? 'oklch(0.82 0.13 210 / 0.5)' : 'oklch(0.82 0.13 210 / 0.12)',
    b: kind === 'tbd' ? '1px dashed oklch(0.82 0.13 210 / 0.4)' : kind === 'now' ? '1px solid oklch(0.82 0.13 210 / 0.6)' : '1px solid transparent', fg: kind === 'now' || kind === 'race' ? T1 : T2 })
  const pin = (day, label, c) => ({ _x: x(day), l: pct(x(day)), t: label, c: c || A })
  const kindOf = (m) => (m.status === 'completed' ? 'done' : m.start <= today && today <= m.end ? 'now' : 'plan')
  const nextDay = d => new Date(Date.parse(d + 'T12:00:00Z') + 864e5).toISOString().slice(0, 10)

  // Season plan lanes
  const lanes = ['Phase', 'Swim', 'Bike', 'Run', 'Strength'].map(k => ({ k, bars: [], pins: [] }))
  const lane = (k) => lanes.find(l => l.k === k)
  // Range milestones per lane, read as a sequence: same dates merge into one bar, and a bar that overlaps the
  // previous one starts where it ends (the roadmap's ranges overlap, which would print labels on top of each other).
  const seq = {}
  for (const m of dated) {
    const L = lane(m.name === g.event ? 'Phase' : laneOf(m.name))
    if (m.start !== m.end && !/swimming endurance/i.test(m.name)) { (seq[L.k] ??= []).push(m); continue }
    if (m.start === m.end) L.pins.push(pin(m.start, `${m.name} · ${fmtDay(m.start, { month: 'short', day: 'numeric', year: 'numeric' })}`, m.status === 'completed' ? G : m.big ? (m.name === g.event ? A : W) : A))
  }
  for (const [k, ms] of Object.entries(seq)) {
    const merged = []
    for (const m of ms.sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end))) {
      const same = merged.find(x => x.start === m.start && x.end === m.end)
      if (same) { same.name += ' + ' + m.name.replace(/^(Set up|Build) /, s0 => s0.toLowerCase()); continue }
      merged.push({ ...m })
    }
    let prevEnd = null
    for (const m of merged) {
      const start = prevEnd && m.start <= prevEnd ? nextDay(prevEnd) : m.start
      if (start <= m.end) lane(k).bars.push(bar(start, m.end, m.name, kindOf(m)))
      prevEnd = m.end > (prevEnd ?? '') ? m.end : prevEnd
    }
  }
  { let prevEnd = null
    for (const ph of p.swimming.phases.filter(s0 => s0.start)) {
      const start = prevEnd && ph.start <= prevEnd ? nextDay(prevEnd) : ph.start
      lane('Swim').bars.push(bar(start, ph.end, ph.focus, today >= start && today <= ph.end ? 'now' : 'plan'))
      prevEnd = ph.end
    } }
  const isRun = (m) => /\b5k\b|10k|half|marathon|\brun\b/i.test(m.name)
  const fiveK = p.milestones.find(m => m.big && m.name !== g.event && m.start && isRun(m))
  if (p.running.ladder.length > 1 && g.date) lane('Run').bars.push(bar(fiveK?.end ?? today, g.date, p.running.ladder.slice(1).map(l => l.k).join(' → '), 'tbd'))
  if (p.deload) lane('Strength').bars.push(bar(p.deload.start, p.deload.end, 'Deload', p.deload.active ? 'now' : 'plan'))
  const preserve = p.principles.find(x => /strength/i.test(x))
  if (preserve && g.date) lane('Strength').bars.push(bar(p.deload?.end ?? today, g.date, preserve, 'plan'))
  // A race pin near the start of a bar would cover its label: start the label just after the pin.
  for (const L of lanes) for (const b of L.bars) { const pn = L.pins.find(q => q._x >= b._a && q._x <= Math.min(b._b, b._a + 12))
    if (pn) b.pad = `0 8px 0 calc(${(pn._x - b._a).toFixed(2)}% + 12px)` }
  const months = []
  for (let d = new Date(t0); d.getTime() <= t0 + span; d.setUTCMonth(d.getUTCMonth() + 1)) months.push({ t: d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }), l: pct(x(d.toISOString().slice(0, 10))) })

  // Coming up next: dated events still ahead, nearest first
  const ahead = p.milestones.filter(m => m.start === m.end && m.daysTo != null && m.daysTo >= 0 && m.name !== g.event).sort((a, b) => a.daysTo - b.daysTo)
  const fast = t?.run.fastest3
  const UP = ahead.map(m => { const [st, cc] = rmSt(m.status); return { mon: fmtDay(m.start, { month: 'short' }).toUpperCase(), day: fmtDay(m.start, { day: 'numeric' }), name: m.name,
    detail: m.target ? tgtLine(m.target) : (m.targetTime ? `Goal ${m.targetTime}.` : /5k|10k|run/i.test(m.name) ? 'Goal time not set yet.' : '') + (/5k|10k|run/i.test(m.name) && fast ? ` Your fastest 3 mi+ effort is ${fast.pace}/mi.` : ''),
    count: String(m.daysTo), countU: m.daysTo === 1 ? 'day' : 'days', st, cc, cb: chipB(cc) } })
  const ui = Math.min(this.state.up ?? 0, Math.max(0, UP.length - 1)), nU = Math.max(1, UP.length)

  // Milestones with filter
  const msF = this.state.msF || 'all'
  const shown = p.milestones.filter(m => msF === 'all' || (msF === 'races' ? BIG(m) : !BIG(m)))
  const milestones = shown.map(m => { const big = BIG(m), [st, c] = rmSt(m.status), isDone = m.status === 'completed', isNow = ['started', 'in_progress', 'upcoming', 'registered'].includes(m.status)
    return { name: m.name, when: m.when + (m.daysTo != null && m.daysTo > 0 ? ` · ${m.daysTo} days` : ''), sub: m.target ? tgtLine(m.target) : '', st, cc: c, cb: chipB(c),
      dot: isDone ? G : isNow ? c : m.status === 'goal' ? A : 'oklch(0.145 0.016 262)', ring: isDone || isNow || m.status === 'goal' ? '0' : '1.5px solid oklch(1 0 0 / 0.25)',
      glow: isDone || isNow || m.status === 'goal' ? '0 0 8px ' + (isDone ? G : c) : 'none', fg: isDone ? T2 : T1, sz: big ? '13px' : '9px', ml: big ? '-1px' : '1px', pad: big ? '12px 0' : '7px 0',
      fs: big ? '15px' : '13px', ff: big ? "'Space Grotesk',system-ui,sans-serif" : 'inherit', fw: big ? 500 : 400 } })

  // This week: schedule vs what happened
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  // No training data yet: still lay out this week's dates so the roadmap's schedule shows.
  const mon = plusDays(D.today, -((new Date(`${D.today}T12:00:00Z`).getUTCDay() + 6) % 7))
  const week = (t?.weekDays ?? DAYS.map((d, i) => { const day = plusDays(mon, i); return { d, day, items: [], today: day === D.today, future: day > D.today } })).map((d, i) => {
    const ss = d.day ? plannedOn(D, d.day).sessions : [], plan = ss.map(x => x.title), sports = new Set(d.items.map(it => it.sport))
    const want = ss.map(x => x.sport).filter(s => ['strength', 'run', 'swim', 'ride', 'walk'].includes(s)), done = want.filter(s => sports.has(s)).length
    const s = d.today ? 'Today' : d.future ? '' : !want.length ? (d.items.length ? 'Active' : 'Rest') : done === want.length ? 'Done' : done ? `${done} of ${want.length}` : d.items.length ? 'Other activity' : 'Missed'
    return { d: DAYS[i], dc: d.today ? A : T3, bg: d.today ? 'oklch(0.82 0.13 210 / 0.08)' : 'transparent', b: d.today ? '1px solid oklch(0.82 0.13 210 / 0.3)' : '1px solid transparent',
      items: ss.map(x => ({ t: x.title, bg: x.sport === 'rest' ? 'transparent' : 'oklch(1 0 0 / 0.05)', fg: !d.today && !d.future ? T3 : x.sport === 'rest' ? T3 : T1 })),
      s, sc: s === 'Today' ? A : s === 'Missed' ? R : s === 'Done' || s === 'Active' ? G : W }
  })

  // Run ladder
  const longest = t?.longest.run?.v ?? 0
  const ladder = p.running.ladder.map((l, i) => { const v = Math.min(100, longest / l.mi * 100)
    return { k: l.k, mi: l.mi + ' mi', when: i === 0 && fiveK ? fmtDay(fiveK.start) : i === 1 ? 'Next' : i === p.running.ladder.length - 1 && g.date ? 'Race day' : '', pct: v.toFixed(0) + '%', c: v >= 100 ? G : A, glow: v >= 100 ? '0 0 8px ' + G : 'none' } })

  // Progress to race: monthly longest vs a straight-line build to race distance
  const monthsAhead = []
  for (let d = new Date(Date.parse(today.slice(0, 7) + '-15T12:00:00Z')), i = -2; d.getTime() <= Date.parse((g.date ?? today) + 'T12:00:00Z') + 30 * 864e5 && monthsAhead.length < 14; i++) {
    const dd = new Date(Date.parse(today.slice(0, 7) + '-15T12:00:00Z')); dd.setUTCMonth(dd.getUTCMonth() + i); monthsAhead.push(dd.toISOString().slice(0, 7))
    if (dd.toISOString().slice(0, 7) >= (g.date ?? today).slice(0, 7)) break
  }
  const curYm = today.slice(0, 7)
  const ladderGoals = p.legs.map(L => {
    const key = L.k === 'Swim' ? 'swim' : L.k === 'Bike' ? 'ride' : 'run', mx = L.goal * 1.08
    const now = t?.monthlyLongest[curYm]?.[key] ?? 0, future = monthsAhead.filter(m => m > curYm), n = future.length
    return { k: `Longest ${L.k.toLowerCase()} · ${L.goal.toLocaleString()} ${L.unit}`, nc: T3,
      note: L.done >= L.goal ? 'Race distance done' : `${Math.round(L.done / L.goal * 100)}% of race distance` + (L.day ? ` · best ${fmtDay(L.day, { month: 'short', year: 'numeric' })}` : ''),
      bars: monthsAhead.map(ym => { const label = fmtDay(ym + '-15', { month: 'short' })
        if (ym <= curYm) { const d0 = t?.monthlyLongest[ym]?.[key] ?? 0
          return { l: label, t: `${label} · ${d0.toLocaleString()} ${L.unit}`, h: Math.max(3, d0 / mx * 100) + '%', c: A, bd: '0', glow: '0 0 8px oklch(0.82 0.13 210 / 0.4)' } }
        const k = future.indexOf(ym) + 1, target = Math.round((now + (L.goal - now) * k / n) * 10) / 10
        return { l: label, t: `${label} · target ${target.toLocaleString()} ${L.unit}`, h: Math.max(3, target / mx * 100) + '%', c: 'transparent', bd: '1px dashed oklch(0.82 0.13 210 / 0.45)', glow: 'none' } }) }
  })

  // Aerobic efficiency (runs with WHOOP heart rate)
  const er = t?.effRuns ?? [], fmtP = s => Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0')
  const sp = er.map(r => 3600 / r.est), lo = Math.min(...sp) * 0.97, hi = Math.max(...sp)
  const avg3 = xs => xs.reduce((a, r) => a + r.est, 0) / Math.max(1, xs.length)
  const eff = er.length ? { now: fmtP(avg3(er.slice(-3))), delta: (avg3(er.slice(0, 3)) - avg3(er.slice(-3)) >= 0 ? '−' : '+') + Math.abs(Math.round(avg3(er.slice(0, 3)) - avg3(er.slice(-3)))) + ` s/mi since ${er[0].d}`,
    bars: er.map((r, i) => ({ l: r.d.replace(/^(\w{3}) /, (_, m) => m[0]), t: `${r.d} · ${fmtP(r.est)}/mi at 140 (ran ${fmtP(r.paceS)} at ${r.hr} bpm)`, h: Math.round(10 + (sp[i] - lo) / Math.max(1e-6, hi - lo) * 85) + '%', c: i === er.length - 1 ? A : AD, bd: '0', glow: i === er.length - 1 ? AGLOW : 'none' })) }
    : { now: '—', delta: 'Needs runs with heart rate', bars: [] }

  // Race prep tabs: the next race and the goal race
  // Race prep tabs: every dated race still ahead, then the goal race
  const races = [...p.milestones.filter(m => m.big && m.name !== g.event && m.start === m.end && m.daysTo != null && m.daysTo >= 0).sort((a, b) => a.daysTo - b.daysTo),
    ...(g.date && !g.target ? [{ name: g.event, start: g.date, daysTo: g.daysTo, when: g.dateLabel, goal: true }] : [])] // a target goal isn't a race to prep for
  const words = (s) => s.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 3 && !/race|official/.test(w))
  // The file's "other events" note is skipped for races added or edited in the app: those edits are newer.
  const about = (m) => { const ws = words(m.name)
    return [...(m.added || m.edited ? [] : p.otherEvents).filter(e => ws.some(w => e.k.includes(w))).map(e => ({ k: 'Roadmap', v: e.v.replace(/^\w/, c => c.toUpperCase()) + '.', c: A })),
      ...p.principles.filter(x0 => ws.some(w => x0.toLowerCase().includes(w))).map(x0 => ({ k: 'Principle', v: x0 + '.', c: A }))] }
  const prepT = races.some(r => r.name === this.state.prepT) ? this.state.prepT : races[0]?.name
  const R0 = races.find(r => r.name === prepT)
  const prep = !R0 ? { title: '', sub: '', kpis: [], rows: [] } : R0.goal
    ? { title: `${g.event} · ${g.dateLabel}`, sub: g.objective,
        kpis: [{ k: 'Days', v: String(g.daysTo) }, ...p.legs.map(l => ({ k: l.k, v: `${l.goal.toLocaleString()} ${l.unit}` }))],
        rows: [
          ...(p.swimming.current ? [{ k: 'Swim', v: `${p.swimming.current.focus} now (${p.swimming.current.period})${p.swimming.coach ? ', with your coach' : ''}.`, c: A }] : []),
          ...(p.cycling.priority ? [{ k: 'Bike', v: [p.cycling.priority, p.cycling.preferred].filter(Boolean).join('. ') + '.', c: A }] : []),
          ...(p.running.ladder.length ? [{ k: 'Run', v: `Progression ${p.running.ladder.map(l => l.k).join(' → ')}` + (p.running.comfortableMi ? `; comfortable now at ${p.running.comfortableMi} mi.` : '.'), c: A }] : []),
          ...(p.recovery.length ? [{ k: 'Recovery', v: p.recovery.join(', ') + '.', c: A }] : []),
        ] }
    : !isRun(R0) ? { title: `${R0.name} · ${fmtDay(R0.start, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}`, sub: R0.targetTime ? `Goal ${R0.targetTime}.` : '',
        kpis: [{ k: 'Status', v: rmSt(R0.status)[0] }, { k: 'Days', v: String(R0.daysTo) }, { k: 'Weeks', v: String(Math.ceil(R0.daysTo / 7)) }, ...(g.date ? [{ k: 'Before ' + g.event.replace('IRONMAN ', ''), v: Math.round(daysBetween(g.date, R0.start) / 7) + ' wks' }] : [])],
        rows: about(R0).length ? about(R0) : [{ k: 'Roadmap', v: 'No prep notes for this race in your roadmap yet.', c: T3 }] }
    : { title: `${R0.name} · ${fmtDay(R0.start, { weekday: 'long', month: 'short', day: 'numeric' })}`, sub: R0.targetTime ? `Goal ${R0.targetTime}.` : 'No goal time in your roadmap yet.',
        kpis: [{ k: 'Goal', v: R0.targetTime ?? 'Not set' }, { k: 'Fastest 3 mi+', v: fast ? fast.pace + ' /mi' : '—' }, { k: 'Comfortable', v: (p.running.comfortableMi ?? '—') + ' mi' }, { k: 'Days', v: String(R0.daysTo) }],
        rows: [{ k: 'Run days', v: p.running.days.join(' and ') || '—', c: A }, ...(p.deload?.active ? [{ k: 'This week', v: `Deload at ${Math.round(p.deload.fraction * 100)}% weights until ${fmtDay(p.deload.end)}.`, c: A }] : [])] }

  return {
    rmEmpty: false,
    hasBike: !!p.cycling.priority || !!p.cycling.preferred || p.cycling.equipment.length > 0, hasLadder: p.running.ladder.length > 0, hasProgress: p.legs.length > 0, hasPrep: races.length > 0,
    rmEditOn: !!this.state.rmEdit, rmEditOpen: () => this.setState({ rmEdit: true }), rmEditClose: () => this.setState({ rmEdit: false }),
    upcoming: UP.map(u => u), upTf: 'translateX(-' + (ui * 100) + '%)',
    upPrev: () => this.setState(s => ({ up: ((s.up ?? 0) - 1 + nU) % nU })), upNext: () => this.setState(s => ({ up: ((s.up ?? 0) + 1) % nU })),
    upDots: UP.map((u, i) => ({ pick: () => this.setState({ up: i }), w: i === ui ? '18px' : '6px', c: i === ui ? A : 'oklch(1 0 0 / 0.2)', glow: i === ui ? '0 0 8px ' + A : 'none' })),
    race: { days: g.daysTo ?? '—', weeks: g.weeksTo ?? '—' },
    goalTarget: !g.target ? null : (() => { const T0 = g.target, [pl, pc] = PACE[T0.pace] ?? PACE.unknown
      return { k: T0.label, goal: `Target ${T0.sym ? T0.sym + ' ' : ''}${T0.valueL}`, now: T0.current ? T0.current.valueL : '—',
        nowL: T0.current ? `now · ${T0.current.source}, ${T0.current.dayL}` : 'no current value yet',
        pct: (T0.pct ?? 0) + '%', start: T0.start ? `Started at ${T0.start.valueL} · ${T0.start.dayL}` : '',
        need: T0.reached ? 'Target reached' : T0.need ? `Needs ${T0.need}` : '', pace: pl, pc,
        stale: T0.testOnly && T0.current && T0.current.ageDays > 70 ? `Last value ${T0.current.ageDays} days old: time for a retest.` : '' } })(),
    legs: p.legs.map(l => ({ k: l.k, goal: `${l.goal.toLocaleString()} ${l.unit}`, done: `${l.done.toLocaleString()} ${l.unit}`, pct: Math.min(100, Math.round(l.done / l.goal * 100)) + '%',
      note: l.day ? fmtDay(l.day, { month: 'short', day: 'numeric', year: 'numeric' }) : 'None yet', nc: T3 })),
    months, lanes, todayL: pct(x(today)),
    msTabs: this.seg([['all', 'All'], ['races', 'Races'], ['tasks', 'Sub-tasks']], msF, id => this.setState({ msF: id })),
    milestones, msDone: shown.filter(m => m.status === 'completed').length + ' of ' + shown.length + ' done',
    week, rules: p.rules.map(r => ({ k: r.k, v: r.v, c: T2 })),
    bikeKit: [{ k: 'Professional bike fitting', v: p.cycling.fitting }, ...p.cycling.equipment].filter(e => e.v).map(e => { const [st, cc] = /purchased$|planned|researching|not confirmed|discussed/i.test(e.v) ? [e.v.replace(/^\w/, c => c.toUpperCase()), /not/i.test(e.v) ? T3 : T3] : [e.v, G]
      return { name: e.k, sub: '', st, cc, cb: chipB(cc) } }),
    ladder, ladderGoals, eff,
    checkpoints: p.milestones.filter(m => m.status !== 'completed' && m.start && m.start > today).slice(0, 4).map(m => ({ k: m.name, v: m.when, c: m.big ? A : T2 })),
    prepTabs: this.seg(races.map(r => [r.name, `${r.name.replace(/^(IRONMAN|Official) /, '').replace(/ Race$/, '')} · ${fmtDay(r.start)}`]), prepT, id => this.setState({ prepT: id })),
    prep,
    rmT: {
      event: g.event, dateLine: (g.date ? fmtDay(g.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : g.dateLabel) + (g.location ? ' · ' + g.location : '') + (g.registered ? ' · Registered ' + fmtDay(g.registered) : ''), objective: g.objective,
      planSpan: `${fmtDay(startDay, { month: 'short', year: 'numeric' })} → ${fmtDay(endDay, { month: 'short', year: 'numeric' })} · phases from your roadmap`,
      tbdNote: p.running.ladder.length > 1 ? `Run distances after the ${p.running.ladder[0].k} have an order (${p.running.ladder.slice(1).map(l => l.k).join(' → ')}) but no dates yet, so that bar is outlined.` : '',
      weekMeta: p.deload?.active ? `Deload · ${fmtDay(p.deload.start)} – ${fmtDay(p.deload.end)} · ${Math.round(p.deload.fraction * 100)}% weights` : 'Weekly schedule',
      weekNote: p.weeklySessions ? `Baseline: ${p.weeklySessions.strength} strength, ${p.weeklySessions.running} runs, ${p.weeklySessions.swimming} swim. ${p.scheduleNote}` : p.scheduleNote,
      streak: p.hard75 ? (p.hard75.status === 'upcoming' ? `Starts ${fmtDay(p.hard75.start)}` : p.hard75.status === 'completed' ? 'Complete' : `In progress · day ${p.hard75.day} of ${p.hard75.days}`) : t ? `Streak ${t.streak} days` : '', bikePriority: p.cycling.priority,
      bikeNote: [p.cycling.preferred ? p.cycling.preferred + (p.cycling.budget ? `, up to $${p.cycling.budget.toLocaleString()}` : '') + '.' : '', p.cycling.interim ? p.cycling.interim + '.' : ''].filter(Boolean).join(' '),
      comfortable: p.running.comfortableMi ? `Comfortable now: ${p.running.comfortableMi} mi` : '', ladderNote: `Bars show your longest run (${longest} mi) against each distance.`,
      targetLegend: 'Straight-line build to race distance',
      effNote: 'Taller bars are faster. Estimated from Strava pace and WHOOP heart rate, scaled to 140 bpm. It becomes exact once easy runs are done at 140.',
    },
  }
}
Object.assign(Component.prototype, { roadmapData })
