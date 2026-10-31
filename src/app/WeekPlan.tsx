// Week page · plan vs actual, for this week or next. Each day lists its planned sessions (title, detail, Done/Missed)
// next to what was recorded; "Edit" opens that day for changes, saved to the week plan (PUT /api/week-plan/:monday).
// Plans also come from the coach (save_week_plan). Reads v.wk and v.wkDays (weekData in builders.tsx).
import { Fragment, useState } from 'react'

const T1 = 'oklch(0.96 0.005 250)', T2 = 'oklch(0.74 0.015 255)', T3 = 'oklch(0.58 0.015 255)', A = 'oklch(0.82 0.13 210)', LINE = 'oklch(1 0 0 / 0.07)'
const FONT = "'IBM Plex Sans',system-ui,sans-serif"
const SPORTS: [string, string][] = [['strength', 'Lift'], ['run', 'Run'], ['swim', 'Swim'], ['ride', 'Ride'], ['walk', 'Walk'], ['mobility', 'Mobility'], ['rest', 'Rest'], ['other', 'Other']]
const btn = { cursor: 'pointer', fontFamily: FONT, fontSize: '12px', padding: '5px 10px', borderRadius: '8px', border: `1px solid ${LINE}`, background: 'transparent', color: T2 } as const
const field = { fontFamily: FONT, fontSize: '13px', color: T1, background: 'oklch(1 0 0 / 0.04)', border: `1px solid ${LINE}`, borderRadius: '8px', padding: '7px 9px', outline: 'none', minWidth: 0 } as const
const CSS = `
.wk-row { display: grid; grid-template-columns: 72px minmax(0,1fr) minmax(0,1fr) auto; gap: 16px; align-items: start; }
.wk-row.next { grid-template-columns: 72px minmax(0,1fr) auto; }
.wk-ed { display: grid; grid-template-columns: 110px minmax(0,1fr) minmax(0,1.6fr) auto; gap: 8px; align-items: center; }
@media (max-width: 760px) {
  .wk-row, .wk-row.next { grid-template-columns: 56px minmax(0,1fr) auto; }
  .wk-row .wk-act { grid-column: 2 / -1; }
  .wk-ed { grid-template-columns: 1fr auto; }
  .wk-ed > .wk-detail { grid-column: 1 / -1; }
}
`

type Session = { sport: string; title: string; detail: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DayEditor({ dy, save, done }: { dy: any; save: (day: string, s: Session[]) => Promise<void>; done: () => void }) {
  const [list, setList] = useState<Session[]>(() => dy.sessions.map((s: Session) => ({ ...s })))
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null)
  const set = (i: number, k: keyof Session, v: string) => setList(l => l.map((s, j) => (j === i ? { ...s, [k]: v } : s)))
  const submit = async () => {
    const clean = list.filter(s => s.title.trim())
    setBusy(true); setErr(null)
    try { await save(dy.day, clean); done() } catch (e) { setErr((e as Error).message); setBusy(false) }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: '1 / -1', paddingTop: '4px' }}>
      {list.map((s, i) => (
        <div key={i} className="wk-ed">
          <select value={s.sport} onChange={e => set(i, 'sport', e.target.value)} style={{ ...field, cursor: 'pointer' }} aria-label="Sport">
            {SPORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input value={s.title} onChange={e => set(i, 'title', e.target.value)} placeholder="Session (e.g. Zone 2 run)" style={field} aria-label="Title" />
          <input className="wk-detail" value={s.detail} onChange={e => set(i, 'detail', e.target.value)} placeholder="Details (pace, time, notes)" style={field} aria-label="Details" />
          <button onClick={() => setList(l => l.filter((_, j) => j !== i))} aria-label="Remove session" style={{ ...btn, padding: '5px 9px' }}>✕</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => setList(l => [...l, { sport: 'strength', title: '', detail: '' }])} style={btn}>+ Add session</button>
        <span style={{ flex: 1 }} />
        {err ? <span style={{ fontSize: '12px', color: 'oklch(0.7 0.18 25)' }}>{err}</span> : null}
        <button onClick={done} style={btn}>Cancel</button>
        <button disabled={busy} onClick={submit} style={{ ...btn, color: A, borderColor: 'oklch(0.82 0.13 210 / 0.5)', background: 'oklch(0.82 0.13 210 / 0.14)' }}>{busy ? 'Saving…' : 'Save day'}</button>
      </div>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function WeekPlan({ wk, days }: { wk: any; days: any[] }) {
  const [editing, setEditing] = useState<string | null>(null)
  if (!wk) return null
  const next = !days[0]?.showActual
  return (
    <section style={{ borderRadius: '18px', background: 'oklch(0.185 0.018 262 / 0.9)', border: `1px solid ${LINE}`, boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.04)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
      <style>{CSS}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ fontSize: '14px', fontWeight: 500, fontFamily: "'Space Grotesk',system-ui,sans-serif", letterSpacing: '-0.005em', color: T1 }}>{wk.title}</div>
          <span style={{ fontSize: '12px', color: wk.noteC }}>{wk.note}{wk.deload ? <span style={{ color: 'oklch(0.82 0.14 80)' }}> · {wk.deload}</span> : null}</span>
        </div>
        <div style={{ display: 'flex', gap: '2px', padding: '3px', borderRadius: '10px', background: 'oklch(1 0 0 / 0.04)', border: `1px solid ${LINE}` }}>
          {wk.tabs.map((o: { label: string; pick: () => void; bg: string; fg: string }) => (
            <button key={o.label} onClick={() => { setEditing(null); o.pick() }} style={{ border: 0, cursor: 'pointer', fontFamily: FONT, fontSize: '12px', padding: '5px 10px', borderRadius: '7px', background: o.bg, color: o.fg }}>{o.label}</button>
          ))}
        </div>
      </div>
      {wk.empty ? <span style={{ fontSize: '12.5px', color: T3 }}>{wk.empty}</span> : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {days.map(dy => (
          <div key={dy.day} className={'wk-row' + (next ? ' next' : '')} style={{ padding: '14px 16px', borderRadius: '14px', border: dy.b, background: dy.bg }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span style={{ fontSize: '14px', color: dy.dc }}>{dy.d}</span>
              <span style={{ fontSize: '11.5px', color: T3 }}>{dy.date}</span>
            </div>
            {editing === dy.day ? (
              <DayEditor dy={dy} save={wk.saveDay} done={() => setEditing(null)} />
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                  <span style={{ fontSize: '11px', color: T3 }}>Planned</span>
                  {dy.plan.map((pl: { t: string; detail: string; fg: string; td: string; tag: string; tc: string; to: number }, i: number) => (
                    <Fragment key={i}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '13.5px', color: pl.fg, textDecoration: pl.td }}>{pl.t}</span>
                          {pl.tag ? <span style={{ fontSize: '10.5px', padding: '2px 8px', borderRadius: '999px', border: `1px solid ${pl.tc}`, color: pl.tc, opacity: pl.to }}>{pl.tag}</span> : null}
                        </div>
                        {pl.detail ? <span style={{ fontSize: '12px', lineHeight: 1.45, color: T2, textWrap: 'pretty' }}>{pl.detail}</span> : null}
                      </div>
                    </Fragment>
                  ))}
                </div>
                {dy.showActual ? (
                  <div className="wk-act" style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                    <span style={{ fontSize: '11px', color: T3 }}>Actual</span>
                    <span style={{ fontSize: '13.5px', color: dy.ac }}>{dy.actual}</span>
                    <span style={{ fontSize: '12px', color: T3 }}>{dy.src}</span>
                  </div>
                ) : null}
                <button onClick={() => setEditing(dy.day)} style={{ ...btn, padding: '4px 9px', fontSize: '11.5px', alignSelf: 'start', gridColumn: 'auto' }} aria-label={`Edit ${dy.d}`}>Edit</button>
              </>
            )}
          </div>
        ))}
      </div>

      {wk.targets.length || wk.notes.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: '16px', borderTop: `1px solid ${LINE}`, paddingTop: '16px' }}>
          {[['Targets for the week', wk.targets], ['Notes', wk.notes]].filter(([, l]) => (l as string[]).length).map(([k, l]) => (
            <div key={k as string} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: T3 }}>{k as string}</span>
              {(l as string[]).map((x, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'baseline', fontSize: '13px', lineHeight: 1.5, color: T1 }}>
                  <span style={{ flex: 'none', width: '5px', height: '5px', borderRadius: '50%', background: A, transform: 'translateY(-2px)' }} />
                  <span style={{ textWrap: 'pretty' }}>{x}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}
