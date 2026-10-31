// Training page · "Personal bests": one tile per sport (run, swim, ride, strength), each with a headline best, its
// other bests, and small bars (run: pace at each distance; strength: heaviest set, or without FitnessAI sets the
// strength sessions' bests: strain, length, calories, heart rate). A best set in the last 14 days
// wears a glowing "New". Reads only D.training.bests (server/dashboard/bests.ts); every value comes from there.

import type { ReactNode } from 'react'

const T1 = 'oklch(0.96 0.005 250)', T2 = 'oklch(0.74 0.015 255)', T3 = 'oklch(0.58 0.015 255)'
const LINE = 'oklch(1 0 0 / 0.07)', HEAD = "'Space Grotesk',system-ui,sans-serif"
// Sport colours: run = accent, swim = blue, ride = good green, strength = warm amber (status colours stay paired with words).
const C = { run: 'oklch(0.82 0.13 210)', swim: 'oklch(0.76 0.13 250)', ride: 'oklch(0.78 0.15 160)', lift: 'oklch(0.82 0.14 80)' }
const ICON = {
  run: 'M13.5 5.5a1.75 1.75 0 1 0 0-3.5a1.75 1.75 0 0 0 0 3.5M7 21l3.2-5.2l3 2.2l1 5M9.5 12.5l1.8-4l4 2l2 3h3M11.3 8.5L7 10.5v3',
  swim: 'M2 16c1.7 0 1.7-1.3 3.3-1.3S7 16 8.7 16s1.7-1.3 3.3-1.3s1.7 1.3 3.3 1.3s1.7-1.3 3.4-1.3S20.3 16 22 16M2 20c1.7 0 1.7-1.3 3.3-1.3S7 20 8.7 20s1.7-1.3 3.3-1.3s1.7 1.3 3.3 1.3s1.7-1.3 3.4-1.3S20.3 20 22 20M16.5 8a1.75 1.75 0 1 0 0-3.5a1.75 1.75 0 0 0 0 3.5M6 12.5l4.5-4.5l3 2.5l-2 2',
  ride: 'M5.5 20a3.5 3.5 0 1 0 0-7a3.5 3.5 0 0 0 0 7M18.5 20a3.5 3.5 0 1 0 0-7a3.5 3.5 0 0 0 0 7M5.5 16.5L9 9.5h6l3.5 7M9 9.5l3.2 7M13.5 5.5h2.5l-1 4',
  lift: 'M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type P = any
type Sport = keyof typeof C

function New({ c }: { c: string }) {
  return <span style={{ fontSize: '8.5px', lineHeight: 1.3, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'oklch(0.18 0.03 230)', background: c, borderRadius: '999px', padding: '1px 5px', boxShadow: `0 0 8px ${c}` }}>New</span>
}

/** A sport tile: icon + name, the headline best, then `children`. */
function Tile({ sport, title, count, hero, heroLabel, children, empty }: { sport: Sport; title: string; count: number; hero: P | null; heroLabel: string; children?: ReactNode; empty: string }) {
  const c = C[sport]
  return (
    <div style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0, padding: '18px', borderRadius: '16px',
      background: `radial-gradient(260px 140px at 100% 0%, ${c.replace(')', ' / 0.16)')}, transparent 70%), oklch(1 0 0 / 0.025)`, border: `1px solid ${c.replace(')', ' / 0.22)')}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ width: '34px', height: '34px', flex: 'none', borderRadius: '10px', display: 'grid', placeItems: 'center', background: c.replace(')', ' / 0.14)'), color: c, boxShadow: `inset 0 0 0 1px ${c.replace(')', ' / 0.3)')}` }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={ICON[sport]} /></svg>
        </span>
        <span style={{ fontSize: '14px', fontWeight: 500, fontFamily: HEAD, color: T1 }}>{title}</span>
        {count ? <span style={{ marginLeft: 'auto', fontSize: '11.5px', color: T3 }}>{count} best{count === 1 ? '' : 's'}</span> : null}
      </div>
      {hero ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }} title={`${hero.name} · ${hero.d}`}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: T2 }}>{heroLabel}{hero.fresh ? <New c={c} /> : null}</span>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '38px', lineHeight: 1.05, fontFamily: HEAD, letterSpacing: '-0.035em', color: T1, fontVariantNumeric: 'tabular-nums', textShadow: `0 0 24px ${c.replace(')', ' / 0.45)')}` }}>{hero.v}</span>
            {hero.u ? <span style={{ fontSize: '14px', color: c }}>{hero.u}</span> : null}
            {hero.sub ? <span style={{ fontSize: '12.5px', color: T2 }}>{hero.sub}</span> : null}
          </span>
          <span style={{ fontSize: '11.5px', color: T3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hero.d} · {hero.name}</span>
        </div>
      ) : <span style={{ fontSize: '12.5px', color: T3 }}>{empty}</span>}
      {children}
    </div>
  )
}

/** Smaller bests under the headline, as chips. */
function Chips({ sport, items }: { sport: Sport; items: { k: string; b: P | null }[] }) {
  const shown = items.filter(i => i.b)
  if (!shown.length) return null
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: '8px' }}>
      {shown.map(({ k, b }) => (
        <div key={k} title={`${b.name} · ${b.d}`} style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '10px 12px', borderRadius: '12px', background: 'oklch(1 0 0 / 0.03)', border: `1px solid ${LINE}` }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: T3 }}>{k}{b.fresh ? <New c={C[sport]} /> : null}</span>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '19px', fontFamily: HEAD, color: T1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{b.v}</span>
            <span style={{ fontSize: '11.5px', color: C[sport] }}>{b.u}</span>
          </span>
          <span style={{ fontSize: '11px', color: T3 }}>{b.sub ? `${b.sub} · ` : ''}{b.d}</span>
        </div>
      ))}
    </div>
  )
}

/** Rows with a bar each: label, value, a bar scaled to the best of the list, then the detail. */
function Bars({ sport, rows }: { sport: Sport; rows: { k: string; v: string; sub: string; pct: number; b: P }[] }) {
  const c = C[sport]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', borderTop: `1px solid ${LINE}`, paddingTop: '12px' }}>
      {rows.map(r => (
        <div key={r.k} title={`${r.b.name} · ${r.b.d}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '4px 10px', alignItems: 'baseline' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: T2, minWidth: 0 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.k}</span>{r.b.fresh ? <New c={c} /> : null}
          </span>
          <span style={{ fontSize: '13.5px', fontFamily: HEAD, color: T1, fontVariantNumeric: 'tabular-nums' }}>{r.v} <span style={{ fontSize: '11px', color: T3, fontFamily: 'inherit' }}>{r.sub}</span></span>
          <div style={{ gridColumn: '1 / -1', height: '5px', borderRadius: '3px', background: 'oklch(1 0 0 / 0.06)' }}>
            <div style={{ width: `${Math.max(4, r.pct)}%`, height: '100%', borderRadius: '3px', background: `linear-gradient(90deg, ${c.replace(')', ' / 0.35)')}, ${c})`, boxShadow: r.pct >= 99 ? `0 0 10px ${c}` : 'none' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function PersonalBests({ pb }: { pb: P }) {
  if (!pb) return null
  const { run, swim, ride, strength } = pb, ss = pb.strengthSessions ?? {}
  // Run: headline = the longest standard race distance with an effort (5K before mile), else the longest run.
  const pick = ['Marathon', 'Half marathon', '10K', '5K', '1 mile'].map(k => run.efforts.find((e: P) => e.k === k)).find(Boolean)
  const runHero = pick ?? run.longest, runLabel = pick ? `Fastest ${pick.k}` : 'Longest run'
  const fastest = Math.min(...run.efforts.map((e: P) => e.spm))
  const ladder = run.efforts.filter((e: P) => e !== pick).map((e: P) => ({ k: e.k, v: e.v, sub: e.sub, pct: Math.round(fastest / e.spm * 100), b: e }))
  // Strength: the heaviest set leads; the other exercises follow, heaviest first, with bars against it.
  const lifts = [...strength].sort((a: P, b: P) => b.lb - a.lb), liftHero = lifts[0] ?? null
  const liftRows = lifts.slice(1).map((s: P) => ({ k: s.k, v: `${s.v} lb`, sub: s.sub.split(' · ')[0], pct: liftHero ? Math.round(s.lb / liftHero.lb * 100) : 0, b: s }))
  const count = (xs: (P | null)[]) => xs.filter(Boolean).length

  return (
    <section style={{ borderRadius: '18px', background: 'oklch(0.185 0.018 262 / 0.9)', border: `1px solid ${LINE}`, boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.04)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '14px', fontWeight: 500, fontFamily: HEAD, letterSpacing: '-0.005em', color: T1 }}>Personal bests</div>
        <span style={{ fontSize: '12px', color: T3 }}>Only your recorded workouts · Strava, WHOOP and FitnessAI</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,250px),1fr))', gap: '14px', alignItems: 'start' }}>
        <Tile sport="run" title="Run" count={run.efforts.length + count([run.longest])} hero={runHero} heroLabel={runLabel} empty="No runs with distance yet.">
          {pick ? <Chips sport="run" items={[{ k: 'Longest run', b: run.longest }]} /> : null}
          {ladder.length ? <Bars sport="run" rows={ladder} /> : null}
          {run.pending ? <span style={{ fontSize: '11.5px', color: T3 }}>Getting best efforts from Strava: {run.pending} run{run.pending === 1 ? '' : 's'} to go. They fill in over the next syncs.</span> : null}
        </Tile>
        <Tile sport="swim" title="Swim" count={count([swim.longest, swim.fastest])} hero={swim.longest} heroLabel="Longest swim" empty="No swims with distance yet.">
          <Chips sport="swim" items={[{ k: 'Fastest pace', b: swim.fastest }]} />
        </Tile>
        <Tile sport="ride" title="Ride" count={count([ride.longest, ride.fastest, ride.climb])} hero={ride.longest} heroLabel="Longest ride" empty="No rides with distance yet.">
          <Chips sport="ride" items={[{ k: 'Fastest average', b: ride.fastest }, { k: 'Most climbing', b: ride.climb }]} />
        </Tile>
        {strength.length ? (
          <Tile sport="lift" title="Strength" count={strength.length} hero={liftHero} heroLabel={liftHero ? `${liftHero.k} · heaviest set` : ''} empty="">
            {liftRows.length ? <Bars sport="lift" rows={liftRows} /> : null}
          </Tile>
        ) : (
          <Tile sport="lift" title="Strength" count={count([ss.strain, ss.longest, ss.calories, ss.maxHr])} hero={ss.strain ?? ss.longest} heroLabel={ss.strain ? 'Highest strain' : 'Longest session'} empty="No strength sessions yet.">
            <Chips sport="lift" items={[...(ss.strain ? [{ k: 'Longest session', b: ss.longest }] : []), { k: 'Most calories', b: ss.calories }, { k: 'Highest heart rate', b: ss.maxHr }]} />
            {ss.n ? <span style={{ fontSize: '11.5px', color: T3 }}>From {ss.n} strength session{ss.n === 1 ? '' : 's'}. Export FitnessAI to see your heaviest lifts here.</span> : null}
          </Tile>
        )}
      </div>
    </section>
  )
}
