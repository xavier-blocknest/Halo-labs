// Training page · run view: a modal that opens from any run in the Run list, like the swim view.
// Everything comes from GET /api/runs/:id (server/dashboard/runs.ts → runView): the run (Strava, or WHOOP for a
// treadmill run), its impact from WHOOP (heart rate, strain, zones, calories), and when Runna tracked it the plan
// workout and type, weather, mile splits with speed, route and place. Strava runs fetched since Nov 2026 also bring
// their own splits and route. Best efforts inside the run, with the all-time ones marked. The route is drawn from the
// stored line (no map tiles, nothing about where he runs leaves the Mac). Sections without data don't show.

import { type ReactNode, useEffect, useState } from 'react'

const T1 = 'oklch(0.96 0.005 250)', T2 = 'oklch(0.74 0.015 255)', T3 = 'oklch(0.58 0.015 255)'
const LINE = 'oklch(1 0 0 / 0.07)', HEAD = "'Space Grotesk',system-ui,sans-serif", SANS = "'IBM Plex Sans',system-ui,sans-serif"
const RUN = 'oklch(0.82 0.13 210)', GOLD = 'oklch(0.85 0.14 85)' // run cyan (as in PersonalBests), PR gold
const ZONE = ['oklch(0.62 0.04 255)', 'oklch(0.70 0.08 230)', 'oklch(0.76 0.13 250)', 'oklch(0.80 0.13 80)', 'oklch(0.70 0.18 30)']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type P = any
const clock = (s: number | null | undefined) => {
  if (s == null) return '—'
  s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`
}
const n1 = (x: number | null | undefined) => (x == null ? '—' : String(Math.round(x * 10) / 10))
const when = (iso: string) => new Date(iso).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

const CSS = `
@keyframes rnIn{from{opacity:0;transform:translateY(10px) scale(.99)}to{opacity:1;transform:none}}
@keyframes rnDraw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
.rn-x:hover{color:${T1};background:oklch(1 0 0 / 0.06)}
.rn-tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.rn-two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px}
.rn-split:hover .rn-fill,.rn-split[data-on="1"] .rn-fill{filter:brightness(1.2)}
.rn-route path.l{stroke-dasharray:1;animation:rnDraw 1.6s .2s ease-out both}
@media (max-width: 640px){
  .rn-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}
  .rn-two{grid-template-columns:minmax(0,1fr)}
  .rn-card{border-radius:0!important;min-height:100%}
  .rn-wrap{padding:0!important}
}
@media (prefers-reduced-motion: reduce){ .rn-route path.l{animation:none} .rn-card{animation:none!important} }`

function Tile({ k, v, u, note }: { k: string; v: string; u?: string; note?: string }) {
  return (
    <div style={{ borderRadius: '12px', background: 'oklch(1 0 0 / 0.025)', border: `1px solid ${LINE}`, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
      <span style={{ fontSize: '11.5px', color: T2 }}>{k}</span>
      <span style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
        <span style={{ fontSize: '22px', fontFamily: HEAD, letterSpacing: '-0.02em', color: T1, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
        {u ? <span style={{ fontSize: '12px', color: T2 }}>{u}</span> : null}
      </span>
      {note ? <span style={{ fontSize: '11px', color: T3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{note}</span> : null}
    </div>
  )
}

const H = ({ children, meta }: { children: string; meta?: string }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 500, fontFamily: HEAD, color: T1 }}>{children}</h3>
    {meta ? <span style={{ fontSize: '11.5px', color: T3 }}>{meta}</span> : null}
  </div>
)
const Box = ({ children }: { children: ReactNode }) => (
  <div style={{ borderRadius: '14px', padding: '14px 16px', background: 'oklch(1 0 0 / 0.025)', border: `1px solid ${LINE}`, display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0 }}>{children}</div>
)

/** Mile by mile: one bar per split, taller = faster (pace inverted), the run's average as a line. */
function Splits({ splits, from, avgPaceS }: { splits: P[]; from: string; avgPaceS: number | null }) {
  const [on, setOn] = useState<number | null>(null)
  const paces = splits.map(s => s.paceS).filter((x: number | null): x is number => x != null)
  const slow = Math.max(...paces), fast = Math.min(...paces), span = Math.max(30, slow - fast)
  const h = (p: number) => 28 + ((slow + span * 0.15 - p) / (span * 1.15)) * 72 // % height, faster = taller
  const pick = on == null ? null : splits[on]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <H meta={`From ${from}${splits.some(s => s.mi < 0.95) ? ' · last split is partial' : ''}`}>Splits</H>
      <div onPointerLeave={() => setOn(null)} style={{ position: 'relative', height: '140px', display: 'flex', alignItems: 'flex-end', gap: '6px', borderBottom: `1px solid ${LINE}`, touchAction: 'pan-y' }}>
        {avgPaceS ? <div title="Run average" style={{ position: 'absolute', left: 0, right: 0, bottom: `${h(avgPaceS)}%`, borderTop: `1px dashed ${T3}`, pointerEvents: 'none' }} /> : null}
        {splits.map((s, j) => (
          <div key={s.n} className="rn-split" data-on={on === j ? 1 : 0} onPointerEnter={() => setOn(j)} onClick={() => setOn(j)}
            style={{ flex: `${Math.max(0.3, s.mi)} 1 0`, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <span style={{ fontSize: '10.5px', color: on === j ? T1 : T3, fontVariantNumeric: 'tabular-nums' }}>{clock(s.paceS)}</span>
            <span className="rn-fill" style={{ width: '100%', height: `${s.paceS ? h(s.paceS) - 12 : 4}%`, borderRadius: '5px 5px 0 0', background: s.paceS === fast ? RUN : 'oklch(0.82 0.13 210 / 0.4)', opacity: on == null || on === j ? 1 : 0.6, transition: 'opacity .15s' }} />
          </div>
        ))}
      </div>
      <div style={{ minHeight: '20px', fontSize: '12.5px', color: T2 }}>
        {pick ? <span><b style={{ color: T1, fontWeight: 500 }}>Mile {pick.n}</b>{pick.mi < 0.95 ? ` (${pick.mi} mi)` : ''} · {clock(pick.paceS)} /mi{pick.mph ? ` · ${pick.mph} mph` : ''}{pick.elevFt != null ? ` · ${pick.elevFt > 0 ? '+' : ''}${pick.elevFt} ft` : ''}{pick.hr ? ` · ${pick.hr} bpm` : ''}</span>
          : <span style={{ color: T3 }}>Taller bar = faster mile; the dashed line is the run's average pace. Tap or hover a mile.</span>}
      </div>
    </div>
  )
}

export function RunDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const [d, setD] = useState<P | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    let live = true
    fetch(`/api/runs/${encodeURIComponent(id)}`).then(async r => {
      const j = await r.json().catch(() => ({}))
      if (!live) return
      if (r.ok) setD(j); else setErr(j.error ?? `Couldn't load this run (${r.status})`)
    }).catch(() => live && setErr('Network error: is Halo Labs running?'))
    return () => { live = false }
  }, [id])
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev }
  }, [onClose])

  const im = d?.impact, w = d?.weather, rt = d?.route
  const zones = im?.zonePct?.some((z: number | null) => z) ? im.zonePct : null
  const src = d ? [d.treadmill ? 'Treadmill run from WHOOP' : 'Run from Strava', d.runna ? 'plan from Runna' : null, !d.treadmill && im.avgHr != null ? 'impact from WHOOP' : null].filter(Boolean).join(' · ') : ''

  return (
    <div className="rn-wrap" role="dialog" aria-modal="true" aria-label="Run details" onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 95, /* above the coach orb and chat (85–90), below the boot screen (100) */ background: 'oklch(0.1 0.01 260 / 0.72)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '5vh 16px', overflowY: 'auto', fontFamily: SANS }}>
      <style>{CSS}</style>
      <div className="rn-card" onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '780px', borderRadius: '20px', background: 'oklch(0.185 0.018 262)', border: `1px solid ${LINE}`, boxShadow: '0 30px 80px oklch(0 0 0 / 0.5)', padding: '22px 24px 26px', display: 'flex', flexDirection: 'column', gap: '22px', animation: 'rnIn .22s ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: '12px', color: RUN }}>{d ? when(d.start) : 'Run'}{d?.place ? ` · ${d.place}` : ''}</span>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 500, fontFamily: HEAD, letterSpacing: '-0.02em', color: T1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{d?.name ?? 'Loading…'}</h2>
            {d ? <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
              {d.runType ? <span title={d.runTypeGuess ? "Runna's guess from the run's data" : 'From your Runna plan'} style={{ fontSize: '11.5px', padding: '3px 10px', borderRadius: '999px', border: `1px solid ${RUN}`, color: RUN }}>{d.runType}{d.runTypeGuess ? ' · Runna’s guess' : ''}</span> : null}
              {d.runna?.planWeek ? <span style={{ fontSize: '11.5px', color: T2 }}>Plan week {d.runna.planWeek}{d.runna.workout && d.runna.workout !== d.name ? ` · ${d.runna.workout}` : ''}</span> : null}
              <span style={{ fontSize: '12px', color: T3 }}>{src}</span>
            </div> : null}
          </div>
          <button className="rn-x" onClick={onClose} aria-label="Close" style={{ flex: 'none', width: '34px', height: '34px', borderRadius: '10px', border: 0, background: 'transparent', color: T2, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        {err ? <p style={{ margin: 0, color: T2, fontSize: '13px' }}>{err}</p> : !d ? <p style={{ margin: 0, color: T3, fontSize: '13px' }}>Loading the run…</p> : (<>
          <div className="rn-tiles">
            <Tile k="Distance" v={d.distanceMi != null ? String(d.distanceMi) : '—'} u={d.distanceMi != null ? 'mi' : ''} note={d.treadmill ? 'Treadmill: no GPS distance' : d.elevFt != null ? `+${d.elevFt} ft elevation` : ''} />
            <Tile k="Moving time" v={clock(d.movingS)} note={d.elapsedS && d.movingS && d.elapsedS - d.movingS > 30 ? `${clock(d.elapsedS)} total` : ''} />
            <Tile k="Pace" v={d.paceS ? clock(d.paceS) : '—'} u={d.paceS ? '/mi' : ''} note="Moving time" />
            <Tile k="Shoes" v={d.gear ? d.gear.split(' ')[0] : '—'} note={d.gear ?? ''} />
            <Tile k="Heart rate" v={im.avgHr != null ? String(Math.round(im.avgHr)) : '—'} u="bpm" note={im.maxHr != null ? `Max ${Math.round(im.maxHr)} · WHOOP` : 'No WHOOP workout'} />
            <Tile k="Strain" v={im.strain != null ? n1(im.strain) : '—'} note={im.calories != null ? `${Math.round(im.calories)} kcal · WHOOP` : 'WHOOP'} />
            {w ? <Tile k="Weather" v={w.tempF != null ? `${w.tempF}°` : '—'} u="F" note={[w.desc, w.feelsF != null && w.feelsF !== w.tempF ? `feels ${w.feelsF}°` : null].filter(Boolean).join(' · ')} /> : null}
            {w ? <Tile k="Wind · humidity" v={w.windMph != null ? String(w.windMph) : '—'} u="mph" note={[w.gustMph ? `gusts ${w.gustMph}` : null, w.humidity != null ? `${w.humidity}% humidity` : null].filter(Boolean).join(' · ')} /> : null}
          </div>

          {d.runna?.description ? (
            <Box><H meta="Runna">The workout</H>
              <div style={{ fontSize: '13px', color: T2, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{d.runna.description}</div>
              {d.runna.feedback ? <span style={{ fontSize: '11.5px', color: T3 }}>Your feedback: {d.runna.feedback.toLowerCase()}</span> : null}
            </Box>) : null}

          {zones ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <H meta="WHOOP">Heart-rate zones</H>
              <div style={{ display: 'flex', height: '10px', gap: '2px', borderRadius: '999px', overflow: 'hidden' }}>
                {zones.map((z: number | null, i: number) => z ? <span key={i} title={`Zone ${i + 1}: ${z}%`} style={{ flex: `${z} 1 0`, background: ZONE[i] }} /> : null)}
              </div>
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '11.5px', color: T2 }}>
                {zones.map((z: number | null, i: number) => z ? <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><i style={{ width: '8px', height: '8px', borderRadius: '2px', background: ZONE[i] }} />Zone {i + 1} · {z}%</span> : null)}
              </div>
            </div>
          ) : null}

          {d.splits.length ? <Splits splits={d.splits} from={d.splitsFrom} avgPaceS={d.paceS} /> : null}

          {rt || d.efforts.length ? (
            <div className="rn-two">
              {rt ? (
                <Box><H meta={d.routeFrom ? `From ${d.routeFrom}` : ''}>Route</H>
                  <svg className="rn-route" viewBox={`-6 -6 ${rt.w + 12} ${rt.h + 12}`} style={{ width: '100%', maxHeight: '260px', aspectRatio: `${rt.w + 12} / ${rt.h + 12}` }} aria-label="Route">
                    <path d={rt.d} fill="none" stroke="oklch(0.82 0.13 210 / 0.22)" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                    <path className="l" d={rt.d} pathLength={1} fill="none" stroke={RUN} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                    {/* Finish first, then the start as a green ring around its point, so a loop shows both. */}
                    <circle cx={rt.end[0]} cy={rt.end[1]} r="2.4" style={{ fill: T1, stroke: 'oklch(0.185 0.018 262)', strokeWidth: 0.8 }} />
                    <circle cx={rt.start[0]} cy={rt.start[1]} r="4" style={{ fill: 'none', stroke: 'oklch(0.80 0.16 155)', strokeWidth: 1.6 }} />
                  </svg>
                  <span style={{ fontSize: '11.5px', color: T3 }}>{d.place ? `${d.place} · ` : ''}green ring = start, white dot = finish. North is up.</span>
                </Box>) : null}
              {d.efforts.length ? (
                <Box><H meta={d.efforts.some((e: P) => e.pr) ? 'Gold = all-time best' : 'Strava, 5 miles from Runna'}>Best efforts in this run</H>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {d.efforts.map((e: P) => (
                      <div key={e.k} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '12px', alignItems: 'baseline', padding: '7px 0', borderTop: `1px solid ${LINE}`, fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>
                        <span style={{ color: e.pr ? GOLD : T2 }}>{e.k}{e.pr ? ' ★' : ''}</span>
                        <span style={{ color: e.pr ? GOLD : T1, fontFamily: HEAD }}>{e.time}</span>
                        <span style={{ color: T3, fontSize: '11.5px' }}>{e.pace} /mi</span>
                      </div>))}
                  </div>
                </Box>) : null}
            </div>) : null}

          {!d.runna && !d.treadmill && !d.splits.length && !rt ? <span style={{ fontSize: '11.5px', color: T3 }}>Splits and the route come with runs Runna tracked, and with Strava runs synced from now on.</span> : null}
        </>)}
      </div>
    </div>
  )
}
