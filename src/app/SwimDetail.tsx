// Training page · swim view: a modal that opens from a swim in the Swim list when FORM has that swim's lengths.
// Everything comes from GET /api/swims/:id (server/dashboard/swims.ts + sessions.ts → swimView): the lengths and
// sets as the FORM goggles recorded them, with glitchy lengths left out of pace/SWOLF/stroke numbers (and shown
// struck through here), plus the swim's impact from WHOOP (heart rate, strain, zones, calories), like every workout.
// The goggles' armband heart rate is shown only per length and per set. Distances in yards.

import { Fragment, useEffect, useMemo, useState } from 'react'

const T1 = 'oklch(0.96 0.005 250)', T2 = 'oklch(0.74 0.015 255)', T3 = 'oklch(0.58 0.015 255)'
const LINE = 'oklch(1 0 0 / 0.07)', HEAD = "'Space Grotesk',system-ui,sans-serif", SANS = "'IBM Plex Sans',system-ui,sans-serif"
const SWIM = 'oklch(0.76 0.13 250)', OTHER = 'oklch(0.62 0.04 255)' // freestyle; drill and other strokes
const ZONE = ['oklch(0.62 0.04 255)', 'oklch(0.70 0.08 230)', 'oklch(0.76 0.13 250)', 'oklch(0.80 0.13 80)', 'oklch(0.70 0.18 30)']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type P = any
type Metric = 'pace' | 'swolf' | 'hr' | 'strokes'
const METRIC: Record<Metric, { label: string; note: string; get: (l: P) => number | null; fmt: (v: number) => string }> = {
  pace: { label: 'Pace', note: 'Seconds per 100 yd. Shorter bar = faster.', get: l => l.paceS, fmt: v => clock(v) + ' /100yd' },
  swolf: { label: 'SWOLF', note: 'Strokes + seconds per length. Shorter bar = more efficient. Drill lengths have no strokes.', get: l => (l.strokes ? l.swolf : null), fmt: v => String(v) },
  strokes: { label: 'Strokes', note: 'Strokes per length.', get: l => l.strokes || null, fmt: v => v + ' strokes' },
  hr: { label: 'Heart rate', note: 'Average per length, from the armband paired with the goggles.', get: l => l.hr, fmt: v => v + ' bpm' },
}
const STROKE: Record<string, string> = { FR: 'Freestyle', BK: 'Backstroke', BR: 'Breaststroke', FL: 'Butterfly', DR: 'Drill', IM: 'Medley', KI: 'Kick', MX: 'Mixed' }

const clock = (s: number | null | undefined) => {
  if (s == null) return '—'
  s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`
}
const secs = (s: number | null | undefined) => (s == null ? '—' : s < 60 ? `${s.toFixed(1)} s` : clock(s))
const n1 = (x: number | null | undefined) => (x == null ? '—' : String(Math.round(x * 10) / 10))
const when = (iso: string) => new Date(iso).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
const setName = (s: P) => `${s.label.replace('x', '×')} ${s.stroke.toLowerCase()}`

const CSS = `
@keyframes swIn{from{opacity:0;transform:translateY(10px) scale(.99)}to{opacity:1;transform:none}}
.sw-x:hover{color:${T1};background:oklch(1 0 0 / 0.06)}
.sw-seg button:hover{color:${T1}}
.sw-bar:hover .sw-fill,.sw-bar[data-on="1"] .sw-fill{filter:brightness(1.25)}
.sw-tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.sw-sets{display:grid;grid-template-columns:minmax(0,1.7fr) 44px 58px 46px 46px 44px 52px;gap:10px;align-items:baseline}
@media (max-width: 640px){
  .sw-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}
  .sw-sets{grid-template-columns:minmax(0,1.6fr) 40px 54px 42px 40px}
  .sw-sets > .sw-wide{display:none}
  .sw-drift{font-size:14px!important}
  .sw-card{border-radius:0!important;min-height:100%;}
  .sw-wrap{padding:0!important}
}`

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

/** One bar per length, in order, a small gap between sets. One axis: the chosen metric. */
function Lengths({ lengths }: { lengths: P[] }) {
  const [metric, setMetric] = useState<Metric>('pace')
  const [on, setOn] = useState<number | null>(null)
  const M = METRIC[metric]
  const vals = lengths.map(l => (l.flag ? null : M.get(l)))
  const max = Math.max(1, ...vals.filter((v): v is number => v != null))
  const pick = on == null ? null : lengths.find(l => l.i === on)
  const hasOther = lengths.some(l => l.stroke !== 'FR')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
        <H>Length by length</H>
        <div className="sw-seg" style={{ display: 'flex', gap: '2px', padding: '3px', borderRadius: '10px', background: 'oklch(1 0 0 / 0.04)' }}>
          {(Object.keys(METRIC) as Metric[]).map(k => (
            <button key={k} onClick={() => setMetric(k)} style={{ border: 0, cursor: 'pointer', fontFamily: SANS, fontSize: '12px', padding: '5px 10px', borderRadius: '7px',
              background: k === metric ? 'oklch(1 0 0 / 0.1)' : 'transparent', color: k === metric ? T1 : T2 }}>{METRIC[k].label}</button>
          ))}
        </div>
      </div>
      <div onPointerLeave={() => setOn(null)} style={{ height: '150px', display: 'flex', alignItems: 'flex-end', gap: '2px', borderBottom: `1px solid ${LINE}`, touchAction: 'pan-y' }}>
        {lengths.map((l, idx) => {
          const v = vals[idx], gap = idx > 0 && lengths[idx - 1].set !== l.set
          return (
            <Fragment key={l.i}>
              {gap ? <span style={{ flex: '0 0 5px' }} /> : null}
              <div className="sw-bar" data-on={on === l.i ? 1 : 0} aria-label={`Length ${l.i}`} onPointerEnter={() => setOn(l.i)} onClick={() => setOn(l.i)}
                style={{ flex: '1 1 0', minWidth: 0, height: '100%', display: 'flex', alignItems: 'flex-end', cursor: 'pointer' }}>
                {l.flag
                  ? <span style={{ width: '100%', height: '18%', borderRadius: '3px 3px 0 0', border: `1px dashed ${T3}`, borderBottom: 0, background: 'repeating-linear-gradient(135deg, oklch(1 0 0 / 0.08) 0 2px, transparent 2px 5px)' }} />
                  : v == null ? <span style={{ width: '100%', height: '2px', background: LINE }} />
                    : <span className="sw-fill" style={{ width: '100%', height: `${Math.max(3, (v / max) * 100)}%`, borderRadius: '3px 3px 0 0', background: l.stroke === 'FR' ? SWIM : OTHER, opacity: on == null || on === l.i ? 1 : 0.55, transition: 'height .25s, opacity .15s' }} />}
              </div>
            </Fragment>
          )
        })}
      </div>
      <div style={{ minHeight: '38px', fontSize: '12.5px', color: T2, lineHeight: 1.5 }}>
        {pick ? (
          <span>
            <b style={{ color: T1, fontWeight: 500 }}>Length {pick.i}</b> · set {pick.set} · {STROKE[pick.stroke] ?? pick.stroke} · {secs(pick.s)}
            {pick.strokes ? ` · ${pick.strokes} strokes` : ''}{pick.strokes && pick.swolf ? ` · SWOLF ${pick.swolf}` : ''}{pick.hr ? ` · ${pick.hr} bpm` : ''}{pick.restS ? ` · then ${secs(pick.restS)} rest` : ''}
            {pick.flag ? <span style={{ display: 'block', color: T3 }}>Left out: {pick.flag}</span> : M.get(pick) != null ? <span style={{ display: 'block', color: T3 }}>{M.label}: {M.fmt(M.get(pick)!)}</span> : null}
          </span>
        ) : <span style={{ color: T3 }}>{M.note} Tap or hover a bar for that length.</span>}
      </div>
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '11.5px', color: T2 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><i style={{ width: '10px', height: '10px', borderRadius: '3px', background: SWIM }} />Freestyle</span>
        {hasOther ? <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><i style={{ width: '10px', height: '10px', borderRadius: '3px', background: OTHER }} />Drill and other strokes</span> : null}
        {lengths.some(l => l.flag) ? <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><i style={{ width: '10px', height: '10px', borderRadius: '3px', border: `1px dashed ${T3}` }} />Left out (bad reading)</span> : null}
      </div>
    </div>
  )
}

export function SwimDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const [d, setD] = useState<P | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    let live = true
    fetch(`/api/swims/${encodeURIComponent(id)}`).then(async r => {
      const j = await r.json().catch(() => ({}))
      if (!live) return
      if (r.ok) setD(j); else setErr(j.error ?? `Couldn't load this swim (${r.status})`)
    }).catch(() => live && setErr('Network error: is the Jetson reachable?'))
    return () => { live = false }
  }, [id])
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev }
  }, [onClose])

  const s = d?.summary, im = d?.impact
  const excluded = useMemo(() => (d ? d.lengths.filter((l: P) => l.flag) : []), [d])
  const drift = s?.mainSet?.drift
  const zones = im?.zonePct?.some((z: number | null) => z) ? im.zonePct : null

  return (
    <div className="sw-wrap" role="dialog" aria-modal="true" aria-label="Swim details" onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 95, /* above the coach orb and chat (85–90), below the boot screen (100) */ background: 'oklch(0.1 0.01 260 / 0.72)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '5vh 16px', overflowY: 'auto', fontFamily: SANS }}>
      <style>{CSS}</style>
      <div className="sw-card" onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '780px', borderRadius: '20px', background: 'oklch(0.185 0.018 262)', border: `1px solid ${LINE}`, boxShadow: '0 30px 80px oklch(0 0 0 / 0.5)', padding: '22px 24px 26px', display: 'flex', flexDirection: 'column', gap: '22px', animation: 'swIn .22s ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: '12px', color: SWIM }}>{d ? when(d.start) : 'Swim'}</span>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 500, fontFamily: HEAD, letterSpacing: '-0.02em', color: T1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{d?.name ?? 'Loading…'}</h2>
            {d ? <span style={{ fontSize: '12px', color: T3 }}>{[d.pool, `${s.lengths} lengths`, 'Lengths from FORM', im.avgHr != null ? 'impact from WHOOP' : 'no WHOOP workout matched'].filter(Boolean).join(' · ')}</span> : null}
          </div>
          <button className="sw-x" onClick={onClose} aria-label="Close" style={{ flex: 'none', width: '34px', height: '34px', borderRadius: '10px', border: 0, background: 'transparent', color: T2, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        {err ? <p style={{ margin: 0, color: T2, fontSize: '13px' }}>{err}</p> : !d ? <p style={{ margin: 0, color: T3, fontSize: '13px' }}>Loading the lengths…</p> : (<>
          <div className="sw-tiles">
            <Tile k="Distance" v={Math.round(s.distanceM / 0.9144).toLocaleString()} u="yd" note={`${s.lengths} lengths`} />
            <Tile k="Swimming" v={clock(s.movingS)} note={`+ ${clock(s.restS)} rest`} />
            <Tile k="Freestyle pace" v={s.free?.pace ?? '—'} u="/100yd" note={s.free ? `${s.free.yd.toLocaleString()} yd of clean lengths` : 'No freestyle'} />
            <Tile k="SWOLF" v={n1(s.free?.swolf)} note="Freestyle, lower is better" />
            <Tile k="Strokes per length" v={n1(s.free?.strokes)} note={s.free?.rate ? `${s.free.rate} strokes/min` : ''} />
            <Tile k="Distance per stroke" v={n1(s.free?.dpsYd)} u="yd" note="Freestyle" />
            <Tile k="Heart rate" v={im.avgHr != null ? String(Math.round(im.avgHr)) : '—'} u="bpm" note={im.maxHr != null ? `Max ${Math.round(im.maxHr)} · WHOOP` : 'No WHOOP workout'} />
            <Tile k="Strain" v={im.strain != null ? n1(im.strain) : '—'} note={im.calories != null ? `${Math.round(im.calories)} kcal · WHOOP` : 'WHOOP'} />
          </div>

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

          {drift ? (
            <div style={{ borderRadius: '14px', padding: '14px 16px', background: 'oklch(0.76 0.13 250 / 0.07)', border: '1px solid oklch(0.76 0.13 250 / 0.22)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <H meta={`First ${drift.n} vs last ${drift.n} clean lengths`}>{`How the main set held up · ${s.mainSet.label.replace('x', '×')}`}</H>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '10px' }}>
                {[['SWOLF', n1(drift.swolf[0]), n1(drift.swolf[1])], ['Pace /100yd', clock(drift.paceS[0]), clock(drift.paceS[1])], ['Armband HR', drift.hr[0] ?? '—', drift.hr[1] ?? '—']].map(([k, a, b]) => (
                  <div key={k as string} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '11.5px', color: T2 }}>{k}</span>
                    <span className="sw-drift" style={{ fontSize: '17px', fontFamily: HEAD, color: T1, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{a} <span style={{ color: T3 }}>→</span> {b}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <Lengths lengths={d.lengths} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <H meta={`${d.sets.length} sets`}>Sets</H>
            <div className="sw-sets" style={{ fontSize: '11.5px', color: T3, paddingBottom: '4px' }}>
              <span>Set</span><span style={{ textAlign: 'right' }}>Yd</span><span style={{ textAlign: 'right' }}>Pace</span><span style={{ textAlign: 'right' }}>SWOLF</span>
              <span style={{ textAlign: 'right' }}>HR</span><span className="sw-wide" style={{ textAlign: 'right' }}>Str/len</span><span className="sw-wide" style={{ textAlign: 'right' }}>Rest</span>
            </div>
            {d.sets.map((x: P) => (
              <div key={x.n} className="sw-sets" style={{ fontSize: '13px', color: T1, padding: '8px 0', borderTop: `1px solid ${LINE}`, fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {setName(x)}{x.excluded ? <span style={{ display: 'block', color: T3, fontSize: '11px' }}>{x.excluded} length{x.excluded === 1 ? '' : 's'} left out</span> : null}
                </span>
                <span style={{ textAlign: 'right', color: T2 }}>{x.yd}</span>
                <span style={{ textAlign: 'right' }}>{x.pace ?? '—'}</span>
                <span style={{ textAlign: 'right' }}>{n1(x.swolf)}</span>
                <span style={{ textAlign: 'right', color: T2 }}>{x.hr ?? '—'}</span>
                <span className="sw-wide" style={{ textAlign: 'right', color: T2 }}>{n1(x.strokesPerLen)}</span>
                <span className="sw-wide" style={{ textAlign: 'right', color: T2 }}>{x.restS ? clock(x.restS) : '—'}</span>
              </div>
            ))}
            <span style={{ fontSize: '11.5px', color: T3 }}>Pace and SWOLF over clean lengths only. Set HR is the goggles' armband; the swim's heart rate above is WHOOP's.</span>
          </div>

          {excluded.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <H meta="Still counted in distance">{`${excluded.length} length${excluded.length === 1 ? '' : 's'} left out of pace and stroke numbers`}</H>
              {excluded.map((l: P) => (
                <div key={l.i} style={{ fontSize: '12.5px', color: T2, display: 'flex', gap: '8px' }}>
                  <span style={{ color: T3, flex: 'none', width: '64px' }}>Length {l.i}</span>
                  <span>Set {l.set} · {STROKE[l.stroke] ?? l.stroke} · {l.flag}</span>
                </div>
              ))}
            </div>
          ) : null}
        </>)}
      </div>
    </div>
  )
}
