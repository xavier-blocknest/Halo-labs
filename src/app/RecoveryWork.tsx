// Recovery page · "Recovery work": sauna, red light, massage, … from WHOOP. Reads only v.rw (built in rwData).
import { Fragment, useState } from 'react'

const T1 = 'oklch(0.96 0.005 250)', T2 = 'oklch(0.74 0.015 255)', T3 = 'oklch(0.58 0.015 255)', A = 'oklch(0.82 0.13 210)', LINE = 'oklch(1 0 0 / 0.07)'
const FONT = "'IBM Plex Sans',system-ui,sans-serif"
const btn = { cursor: 'pointer', fontFamily: FONT, fontSize: '12px', padding: '5px 10px', borderRadius: '8px' } as const

const CSS = `
.rw-row { display: grid; grid-template-columns: minmax(0,1.3fr) 92px 110px 70px 90px minmax(120px,auto); gap: 12px; align-items: center; }
.rw-row.hr { grid-template-columns: minmax(0,1.3fr) 92px 110px 70px 90px 110px minmax(120px,auto); }
@media (max-width: 760px) {
  .rw-row, .rw-row.hr { grid-template-columns: minmax(0,1fr) auto; row-gap: 4px; }
  .rw-row > .rw-c { grid-column: 1 / -1; display: flex; gap: 6px; color: ${T2}; font-size: 12px; text-align: left !important; }
  .rw-row > .rw-c::before { content: attr(data-k) ' · '; color: ${T3}; }
  .rw-head { display: none !important; }
  .rw-goal { grid-column: 1 / -1; justify-content: flex-start !important; }
  .rw-w::after { content: ' this week'; color: ${T3}; }
}
`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Goal({ r }: { r: any }) {
  const [edit, setEdit] = useState<number | null>(null)
  if (edit === null) {
    return (
      <button onClick={() => setEdit(r.goal ?? 3)} style={{ ...btn, border: `1px solid ${r.goal ? LINE : 'oklch(0.82 0.13 210 / 0.4)'}`, background: r.goal ? 'transparent' : 'oklch(0.82 0.13 210 / 0.1)', color: r.goal ? T2 : A }}>
        {r.goal ? `Target ${r.goal}/wk` : 'Set target'}
      </button>
    )
  }
  const step = (d: number) => setEdit(n => Math.min(14, Math.max(1, (n ?? 1) + d)))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <button onClick={() => step(-1)} aria-label="Fewer" style={{ ...btn, border: `1px solid ${LINE}`, background: 'transparent', color: T1, padding: '5px 9px' }}>−</button>
      <span style={{ fontSize: '13px', color: T1, minWidth: '44px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{edit}/wk</span>
      <button onClick={() => step(1)} aria-label="More" style={{ ...btn, border: `1px solid ${LINE}`, background: 'transparent', color: T1, padding: '5px 9px' }}>+</button>
      <button onClick={() => { r.setGoal(edit); setEdit(null) }} style={{ ...btn, border: '1px solid oklch(0.82 0.13 210 / 0.5)', background: 'oklch(0.82 0.13 210 / 0.14)', color: A }}>Save</button>
      {r.goal ? <button onClick={() => { r.setGoal(null); setEdit(null) }} style={{ ...btn, border: `1px solid ${LINE}`, background: 'transparent', color: T3 }}>Clear</button> : null}
      <button onClick={() => setEdit(null)} aria-label="Cancel" style={{ ...btn, border: 0, background: 'transparent', color: T3, padding: '5px 4px' }}>✕</button>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function RecoveryWork({ rw }: { rw: any }) {
  const [tip, setTip] = useState<number | null>(null)
  const hr = rw.hasHr ? ' hr' : ''
  return (
    <section style={{ borderRadius: '18px', background: 'oklch(0.185 0.018 262 / 0.9)', border: `1px solid ${LINE}`, boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.04)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '18px', minWidth: 0 }}>
      <style>{CSS}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '14px', fontWeight: 500, fontFamily: "'Space Grotesk',system-ui,sans-serif", letterSpacing: '-0.005em', color: T1 }}>Recovery work</div>
        <span style={{ fontSize: '12px', color: T3 }}>WHOOP · sauna, red light, massage and more</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div className={'rw-row rw-head' + hr} style={{ padding: '0 0 8px', fontSize: '12px', color: T3 }}>
          <span>Activity</span><span style={{ textAlign: 'right' }}>This week</span><span style={{ textAlign: 'right' }}>Last 30 days</span>
          <span style={{ textAlign: 'right' }}>Usually</span><span style={{ textAlign: 'right' }}>Last</span>{rw.hasHr ? <span style={{ textAlign: 'right' }}>Heart rate</span> : null}<span />
        </div>
        {rw.rows.map((r: any) => (
          <div key={r.name} className={'rw-row' + hr} style={{ padding: '11px 0', borderTop: `1px solid ${LINE}`, fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ color: T1 }}>{r.name}</span>
            <span className="rw-w" style={{ textAlign: 'right', color: r.weekC }}>{r.week}</span>
            <span className="rw-c" data-k="30 days" style={{ textAlign: 'right', color: T2 }}>{r.d30}</span>
            <span className="rw-c" data-k="Usually" style={{ textAlign: 'right', color: T2 }}>{r.avg}</span>
            <span className="rw-c" data-k="Last" style={{ textAlign: 'right', color: T2 }}>{r.last}</span>
            {rw.hasHr ? <span className="rw-c" data-k="Heart rate" style={{ textAlign: 'right', color: T2 }}>{r.hr ?? '—'}</span> : null}
            <div className="rw-goal" style={{ display: 'flex', justifyContent: 'flex-end' }}><Goal r={r} /></div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: `1px solid ${LINE}`, paddingTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: T3 }}>{rw.sel} · {rw.chartNote.toLowerCase()} · last 12 weeks</span>
          {rw.tabs.length ? (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {rw.tabs.map((t: any) => (
                <button key={t.t} onClick={() => { setTip(null); t.pick() }} style={{ ...btn, fontSize: '11.5px', padding: '4px 9px', border: `1px solid ${t.on ? 'oklch(0.82 0.13 210 / 0.5)' : LINE}`, background: t.on ? 'oklch(0.82 0.13 210 / 0.14)' : 'transparent', color: t.on ? A : T2 }}>{t.t}</button>
              ))}
            </div>
          ) : null}
        </div>
        <div style={{ position: 'relative', height: '120px', display: 'flex', alignItems: 'flex-end', gap: '6px' }} onPointerLeave={() => setTip(null)}>
          {rw.goalLine ? <div style={{ position: 'absolute', left: 0, right: 0, bottom: `calc(${rw.goalLine} * 0.7 + 18px)`, borderTop: '1px dashed oklch(0.78 0.15 160 / 0.6)', pointerEvents: 'none' }} /> : null}
          {rw.bars.map((b: any, i: number) => (
            <Fragment key={i}>
              <div title={b.t} onPointerEnter={() => setTip(i)} onClick={() => setTip(tip === i ? null : i)} style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'stretch', gap: '5px', cursor: 'default' }}>
                <div style={{ fontSize: '10px', color: tip === i ? T1 : T2, textAlign: 'center', fontVariantNumeric: 'tabular-nums', visibility: b.v || tip === i ? 'visible' : 'hidden' }}>{b.v}</div>
                <div style={{ height: `calc(${b.h} * 0.7)`, minHeight: '3px', borderRadius: '4px 4px 1px 1px', background: b.c, boxShadow: b.glow, opacity: tip === null || tip === i ? 1 : 0.5 }} />
                <div style={{ fontSize: '10px', color: T3, textAlign: 'center', whiteSpace: 'nowrap', height: '13px' }}>{b.l}</div>
              </div>
            </Fragment>
          ))}
        </div>
        {tip !== null ? <span style={{ fontSize: '12px', color: T2 }}>{rw.bars[tip].t}</span> : null}
      </div>

      {rw.effect ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: `1px solid ${LINE}`, paddingTop: '14px' }}>
          <span style={{ fontSize: '13px', lineHeight: 1.5, color: rw.effect.c, textWrap: 'pretty' }}>{rw.effect.t}</span>
          <span style={{ fontSize: '12px', color: T3 }}>{rw.effect.sub}</span>
        </div>
      ) : null}
      {rw.hrNote || rw.older ? (
        <span style={{ fontSize: '12px', lineHeight: 1.5, color: T3, textWrap: 'pretty' }}>
          {rw.hrNote}{rw.hrNote && rw.older ? ' ' : ''}{rw.older ? `Not in the last 90 days: ${rw.older}.` : ''}
        </span>
      ) : null}
    </section>
  )
}
