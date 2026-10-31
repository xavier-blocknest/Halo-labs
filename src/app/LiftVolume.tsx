// Body page · "Lifting volume": weight lifted, sets, reps, sessions and time per period, the last 12 weeks, and the
// exercises that moved the most weight. Reads only D.body.volume (server/dashboard/body.ts → liftVolume).
import { Fragment, useState } from 'react'

const T1 = 'oklch(0.96 0.005 250)', T2 = 'oklch(0.74 0.015 255)', T3 = 'oklch(0.58 0.015 255)', A = 'oklch(0.82 0.13 210)', AD = 'oklch(0.82 0.13 210 / 0.45)'
const G = 'oklch(0.78 0.15 160)', LINE = 'oklch(1 0 0 / 0.07)', FONT = "'IBM Plex Sans',system-ui,sans-serif"
// Phones: label every 4th week only (Aug 17 · Sep 14 · Oct 12), so the dates fit under the bars.
const CSS = `@media (max-width: 760px) { .lv-l:not(.lv-k) { visibility: hidden; } }`
const btn = { cursor: 'pointer', fontFamily: FONT, fontSize: '12px', padding: '5px 10px', borderRadius: '7px', border: 0 } as const

const PERIODS = [['week', 'This week', 'same days last week'], ['d30', '30 days', 'previous 30 days'], ['d90', '90 days', 'previous 90 days'],
  ['year', 'This year', 'same stretch last year'], ['all', 'All time', '']] as const
const lb = (n: number) => n.toLocaleString() + ' lb'
const kLb = (n: number) => (n >= 10_000 ? Math.round(n / 1000) + 'k' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n))
const hm = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min}m`)
const day = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type P = any

function delta(now: number, prev: number | undefined) {
  if (prev == null || prev === 0) return null
  const pct = Math.round((now - prev) / prev * 100)
  return { t: (pct > 0 ? '+' : pct < 0 ? '−' : '±') + Math.abs(pct) + '%', c: pct > 0 ? G : T3 }
}

export function LiftVolume({ vol }: { vol: P }) {
  const [sel, setSel] = useState<string>('week')
  const [tip, setTip] = useState<number | null>(null)
  if (!vol) return null
  const meta = PERIODS.find(p => p[0] === sel)!, p = vol.periods[sel], prev = p.prev
  const tiles = [
    ['Weight lifted', lb(p.lb), delta(p.lb, prev?.lb)], ['Sets', p.sets.toLocaleString(), delta(p.sets, prev?.sets)], ['Reps', p.reps.toLocaleString(), delta(p.reps, prev?.reps)],
    ['Sessions', String(p.n), delta(p.n, prev?.n)], ['Time lifting', hm(p.min), delta(p.min, prev?.min)], ['Per session', p.n ? lb(Math.round(p.lb / Math.max(1, p.n - p.noSets))) : '—', null],
  ] as const
  const mx = Math.max(1, ...vol.weeks.map((w: P) => w.lb)), topMx = Math.max(1, ...p.top.map((t: P) => t.lb))
  return (
    <section style={{ borderRadius: '18px', background: 'oklch(0.185 0.018 262 / 0.9)', border: `1px solid ${LINE}`, boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.04)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px', minWidth: 0 }}>
      <style>{CSS}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '14px', fontWeight: 500, fontFamily: "'Space Grotesk',system-ui,sans-serif", letterSpacing: '-0.005em', color: T1 }}>Lifting volume</div>
        <div style={{ display: 'flex', gap: '2px', padding: '3px', borderRadius: '10px', background: 'oklch(1 0 0 / 0.04)', border: `1px solid ${LINE}`, flexWrap: 'wrap' }}>
          {PERIODS.map(([id, label]) => (
            <button key={id} onClick={() => setSel(id)} style={{ ...btn, background: id === sel ? 'oklch(0.82 0.13 210 / 0.16)' : 'transparent', color: id === sel ? A : T2 }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '10px' }}>
        {tiles.map(([k, v, d]) => (
          <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px 14px', borderRadius: '12px', background: 'oklch(1 0 0 / 0.03)', border: `1px solid ${LINE}` }}>
            <span style={{ fontSize: '11.5px', color: T3 }}>{k}</span>
            <span style={{ fontSize: '20px', fontFamily: "'Space Grotesk',system-ui,sans-serif", color: T1, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{v}</span>
            <span style={{ fontSize: '11.5px', color: d ? d.c : T3, fontVariantNumeric: 'tabular-nums', minHeight: '15px' }}>{d ? `${d.t} vs ${meta[2]}` : ''}</span>
          </div>
        ))}
      </div>
      {p.noSets ? <span style={{ fontSize: '12px', color: T3 }}>{p.noSets} session{p.noSets === 1 ? '' : 's'} from WHOOP only (no FitnessAI export or screenshot yet) count in sessions and time, not in weight or sets.</span> : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: `1px solid ${LINE}`, paddingTop: '16px' }}>
        <span style={{ fontSize: '12px', color: T3 }}>Weight lifted per week · last 12 weeks</span>
        <div style={{ height: '120px', display: 'flex', alignItems: 'flex-end', gap: '6px' }} onPointerLeave={() => setTip(null)}>
          {vol.weeks.map((w: P, i: number) => {
            const last = i === vol.weeks.length - 1
            return (
              <Fragment key={w.start}>
                <div onPointerEnter={() => setTip(i)} onClick={() => setTip(tip === i ? null : i)} style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '5px' }}>
                  <div style={{ fontSize: '10px', color: tip === i ? T1 : T2, textAlign: 'center', fontVariantNumeric: 'tabular-nums', visibility: w.lb ? 'visible' : 'hidden' }}>{kLb(w.lb)}</div>
                  <div style={{ height: `calc(${Math.round(w.lb / mx * 100)}% * 0.7)`, minHeight: '3px', borderRadius: '4px 4px 1px 1px', background: w.lb ? (last ? A : AD) : 'oklch(1 0 0 / 0.06)', boxShadow: last && w.lb ? '0 0 10px oklch(0.82 0.13 210 / 0.5)' : 'none', opacity: tip === null || tip === i ? 1 : 0.5 }} />
                  <div className={'lv-l' + (i % 4 === 3 ? ' lv-k' : '')} style={{ fontSize: '10px', color: T3, textAlign: 'center', whiteSpace: 'nowrap', height: '13px', display: 'flex', justifyContent: 'center' }}>{i % 2 === 1 ? day(w.start) : ''}</div>
                </div>
              </Fragment>
            )
          })}
        </div>
        <span style={{ fontSize: '12px', color: T2, minHeight: '16px' }}>
          {tip !== null ? (() => { const w = vol.weeks[tip]; return `Week of ${day(w.start)} · ${lb(w.lb)} · ${w.sets} sets · ${w.n} session${w.n === 1 ? '' : 's'}${tip === vol.weeks.length - 1 ? ' (so far)' : ''}` })() : ''}
        </span>
      </div>

      {p.top.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: `1px solid ${LINE}`, paddingTop: '16px' }}>
          <span style={{ fontSize: '12px', color: T3 }}>Most weight moved · {meta[1].toLowerCase()}</span>
          {p.top.map((t: P) => (
            <div key={t.name} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ color: T1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                <span style={{ color: T2, whiteSpace: 'nowrap' }}>{lb(t.lb)} · {t.sets} sets</span>
              </div>
              <div style={{ height: '4px', borderRadius: '2px', background: 'oklch(1 0 0 / 0.06)' }}><div style={{ width: Math.round(t.lb / topMx * 100) + '%', height: '100%', borderRadius: '2px', background: AD }} /></div>
            </div>
          ))}
        </div>
      ) : <span style={{ fontSize: '13px', color: T3 }}>No lifts with sets in this period.</span>}
    </section>
  )
}
