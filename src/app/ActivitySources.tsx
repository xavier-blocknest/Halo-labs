import { useEffect, useState } from 'react'

type Sport = 'run' | 'swim' | 'ride' | 'strength'
type Source = 'form' | 'strava' | 'whoop' | 'fitnessai'
type State = { prefs: Record<Sport, 'auto' | Source>; effective: Record<Sport, Source>; choices: Record<Sport, Source[]> }

const SPORTS: [Sport, string][] = [['run', 'Runs'], ['swim', 'Swims'], ['ride', 'Rides'], ['strength', 'Strength']]
const NAME: Record<Source, string> = { form: 'FORM', strava: 'Strava', whoop: 'WHOOP', fitnessai: 'FitnessAI' }

/** Settings card: which app defines each sport's workouts (GET/PUT /api/activity-sources, server/dashboard/sessions.ts).
 *  Auto picks the usual app when it has that sport, else WHOOP. The chosen app sets the workout (distance, pace,
 *  sets…); WHOOP still adds heart rate and strain when it isn't the chosen one, so each workout counts once. */
export function ActivitySources() {
  const [s, setS] = useState<State | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => { fetch('/api/activity-sources').then(r => (r.ok ? r.json() : null)).then(setS).catch(() => {}) }, [])
  if (!s) return null
  const pick = async (sport: Sport, v: 'auto' | Source) => {
    setBusy(true); setErr(null)
    try {
      const r = await fetch('/api/activity-sources', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [sport]: v }) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error ?? `Server error ${r.status}`)
      setS(d); window.dispatchEvent(new Event('halolabs:data'))
    } catch (e) { setErr((e as Error).message) }
    setBusy(false)
  }
  return (
    <section className="card">
      <header className="card-head"><h2>Activity sources</h2></header>
      <p className="hint" style={{ marginBottom: 12 }}>
        Which app each kind of workout comes from. <b>Auto</b> uses Strava for runs, FORM goggles (else Strava) for swims, WHOOP for rides and FitnessAI
        for strength when they have data, and WHOOP otherwise. The chosen app sets the workout; WHOOP still adds heart rate
        and strain, and each workout counts once.
      </p>
      <ul className="act-src">
        {SPORTS.map(([k, label]) => (
          <li key={k}>
            <div className="act-src-main">
              <span className="source-name">{label}</span>
              <span className="hint">{s.prefs[k] === 'auto' ? `Auto · using ${NAME[s.effective[k]]}` : `Using ${NAME[s.effective[k]]}`}</span>
            </div>
            <div className="act-src-seg" role="radiogroup" aria-label={`${label} source`}>
              {(['auto', ...s.choices[k]] as ('auto' | Source)[]).map(v => (
                <button key={v} type="button" role="radio" aria-checked={s.prefs[k] === v} disabled={busy}
                  className={s.prefs[k] === v ? 'on' : ''} onClick={() => s.prefs[k] !== v && void pick(k, v)}>{v === 'auto' ? 'Auto' : NAME[v]}</button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      {err && <p className="banner alert" style={{ marginTop: 10 }}>{err}</p>}
    </section>
  )
}
